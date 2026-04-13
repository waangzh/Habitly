import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { formatMonthLabel, getWeekday, mapCheckinToResponse } from '../../common/utils/habit.utils';
import { HabitCheckinEntity } from '../../database/entities/habit-checkin.entity';
import { HabitProjectEntity } from '../../database/entities/habit-project.entity';

@Injectable()
export class HistoryService {
  constructor(
    @InjectRepository(HabitCheckinEntity)
    private readonly checkinsRepository: Repository<HabitCheckinEntity>,
    @InjectRepository(HabitProjectEntity)
    private readonly projectsRepository: Repository<HabitProjectEntity>,
  ) {}

  async getGrouped(userId: number, month?: string) {
    const [projects, checkins] = await Promise.all([
      this.projectsRepository.find({ where: { userId: String(userId) } }),
      this.checkinsRepository.find({
        where: { userId: String(userId), status: 'done' },
        order: { checkinDate: 'DESC', checkedAt: 'DESC' },
      }),
    ]);

    const projectMap = new Map(projects.map((project) => [project.id, project]));
    const grouped: Record<string, Array<Record<string, unknown>>> = {};

    checkins
      .filter((item) => !month || item.checkinDate.startsWith(month))
      .forEach((item) => {
        const label = formatMonthLabel(item.checkinDate);
        if (!grouped[label]) {
          grouped[label] = [];
        }

        const project = projectMap.get(item.projectId);
        grouped[label].push({
          ...mapCheckinToResponse(item),
          title: project?.title || '已删除项目',
          icon: project?.icon || '🗂',
          weekday: getWeekday(item.checkinDate),
        });
      });

    return Object.keys(grouped).map((key) => ({
      month: key,
      items: grouped[key],
    }));
  }
}
