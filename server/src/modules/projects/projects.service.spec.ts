import { NotFoundException } from '@nestjs/common';
import { IsNull } from 'typeorm';
import { ProjectsService } from './projects.service';

describe('ProjectsService remove', () => {
  function createService(project?: Record<string, unknown> | null) {
    const projectsRepository = {
      findOne: jest.fn().mockResolvedValue(project),
      save: jest.fn().mockImplementation(async (payload) => payload),
    };

    const checkinsRepository = {
      find: jest.fn().mockResolvedValue([]),
    };

    const service = new ProjectsService(
      projectsRepository as never,
      checkinsRepository as never,
    );

    return {
      service,
      projectsRepository,
    };
  }

  it('应将项目标记为软删除并返回删除结果', async () => {
    const project = {
      id: '12',
      userId: '1',
      title: '早睡',
      status: 'active',
      deletedAt: null,
    };
    const { service, projectsRepository } = createService(project);

    const result = await service.remove(1, 12);

    expect(projectsRepository.findOne).toHaveBeenCalledWith({
      where: {
        id: '12',
        userId: '1',
        deletedAt: IsNull(),
      },
    });
    expect(project.deletedAt).toBeInstanceOf(Date);
    expect(projectsRepository.save).toHaveBeenCalledWith(project);
    expect(result).toEqual({
      projectId: 12,
      deleted: true,
    });
  });

  it('删除不存在项目时应返回 404', async () => {
    const { service } = createService(null);

    await expect(service.remove(1, 99)).rejects.toBeInstanceOf(NotFoundException);
  });
});
