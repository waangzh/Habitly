import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { AuthUser } from '../../common/types/request-context.type';
import { MoreService } from './more.service';

@Controller('more')
@UseGuards(JwtAuthGuard)
export class MoreController {
  constructor(private readonly moreService: MoreService) {}

  @Get('overview')
  async getOverview(@CurrentUser() user: AuthUser) {
    return this.moreService.getOverview(user.userId);
  }
}
