import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import dayjs from 'dayjs';
import { Repository } from 'typeorm';
import { RedisService } from '../../common/services/redis.service';
import { parseDurationToSeconds, sha256 } from '../../common/utils/habit.utils';
import type { AuthUser, JwtPayload, RequestWithContext } from '../../common/types/request-context.type';
import { RefreshTokenEntity } from '../../database/entities/refresh-token.entity';
import { UsersService } from '../users/users.service';

type TokenBundle = {
  accessToken: string;
  refreshToken: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly usersService: UsersService,
    @InjectRepository(RefreshTokenEntity)
    private readonly refreshTokensRepository: Repository<RefreshTokenEntity>,
  ) {}

  async wechatLogin(code: string, request?: RequestWithContext) {
    const session = await this.resolveWechatSession(code);
    let user = await this.usersService.findByOpenId(session.openid);

    if (!user) {
      user = await this.usersService.createUserWithProfile({
        openid: session.openid,
        unionid: session.unionid,
      });
    } else {
      await this.usersService.updateLastLogin(Number(user.id));
      user = await this.usersService.findByIdOrFail(Number(user.id));
    }

    const tokens = await this.createTokenBundle(Number(user.id), user.openid);

    return {
      ...tokens,
      user: this.usersService.buildProfileResponse(user),
      requestId: request?.requestId || '',
    };
  }

  async devLogin() {
    const nodeEnv = this.configService.getOrThrow<string>('app.nodeEnv');
    if (nodeEnv !== 'development') {
      throw new ForbiddenException('开发登录仅在 development 环境开启');
    }

    const openid = 'dev-openid-habitly';
    let user = await this.usersService.findByOpenId(openid);

    if (!user) {
      user = await this.usersService.createUserWithProfile({
        openid,
        nickname: '开发测试用户',
      });
    }

    const tokens = await this.createTokenBundle(Number(user.id), user.openid);
    return {
      ...tokens,
      user: this.usersService.buildProfileResponse(user),
    };
  }

  async refresh(refreshToken: string) {
    let payload: JwtPayload;

    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.configService.getOrThrow<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('refresh token 无效');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('refresh token 无效');
    }

    const tokenHash = sha256(refreshToken);
    const tokenRecord = await this.refreshTokensRepository.findOne({
      where: { tokenHash },
    });

    if (!tokenRecord || tokenRecord.revokedAt || dayjs(tokenRecord.expiredAt).isBefore(dayjs())) {
      throw new UnauthorizedException('refresh token 已失效');
    }

    await this.revokeRefreshToken(refreshToken);
    const user = await this.usersService.findByIdOrFail(Number(payload.sub));
    const tokens = await this.createTokenBundle(Number(user.id), user.openid);

    return {
      ...tokens,
      user: this.usersService.buildProfileResponse(user),
    };
  }

  async logout(user: AuthUser, refreshToken?: string) {
    await this.redisService.del(this.getAccessTokenKey(user.userId, user.tokenId));

    if (refreshToken) {
      await this.revokeRefreshToken(refreshToken);
    }

    return { success: true };
  }

  private async resolveWechatSession(code: string): Promise<{ openid: string; unionid?: string }> {
    const nodeEnv = this.configService.getOrThrow<string>('app.nodeEnv');
    const appId = this.configService.get<string>('wechat.appId') || '';
    const appSecret = this.configService.get<string>('wechat.appSecret') || '';

    if (!appId || !appSecret) {
      if (nodeEnv === 'development') {
        const hash = sha256(code).slice(0, 24);
        return { openid: `dev_${hash}` };
      }
      throw new BadRequestException('微信登录配置不完整');
    }

    const query = new URLSearchParams({
      appid: appId,
      secret: appSecret,
      js_code: code,
      grant_type: 'authorization_code',
    });
    const baseUrl = this.configService.getOrThrow<string>('wechat.apiBaseUrl');
    const response = await fetch(`${baseUrl}/sns/jscode2session?${query.toString()}`);
    const data = (await response.json()) as {
      openid?: string;
      unionid?: string;
      errmsg?: string;
    };

    if (!response.ok || !data.openid) {
      throw new UnauthorizedException(data.errmsg || '微信登录失败');
    }

    return {
      openid: data.openid,
      unionid: data.unionid,
    };
  }

  private async createTokenBundle(userId: number, openid: string): Promise<TokenBundle> {
    const accessTokenId = randomUUID();
    const refreshTokenId = randomUUID();

    const accessPayload: JwtPayload = {
      sub: userId,
      openid,
      tokenId: accessTokenId,
      type: 'access',
    };

    const refreshPayload: JwtPayload = {
      sub: userId,
      openid,
      tokenId: refreshTokenId,
      type: 'refresh',
    };

    const accessToken = await this.jwtService.signAsync(accessPayload, {
      secret: this.configService.getOrThrow<string>('jwt.accessSecret'),
      expiresIn: this.configService.getOrThrow<string>('jwt.accessExpires') as never,
    });
    const refreshToken = await this.jwtService.signAsync(refreshPayload, {
      secret: this.configService.getOrThrow<string>('jwt.refreshSecret'),
      expiresIn: this.configService.getOrThrow<string>('jwt.refreshExpires') as never,
    });

    const accessTtl = parseDurationToSeconds(this.configService.getOrThrow<string>('jwt.accessExpires'));
    const refreshTtl = parseDurationToSeconds(
      this.configService.getOrThrow<string>('jwt.refreshExpires'),
    );

    await Promise.all([
      this.redisService.setJsonWithTtl(
        this.getAccessTokenKey(userId, accessTokenId),
        accessTtl,
        { userId, openid },
      ),
      this.redisService.setJsonWithTtl(
        this.getRefreshTokenKey(userId, refreshTokenId),
        refreshTtl,
        { userId, openid },
      ),
    ]);

    await this.refreshTokensRepository.save(
      this.refreshTokensRepository.create({
        userId: String(userId),
        tokenHash: sha256(refreshToken),
        expiredAt: dayjs().add(refreshTtl, 'second').toDate(),
      }),
    );

    return {
      accessToken,
      refreshToken,
    };
  }

  private async revokeRefreshToken(refreshToken: string): Promise<void> {
    const tokenHash = sha256(refreshToken);
    await this.refreshTokensRepository.update({ tokenHash }, { revokedAt: new Date() });
  }

    private getAccessTokenKey(userId: number, tokenId: string): string {
    return `habit:access:${userId}:${tokenId}`;
  }

  private getRefreshTokenKey(userId: number, tokenId: string): string {
    return `habit:refresh:${userId}:${tokenId}`;
  }
}
