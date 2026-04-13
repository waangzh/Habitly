import 'reflect-metadata';
import dayjs from 'dayjs';
import { loadLocalEnv } from '../../config/load-env';
import { UserEntity } from '../entities/user.entity';
import { UserProfileEntity } from '../entities/user-profile.entity';
import { HabitProjectEntity } from '../entities/habit-project.entity';
import { HabitCheckinEntity } from '../entities/habit-checkin.entity';
import { AppDataSource } from '../data-source';

async function bootstrap(): Promise<void> {
  loadLocalEnv();
  await AppDataSource.initialize();

  const usersRepository = AppDataSource.getRepository(UserEntity);
  const profilesRepository = AppDataSource.getRepository(UserProfileEntity);
  const projectsRepository = AppDataSource.getRepository(HabitProjectEntity);
  const checkinsRepository = AppDataSource.getRepository(HabitCheckinEntity);

  let user = await usersRepository.findOne({ where: { openid: 'dev-openid-habitly' } });

  if (!user) {
    user = await usersRepository.save(
      usersRepository.create({
        openid: 'dev-openid-habitly',
        unionid: null,
        status: 1,
        lastLoginAt: new Date(),
      }),
    );
  }

  const profile = await profilesRepository.findOne({ where: { userId: user.id } });
  if (!profile) {
    await profilesRepository.save(
      profilesRepository.create({
        userId: user.id,
        nickname: '开发测试用户',
        avatarUrl: '',
        bio: '把每一次小坚持，都变成看得见的成长。',
        coverTheme: 'sky',
        timezone: 'Asia/Shanghai',
        locale: 'zh-CN',
        vipStatus: 'free',
      }),
    );
  }

  const existingProjects = await projectsRepository.find({
    where: { userId: user.id },
    order: { createdAt: 'ASC' },
  });

  let projects = existingProjects;
  if (!projects.length) {
    projects = await projectsRepository.save([
      projectsRepository.create({
        userId: user.id,
        title: '运动',
        icon: '🏃',
        slogan: '一点点坚持，也会长成力量。',
        colorTheme: 'blue',
        status: 'active',
        scheduleType: 'daily',
        scheduleDays: [0, 1, 2, 3, 4, 5, 6],
        targetType: 'forever',
        targetValue: 0,
        startDate: dayjs().subtract(14, 'day').format('YYYY-MM-DD'),
        reminderEnabled: true,
        reminderTimes: ['08:00'],
        moodEnabled: true,
        scoreEnabled: false,
        metricEnabled: true,
        metricUnit: '分钟',
      }),
      projectsRepository.create({
        userId: user.id,
        title: '阅读',
        icon: '📚',
        slogan: '每天读一点，想法会慢慢长大。',
        colorTheme: 'green',
        status: 'active',
        scheduleType: 'weekly-custom',
        scheduleDays: [1, 2, 3, 4, 5],
        targetType: 'forever',
        targetValue: 0,
        startDate: dayjs().subtract(14, 'day').format('YYYY-MM-DD'),
        reminderEnabled: true,
        reminderTimes: ['21:00'],
        moodEnabled: false,
        scoreEnabled: true,
        metricEnabled: true,
        metricUnit: '分钟',
      }),
    ]);
  }

  const existingCheckins = await checkinsRepository.count({
    where: { userId: user.id },
  });

  if (!existingCheckins && projects.length >= 2) {
    const projectA = projects[0];
    const projectB = projects[1];
    const dates = [1, 2, 3, 5, 6].map((offset) => dayjs().subtract(offset, 'day').format('YYYY-MM-DD'));

    await checkinsRepository.save([
      ...dates.map((date, index) =>
        checkinsRepository.create({
          userId: user.id,
          projectId: projectA.id,
          checkinDate: date,
          status: 'done',
          checkedAt: dayjs(date).hour(8).minute(10 + index).toDate(),
          moodValue: index % 2 === 0 ? '开心' : '平静',
          scoreValue: 0,
          metricValue: 20 + index * 5,
          metricUnit: '分钟',
          note: '',
        }),
      ),
      ...dates.slice(0, 3).map((date, index) =>
        checkinsRepository.create({
          userId: user.id,
          projectId: projectB.id,
          checkinDate: date,
          status: 'done',
          checkedAt: dayjs(date).hour(21).minute(5 + index).toDate(),
          moodValue: '',
          scoreValue: 4 + (index % 2),
          metricValue: 15 + index * 10,
          metricUnit: '分钟',
          note: '',
        }),
      ),
    ]);
  }

  await AppDataSource.destroy();
  // eslint-disable-next-line no-console
  console.log('seed 完成');
}

bootstrap().catch(async (error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
  process.exit(1);
});
