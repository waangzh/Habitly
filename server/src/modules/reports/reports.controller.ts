import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { AuthUser } from '../../common/types/request-context.type';
import { ReportCardQueryDto } from './dto/report-card-query.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('card')
  async getReportCard(@CurrentUser() user: AuthUser, @Query() query: ReportCardQueryDto) {
    return this.reportsService.getReportCard(user.userId, query.periodType || 'week', query.projectId);
  }
}
