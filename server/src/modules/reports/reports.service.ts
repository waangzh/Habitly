import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import dayjs from 'dayjs';
import { Repository } from 'typeorm';
import { calculateCompletionRate } from '../../common/utils/habit.utils';
import { HabitCheckinEntity } from '../../database/entities/habit-checkin.entity';
import { ProjectsService } from '../projects/projects.service';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(HabitCheckinEntity)
    private readonly checkinsRepository: Repository<HabitCheckinEntity>,
    private readonly projectsService: ProjectsService,
  ) {}

  async getReportCard(userId: number, periodType: 'week' | 'month' = 'week', projectId?: number) {
    const projects = projectId
      ? [await this.projectsService.getById(userId, projectId)]
      : await this.projectsService.list(userId, 'active');

    const allCheckins = await this.checkinsRepository.find({
      where: { userId: String(userId), status: 'done' },
      order: { checkinDate: 'DESC' },
    });

    const start = periodType === 'week' ? dayjs().startOf('week') : dayjs().startOf('month');
    const scopedRecords = allCheckins.filter((item) => dayjs(item.checkinDate).isAfter(start.subtract(1, 'day')));

    const projectSummaries = await Promise.all(
      projects.map(async (project) => {
        const stats = await this.projectsService.getProjectStats(userId, project.projectId);
        const projectRecords = scopedRecords.filter((item) => Number(item.projectId) === project.projectId);
        const metricRecords = projectRecords.filter((item) => Number(item.metricValue || 0) > 0);

        return {
          projectId: project.projectId,
          title: project.title,
          icon: project.icon,
          totalCheckins: projectRecords.length,
          currentStreak: stats.currentStreak,
          metricTotal: metricRecords.reduce((sum, item) => sum + Number(item.metricValue || 0), 0),
          metricUnit: metricRecords[0]?.metricUnit || project.metricUnit,
        };
      }),
    );

    const totalCount = scopedRecords.filter((item) => !projectId || Number(item.projectId) === projectId).length;
    return {
      periodType,
      totalProjects: projects.length,
      totalCheckins: totalCount,
      completionRate: calculateCompletionRate(totalCount, projects.length),
      streakSummary: projectSummaries.reduce((sum, item) => sum + item.currentStreak, 0),
      projectSummaries,
    };
  }
}
