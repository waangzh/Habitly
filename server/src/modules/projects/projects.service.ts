import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import {
  ALL_SCHEDULE_DAYS,
  calculateStreakStats,
  formatScheduleText,
  getCurrentMonthKey,
  getWeekday,
  mapCheckinToResponse,
  normalizeReminderTimes,
  normalizeScheduleDays,
  normalizeScheduleType,
} from '../../common/utils/habit.utils';
import { HabitCheckinEntity } from '../../database/entities/habit-checkin.entity';
import { HabitProjectEntity } from '../../database/entities/habit-project.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

const DEFAULT_ICONS = ['🏃', '💻', '📚', '✨', '🧘', '🎯', '🌙', '💧'];

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(HabitProjectEntity)
    private readonly projectsRepository: Repository<HabitProjectEntity>,
    @InjectRepository(HabitCheckinEntity)
    private readonly checkinsRepository: Repository<HabitCheckinEntity>,
  ) {}

  async list(userId: number, status?: 'active' | 'paused' | 'archived') {
    const projects = await this.projectsRepository.find({
      where: {
        userId: String(userId),
        deletedAt: IsNull(),
        ...(status ? { status } : {}),
      },
      order: {
        updatedAt: 'DESC',
        createdAt: 'DESC',
      },
    });

    return Promise.all(projects.map((project) => this.toProjectResponse(userId, project)));
  }

  async getById(userId: number, projectId: number) {
    const project = await this.getEntityOrFail(userId, projectId);
    return this.toProjectResponse(userId, project);
  }

  async create(userId: number, payload: CreateProjectDto) {
    const scheduleType = normalizeScheduleType(payload.scheduleType);
    const scheduleDays =
      scheduleType === 'daily' ? ALL_SCHEDULE_DAYS : normalizeScheduleDays(payload.scheduleDays);

    const project = await this.projectsRepository.save(
      this.projectsRepository.create({
        userId: String(userId),
        title: payload.title.trim(),
        icon: (payload.icon || DEFAULT_ICONS[0]).trim(),
        slogan: (payload.slogan || '').trim(),
        colorTheme: (payload.colorTheme || 'blue').trim(),
        status: 'active',
        scheduleType,
        scheduleDays,
        targetType: 'forever',
        targetValue: 0,
        startDate: payload.startDate,
        endDate: null,
        reminderEnabled: payload.reminderEnabled ?? true,
        reminderTimes: normalizeReminderTimes(payload.reminderTimes),
        moodEnabled: payload.moodEnabled ?? false,
        scoreEnabled: payload.scoreEnabled ?? false,
        metricEnabled: payload.metricEnabled ?? false,
        metricUnit: (payload.metricUnit || '').trim(),
      }),
    );

    return this.toProjectResponse(userId, project);
  }

  async update(userId: number, projectId: number, payload: UpdateProjectDto) {
    const project = await this.getEntityOrFail(userId, projectId);
    const scheduleType = normalizeScheduleType(payload.scheduleType || project.scheduleType);
    const scheduleDays =
      scheduleType === 'daily'
        ? ALL_SCHEDULE_DAYS
        : normalizeScheduleDays(payload.scheduleDays || project.scheduleDays);

    Object.assign(project, {
      ...(payload.title !== undefined ? { title: payload.title.trim() } : {}),
      ...(payload.icon !== undefined ? { icon: payload.icon.trim() } : {}),
      ...(payload.slogan !== undefined ? { slogan: payload.slogan.trim() } : {}),
      ...(payload.colorTheme !== undefined ? { colorTheme: payload.colorTheme.trim() } : {}),
      ...(payload.startDate !== undefined ? { startDate: payload.startDate } : {}),
      scheduleType,
      scheduleDays,
      ...(payload.reminderEnabled !== undefined ? { reminderEnabled: payload.reminderEnabled } : {}),
      ...(payload.reminderTimes !== undefined
        ? { reminderTimes: normalizeReminderTimes(payload.reminderTimes) }
        : {}),
      ...(payload.moodEnabled !== undefined ? { moodEnabled: payload.moodEnabled } : {}),
      ...(payload.scoreEnabled !== undefined ? { scoreEnabled: payload.scoreEnabled } : {}),
      ...(payload.metricEnabled !== undefined ? { metricEnabled: payload.metricEnabled } : {}),
      ...(payload.metricUnit !== undefined ? { metricUnit: payload.metricUnit.trim() } : {}),
    });

    await this.projectsRepository.save(project);
    return this.toProjectResponse(userId, project);
  }

  async updateStatus(userId: number, projectId: number, status: 'active' | 'paused' | 'archived') {
    const project = await this.getEntityOrFail(userId, projectId);
    project.status = status;
    project.pausedAt = status === 'paused' ? new Date() : null;
    project.archivedAt = status === 'archived' ? new Date() : null;
    await this.projectsRepository.save(project);
    return this.toProjectResponse(userId, project);
  }

  async remove(userId: number, projectId: number) {
    const project = await this.getEntityOrFail(userId, projectId);
    project.deletedAt = new Date();
    await this.projectsRepository.save(project);

    return {
      projectId: Number(project.id),
      deleted: true,
    };
  }

  async getDetail(userId: number, projectId: number) {
    const project = await this.getEntityOrFail(userId, projectId);
    const [stats, records] = await Promise.all([
      this.getProjectStats(userId, Number(project.id)),
      this.getProjectRecords(userId, Number(project.id)),
    ]);
    const monthMap: Record<string, number> = {};

    records.forEach((record) => {
      const monthKey = record.date.slice(0, 7);
      monthMap[monthKey] = (monthMap[monthKey] || 0) + 1;
    });

    return {
      project: await this.toProjectResponse(userId, project, stats),
      stats,
      records: records.slice(0, 20),
      rewards: [
        {
          rewardId: `reward_${project.id}_3`,
          title: '连续 3 天的小奖励',
          conditionText: '连续完成 3 天后，奖励自己一次喜欢的放松时间',
          reached: stats.currentStreak >= 3,
        },
        {
          rewardId: `reward_${project.id}_10`,
          title: '累计 10 次里程碑',
          conditionText: '累计完成 10 次后，安排一次正式庆祝',
          reached: stats.totalCheckins >= 10,
        },
      ],
      monthSummary: Object.keys(monthMap).map((month) => ({
        month,
        count: monthMap[month],
      })),
    };
  }

  async getProjectRecords(userId: number, projectId: number) {
    const records = await this.checkinsRepository.find({
      where: {
        userId: String(userId),
        projectId: String(projectId),
        status: 'done',
      },
      order: {
        checkinDate: 'DESC',
        checkedAt: 'DESC',
      },
    });

    return records.map((record) => ({
      ...mapCheckinToResponse(record),
      weekday: getWeekday(record.checkinDate),
    }));
  }

  async getProjectStats(userId: number, projectId: number) {
    const checkins = await this.checkinsRepository.find({
      where: {
        userId: String(userId),
        projectId: String(projectId),
        status: 'done',
      },
      order: { checkinDate: 'ASC' },
    });
    const dates = checkins.map((item) => item.checkinDate);
    const streak = calculateStreakStats(dates);
    const monthCheckins = dates.filter((date) => date.startsWith(getCurrentMonthKey())).length;

    return {
      projectId,
      totalCheckins: dates.length,
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      monthCheckins,
      completionRate: dates.length ? 100 : 0,
      lastCheckinDate: streak.lastCheckinDate,
    };
  }

  async getEntityOrFail(userId: number, projectId: number): Promise<HabitProjectEntity> {
    const project = await this.projectsRepository.findOne({
      where: {
        id: String(projectId),
        userId: String(userId),
        deletedAt: IsNull(),
      },
    });

    if (!project) {
      throw new NotFoundException('项目不存在');
    }

    return project;
  }

  private async toProjectResponse(
    userId: number,
    project: HabitProjectEntity,
    precomputedStats?: { currentStreak: number; longestStreak: number; totalCheckins: number; monthCheckins: number; completionRate: number; lastCheckinDate: string },
  ) {
    const stats = precomputedStats ?? (await this.getProjectStats(userId, Number(project.id)));
    return {
      projectId: Number(project.id),
      title: project.title,
      icon: project.icon,
      slogan: project.slogan,
      colorTheme: project.colorTheme,
      status: project.status,
      scheduleType: project.scheduleType,
      scheduleDays: project.scheduleDays,
      scheduleText: formatScheduleText(project.scheduleType, project.scheduleDays),
      targetType: project.targetType,
      targetValue: project.targetValue,
      startDate: project.startDate,
      endDate: project.endDate,
      reminderEnabled: !!project.reminderEnabled,
      reminderTimes: project.reminderTimes,
      moodEnabled: !!project.moodEnabled,
      scoreEnabled: !!project.scoreEnabled,
      metricEnabled: !!project.metricEnabled,
      metricUnit: project.metricUnit,
      stats,
    };
  }
}
