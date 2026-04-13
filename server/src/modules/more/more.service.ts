import { Injectable } from '@nestjs/common';
import { AchievementsService } from '../achievements/achievements.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class MoreService {
  constructor(
    private readonly usersService: UsersService,
    private readonly achievementsService: AchievementsService,
  ) {}

  async getOverview(userId: number) {
    const [profile, achievement] = await Promise.all([
      this.usersService.getProfile(userId),
      this.achievementsService.getSummary(userId),
    ]);

    return {
      nickname: profile.nickname,
      syncStatus: 'ok',
      reminderHint: '提醒优先使用站内提醒，后续会接入订阅消息。',
      achievementHeadline: `已累计完成 ${achievement.totalCheckins} 次打卡`,
      sections: [
        {
          key: 'sync',
          title: '同步状态',
          desc: '当前后端已接入，后续会继续补云同步与跨设备恢复。',
          action: 'noop',
        },
        {
          key: 'report',
          title: '查看成绩单',
          desc: '快速进入周报和月报总结页。',
          action: 'report',
        },
        {
          key: 'history',
          title: '查看历史记录',
          desc: '回看你每一次完成留下的轨迹。',
          action: 'history',
        },
        {
          key: 'reset',
          title: '重置演示数据',
          desc: '开发环境可通过 seed 重新写入演示数据。',
          action: 'seed',
        },
      ],
    };
  }
}
