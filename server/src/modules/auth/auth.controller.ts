import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { AuthUser, RequestWithContext } from '../../common/types/request-context.type';
import { AuthService } from './auth.service';
import { LogoutDto } from './dto/logout.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { WechatLoginDto } from './dto/wechat-login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('wechat/login')
  async wechatLogin(@Body() payload: WechatLoginDto, @Req() request: RequestWithContext) {
    return this.authService.wechatLogin(payload.code, request);
  }

  @Public()
  @Post('refresh')
  async refresh(@Body() payload: RefreshTokenDto) {
    return this.authService.refresh(payload.refreshToken);
  }

  @Public()
  @Post('dev-login')
  async devLogin() {
    return this.authService.devLogin();
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@CurrentUser() user: AuthUser, @Body() payload: LogoutDto) {
    return this.authService.logout(user, payload.refreshToken);
  }
}
