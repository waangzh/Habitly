import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserProfileEntity } from '../../database/entities/user-profile.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    @InjectRepository(UserProfileEntity)
    private readonly profilesRepository: Repository<UserProfileEntity>,
  ) {}

  async findById(userId: number): Promise<UserEntity | null> {
    return this.usersRepository.findOne({
      where: { id: String(userId) },
      relations: { profile: true },
    });
  }

  async findByIdOrFail(userId: number): Promise<UserEntity> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    return user;
  }

  async findByOpenId(openid: string): Promise<UserEntity | null> {
    return this.usersRepository.findOne({
      where: { openid },
      relations: { profile: true },
    });
  }

  async createUserWithProfile(payload: {
    openid: string;
    unionid?: string | null;
    nickname?: string;
  }): Promise<UserEntity> {
    const user = await this.usersRepository.save(
      this.usersRepository.create({
        openid: payload.openid,
        unionid: payload.unionid || null,
        status: 1,
        lastLoginAt: new Date(),
      }),
    );

    await this.profilesRepository.save(
      this.profilesRepository.create({
        userId: user.id,
        nickname: payload.nickname || 'Habitly 用户',
        avatarUrl: '',
        bio: '把每一次小坚持，都变成看得见的成长。',
        coverTheme: 'sky',
        timezone: 'Asia/Shanghai',
        locale: 'zh-CN',
        vipStatus: 'free',
      }),
    );

    return this.findByIdOrFail(Number(user.id));
  }

  async updateLastLogin(userId: number): Promise<void> {
    await this.usersRepository.update({ id: String(userId) }, { lastLoginAt: new Date() });
  }

  async getProfile(userId: number) {
    const user = await this.findByIdOrFail(userId);
    return this.buildProfileResponse(user);
  }

  async updateProfile(userId: number, payload: UpdateProfileDto) {
    const user = await this.findByIdOrFail(userId);
    await this.profilesRepository.update(
      { userId: user.id },
      {
        ...(payload.nickname !== undefined ? { nickname: payload.nickname.trim() } : {}),
        ...(payload.avatarUrl !== undefined ? { avatarUrl: payload.avatarUrl.trim() } : {}),
        ...(payload.bio !== undefined ? { bio: payload.bio.trim() } : {}),
        ...(payload.coverTheme !== undefined ? { coverTheme: payload.coverTheme.trim() } : {}),
      },
    );

    return this.getProfile(userId);
  }

  buildProfileResponse(user: UserEntity) {
    return {
      userId: Number(user.id),
      nickname: user.profile?.nickname || 'Habitly 用户',
      avatarUrl: user.profile?.avatarUrl || '',
      bio: user.profile?.bio || '',
      coverTheme: user.profile?.coverTheme || 'sky',
      timezone: user.profile?.timezone || 'Asia/Shanghai',
      locale: user.profile?.locale || 'zh-CN',
      vipStatus: user.profile?.vipStatus || 'free',
    };
  }
}
