import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { AuthUser } from '../../common/types/request-context.type';
import { HistoryGroupedQueryDto } from './dto/history-grouped-query.dto';
import { HistoryService } from './history.service';

@Controller('history')
@UseGuards(JwtAuthGuard)
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  @Get('grouped')
  async getGrouped(@CurrentUser() user: AuthUser, @Query() query: HistoryGroupedQueryDto) {
    return this.historyService.getGrouped(user.userId, query.month);
  }
}
