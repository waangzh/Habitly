import {
  Body,
  Controller,
  Delete,
  Param,
  ParseIntPipe,
  Patch,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { AuthUser } from '../../common/types/request-context.type';
import { CheckinsService } from './checkins.service';
import { DailyCheckinDto } from './dto/daily-checkin.dto';
import { DeleteDailyCheckinDto } from './dto/delete-daily-checkin.dto';
import { UpdateCheckinExtrasDto } from './dto/update-checkin-extras.dto';

@Controller('checkins')
@UseGuards(JwtAuthGuard)
export class CheckinsController {
  constructor(private readonly checkinsService: CheckinsService) {}

  @Put('daily')
  async upsertDaily(@CurrentUser() user: AuthUser, @Body() payload: DailyCheckinDto) {
    return this.checkinsService.upsertDaily(user.userId, payload);
  }

  @Delete('daily')
  async deleteDaily(@CurrentUser() user: AuthUser, @Query() query: DeleteDailyCheckinDto) {
    return this.checkinsService.deleteDaily(user.userId, query.projectId, query.date);
  }

  @Patch(':recordId/extras')
  async updateExtras(
    @CurrentUser() user: AuthUser,
    @Param('recordId', ParseIntPipe) recordId: number,
    @Body() payload: UpdateCheckinExtrasDto,
  ) {
    return this.checkinsService.updateExtras(user.userId, recordId, payload);
  }
}
