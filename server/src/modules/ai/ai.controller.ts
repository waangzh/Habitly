import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { AuthUser, RequestWithContext } from '../../common/types/request-context.type';
import { AiService } from './ai.service';
import { CheckinCoachDto } from './dto/checkin-coach.dto';
import { CheckinReflectionDto } from './dto/checkin-reflection.dto';
import { HomeNudgeDto } from './dto/home-nudge.dto';
import { ProjectDraftDto } from './dto/project-draft.dto';
import { ReportInsightDto } from './dto/report-insight.dto';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('home-nudge')
  async getHomeNudge(
    @CurrentUser() user: AuthUser,
    @Body() payload: HomeNudgeDto,
    @Req() request: RequestWithContext,
  ) {
    return this.aiService.getHomeNudge(user.userId, payload, request);
  }

  @Post('report-insight')
  async getReportInsight(
    @CurrentUser() user: AuthUser,
    @Body() payload: ReportInsightDto,
    @Req() request: RequestWithContext,
  ) {
    return this.aiService.getReportInsight(user.userId, payload, request);
  }

  @Post('project-draft')
  async getProjectDraft(
    @CurrentUser() user: AuthUser,
    @Body() payload: ProjectDraftDto,
    @Req() request: RequestWithContext,
  ) {
    return this.aiService.getProjectDraft(user.userId, payload, request);
  }

  @Post('checkin-coach')
  async getCheckinCoach(
    @CurrentUser() user: AuthUser,
    @Body() payload: CheckinCoachDto,
    @Req() request: RequestWithContext,
  ) {
    return this.aiService.getCheckinCoach(user.userId, payload, request);
  }

  @Post('checkin-reflection')
  async getCheckinReflection(
    @CurrentUser() user: AuthUser,
    @Body() payload: CheckinReflectionDto,
    @Req() request: RequestWithContext,
  ) {
    return this.aiService.getCheckinReflection(user.userId, payload, request);
  }
}
