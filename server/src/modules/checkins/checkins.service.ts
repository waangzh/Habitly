import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RedisService } from '../../common/services/redis.service';
import { mapCheckinToResponse } from '../../common/utils/habit.utils';
import { HabitCheckinEntity } from '../../database/entities/habit-checkin.entity';
import { DailyCheckinDto } from './dto/daily-checkin.dto';
import { UpdateCheckinExtrasDto } from './dto/update-checkin-extras.dto';
import { ProjectsService } from '../projects/projects.service';

@Injectable()
export class CheckinsService {
  constructor(
    @InjectRepository(HabitCheckinEntity)
    private readonly checkinsRepository: Repository<HabitCheckinEntity>,
    private readonly projectsService: ProjectsService,
    private readonly redisService: RedisService,
  ) {}

  async upsertDaily(userId: number, payload: DailyCheckinDto) {
    const project = await this.projectsService.getEntityOrFail(userId, payload.projectId);
    const lockKey = `habit:idempotent:checkin:${userId}:${payload.projectId}:${payload.date}`;
    await this.redisService.setNxWithTtl(lockKey, 10, '1');

    let record = await this.checkinsRepository.findOne({
      where: {
        userId: String(userId),
        projectId: String(payload.projectId),
        checkinDate: payload.date,
      },
    });

    if (!record) {
      record = this.checkinsRepository.create({
        userId: String(userId),
        projectId: project.id,
        checkinDate: payload.date,
        status: 'done',
        checkedAt: new Date(),
        moodValue: '',
        scoreValue: 0,
        metricValue: 0,
        metricUnit: project.metricEnabled ? project.metricUnit : '',
        note: '',
      });
    } else {
      record.status = 'done';
      record.checkedAt = new Date();
    }

    const saved = await this.checkinsRepository.save(record);
    return mapCheckinToResponse(saved);
  }

  async deleteDaily(userId: number, projectId: number, date: string) {
    const record = await this.checkinsRepository.findOne({
      where: {
        userId: String(userId),
        projectId: String(projectId),
        checkinDate: date,
      },
    });

    if (!record) {
      return { deleted: false };
    }

    await this.checkinsRepository.delete({ id: record.id });
    return { deleted: true };
  }

  async updateExtras(userId: number, recordId: number, payload: UpdateCheckinExtrasDto) {
    const record = await this.checkinsRepository.findOne({
      where: { id: String(recordId), userId: String(userId) },
    });

    if (!record) {
      throw new NotFoundException('打卡记录不存在');
    }

    record.moodValue = payload.moodValue ?? record.moodValue;
    record.scoreValue = payload.scoreValue ?? record.scoreValue;
    record.metricValue = payload.metricValue ?? record.metricValue;
    record.metricUnit = payload.metricUnit ?? record.metricUnit;

    const saved = await this.checkinsRepository.save(record);
    return mapCheckinToResponse(saved);
  }
}
