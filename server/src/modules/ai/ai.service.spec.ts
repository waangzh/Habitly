import { ConfigService } from '@nestjs/config';
import { AiService } from './ai.service';

describe('AiService project draft normalization', () => {
  function createService(options?: {
    cachedResult?: unknown;
    apiKey?: string;
  }) {
    const redisService = {
      incr: jest.fn().mockResolvedValue(1),
      expire: jest.fn().mockResolvedValue(true),
      getJson: jest.fn().mockResolvedValue(options?.cachedResult ?? null),
      setJsonWithTtl: jest.fn().mockResolvedValue(true),
    };

    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'deepseek.apiKey') {
          return options?.apiKey ?? '';
        }
        return undefined;
      }),
      getOrThrow: jest.fn((key: string) => {
        const map: Record<string, unknown> = {
          'deepseek.baseUrl': 'https://api.deepseek.com',
          'deepseek.timeoutMs': 20000,
          'deepseek.model': 'deepseek-chat',
        };
        return map[key];
      }),
    } as Partial<ConfigService> as ConfigService;

    const aiCallLogsRepository = {
      create: jest.fn((payload) => payload),
      save: jest.fn().mockResolvedValue(true),
    };

    return new AiService(
      configService,
      redisService as never,
      aiCallLogsRepository as never,
    );
  }

  it('应从原始描述中提取早睡早起标题和带时段的提醒时间', async () => {
    const service = createService();

    const result = await service.getProjectDraft(
      1,
      {
        prompt: '我想在工作日坚持早睡早起，晚上11点前放下手机，早上9点起床',
      },
      {
        requestId: 'req-1',
      } as never,
    );

    expect(result.title).toBe('早睡早起');
    expect(result.scheduleType).toBe('weekly-custom');
    expect(result.scheduleDays).toEqual([1, 2, 3, 4, 5]);
    expect(result.reminderTimes).toEqual(['23:00', '09:00']);
  });

  it('命中旧缓存草案时也应按用户原文纠正标题和提醒时间', async () => {
    const service = createService({
      cachedResult: {
        title: '早睡',
        slogan: '先把步子放小一点，习惯就更容易长出来。',
        reminderTimes: ['11:00', '09:00'],
        moodEnabled: true,
        scoreEnabled: false,
        metricEnabled: false,
        metricUnit: '',
        scheduleType: 'daily',
        scheduleDays: [0, 1, 2, 3, 4, 5, 6],
        icon: '🌙',
        colorTheme: 'blue',
      },
    });

    const result = await service.getProjectDraft(
      1,
      {
        prompt: '我想在工作日坚持早睡早起，晚上11点前放下手机，早上9点起床',
      },
      {
        requestId: 'req-2',
      } as never,
    );

    expect(result.title).toBe('早睡早起');
    expect(result.reminderTimes).toEqual(['23:00', '09:00']);
    expect(result.scheduleType).toBe('weekly-custom');
    expect(result.scheduleDays).toEqual([1, 2, 3, 4, 5]);
  });
});
