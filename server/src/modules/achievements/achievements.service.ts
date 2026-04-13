import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { formatDate } from '../../common/utils/habit.utils';
import { HabitCheckinEntity } from '../../database/entities/habit-checkin.entity';
import { ProjectsService } from '../projects/projects.service';

@Injectable()
export class AchievementsService {
  constructor(
    @InjectRepository(HabitCheckinEntity)
    private readonly checkinsRepository: Repository<HabitCheckinEntity>,
    private readonly projectsService: ProjectsService,
  ) {}

  async getSummary(userId: number) {
    const [projects, checkins] = await Promise.all([
      this.projectsService.list(userId, 'active'),
      this.checkinsRepository.find({
        where: { userId: String(userId), status: 'done' },
      }),
    ]);

    const streaks = await Promise.all(
      projects.map((project) => this.projectsService.getProjectStats(userId, project.projectId)),
    );
    const longestStreak = streaks.length ? Math.max(...streaks.map((item) => item.longestStreak)) : 0;
    const currentMonthKey = formatDate(new Date()).slice(0, 7);
    const monthCheckins = checkins.filter((item) => item.checkinDate.startsWith(currentMonthKey)).length;

    const badges = [
      {
        badgeId: 'first-checkin',
        name: '第一束光',
        description: '完成第一次打卡',
        unlocked: checkins.length >= 1,
        icon: '🌅',
      },
      {
        badgeId: 'three-streak',
        name: '稳稳连胜',
        description: '连续完成 3 天',
        unlocked: longestStreak >= 3,
        icon: '🔥',
      },
      {
        badgeId: 'ten-checkins',
        name: '节奏建立中',
        description: '累计完成 10 次',
        unlocked: checkins.length >= 10,
        icon: '🎯',
      },
      {
        badgeId: 'three-projects',
        name: '多线成长',
        description: '拥有 3 个进行中的项目',
        unlocked: projects.length >= 3,
        icon: '🌱',
      },
    ];

    return {
      totalCheckins: checkins.length,
      activeProjects: projects.length,
      longestStreak,
      monthCheckins,
      nextBadge: badges.find((item) => !item.unlocked) || null,
      unlockedCount: badges.filter((item) => item.unlocked).length,
      recentBadges: badges.filter((item) => item.unlocked).slice(0, 2),
      badges,
    };
  }
}
