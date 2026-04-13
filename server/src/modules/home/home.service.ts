import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { formatDate, getWeekRange, mapCheckinToResponse, shouldShowOnDate } from '../../common/utils/habit.utils';
import { HabitCheckinEntity } from '../../database/entities/habit-checkin.entity';
import { ProjectsService } from '../projects/projects.service';

@Injectable()
export class HomeService {
  constructor(
    @InjectRepository(HabitCheckinEntity)
    private readonly checkinsRepository: Repository<HabitCheckinEntity>,
    private readonly projectsService: ProjectsService,
  ) {}

  async getHomeData(userId: number, date?: string) {
    const selectedDate = date || formatDate(new Date());
    const allProjects = await this.projectsService.list(userId, 'active');
    const projects = allProjects.filter((project) => shouldShowOnDate(project, selectedDate));
    const checkins = await this.checkinsRepository.find({
      where: {
        userId: String(userId),
        checkinDate: selectedDate,
      },
    });

    const projectMap = new Map(checkins.map((checkin) => [Number(checkin.projectId), checkin]));
    const mappedProjects = projects.map((project) => {
      const record = projectMap.get(project.projectId);
      return {
        ...project,
        checked: !!record,
        record: record ? mapCheckinToResponse(record) : null,
      };
    });

    const completedCount = mappedProjects.filter((item) => item.checked).length;

    return {
      selectedDate,
      weekDays: getWeekRange(selectedDate),
      projects: mappedProjects,
      completedCount,
      pendingCount: mappedProjects.length - completedCount,
    };
  }
}
