import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { AuthUser } from '../../common/types/request-context.type';
import { HomeQueryDto } from './dto/home-query.dto';
import { HomeService } from './home.service';

@Controller('home')
@UseGuards(JwtAuthGuard)
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  @Get()
  async getHomeData(@CurrentUser() user: AuthUser, @Query() query: HomeQueryDto) {
    return this.homeService.getHomeData(user.userId, query.date);
  }
}
