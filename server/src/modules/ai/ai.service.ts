import {
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import dayjs from 'dayjs';
import OpenAI from 'openai';
import { Repository } from 'typeorm';
import { RedisService } from '../../common/services/redis.service';
import { ALL_SCHEDULE_DAYS, WORKDAY_DAYS, normalizeReminderTimes, sha256 } from '../../common/utils/habit.utils';
import type { RequestWithContext } from '../../common/types/request-context.type';
import { AiCallLogEntity } from '../../database/entities/ai-call-log.entity';
import { CheckinCoachDto } from './dto/checkin-coach.dto';
import { CheckinReflectionDto } from './dto/checkin-reflection.dto';
import { HomeNudgeDto } from './dto/home-nudge.dto';
import {
  CheckinCoachOutputDto,
  CheckinReflectionOutputDto,
  HomeNudgeOutputDto,
  ProjectDraftOutputDto,
  ReportInsightOutputDto,
} from './dto/ai-output.dto';
import { ProjectDraftDto } from './dto/project-draft.dto';
import { ReportInsightDto } from './dto/report-insight.dto';

type ClassType<T> = new () => T;

@Injectable()
export class AiService {
  private readonly client: OpenAI;

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    @InjectRepository(AiCallLogEntity)
    private readonly aiCallLogsRepository: Repository<AiCallLogEntity>,
  ) {
    this.client = new OpenAI({
      apiKey: this.configService.get<string>('deepseek.apiKey') || 'missing-key',
      baseURL: this.configService.getOrThrow<string>('deepseek.baseUrl'),
      timeout: this.configService.getOrThrow<number>('deepseek.timeoutMs'),
    });
  }

  async getHomeNudge(userId: number, payload: HomeNudgeDto, request: RequestWithContext) {
    const fallback = this.createLocalHomeNudge(payload);
    return this.resolveAiResult({
      userId,
      scene: 'home-nudge',
      requestId: request.requestId || '',
      cacheKey: `habit:ai:home-nudge:${userId}:${payload.selectedDate}`,
      cacheTtl: 86400,
      payload,
      schema: {
        tone: 'steady',
        message: 'string',
        suggestionTag: 'string',
      },
      outputDto: HomeNudgeOutputDto,
      fallback,
    });
  }

  async getReportInsight(userId: number, payload: ReportInsightDto, request: RequestWithContext) {
    const scopeKey = payload.scope === 'project' ? payload.title : 'all';
    const fallback = this.createLocalReportInsight(payload);
    return this.resolveAiResult({
      userId,
      scene: 'report-insight',
      requestId: request.requestId || '',
      cacheKey: `habit:ai:report-insight:${userId}:${payload.periodType}:${payload.periodKey}:${scopeKey}`,
      cacheTtl: 604800,
      payload,
      schema: {
        summary: 'string',
        blockerHypothesis: 'string',
        nextStep: 'string',
      },
      outputDto: ReportInsightOutputDto,
      fallback,
    });
  }

  async getProjectDraft(userId: number, payload: ProjectDraftDto, request: RequestWithContext) {
    const fallback = this.createLocalProjectDraft(payload);
    return this.resolveAiResult({
      userId,
      scene: 'project-draft',
      requestId: request.requestId || '',
      cacheKey: `habit:ai:project-draft:${userId}:${sha256(payload.prompt)}`,
      cacheTtl: 86400,
      payload,
      schema: {
        title: 'string',
        slogan: 'string',
        reminderTimes: ['string'],
        moodEnabled: true,
        scoreEnabled: false,
        metricEnabled: false,
        metricUnit: 'string',
        scheduleType: 'daily',
        scheduleDays: [1, 2, 3, 4, 5],
        icon: 'string',
        colorTheme: 'string',
      },
      outputDto: ProjectDraftOutputDto,
      fallback,
    });
  }

  async getCheckinCoach(userId: number, payload: CheckinCoachDto, request: RequestWithContext) {
    const fallback = this.createLocalCheckinCoach(payload);
    return this.resolveAiResult({
      userId,
      scene: 'checkin-coach',
      requestId: request.requestId || '',
      cacheKey: `habit:ai:checkin-coach:${userId}:${payload.projectId}:${payload.date}`,
      cacheTtl: 604800,
      payload,
      schema: {
        question: 'string',
        hint: 'string',
      },
      outputDto: CheckinCoachOutputDto,
      fallback,
    });
  }

  async getCheckinReflection(userId: number, payload: CheckinReflectionDto, request: RequestWithContext) {
    const fallback = this.createLocalCheckinReflection(payload);
    return this.resolveAiResult({
      userId,
      scene: 'checkin-reflection',
      requestId: request.requestId || '',
      cacheKey: `habit:ai:checkin-reflection:${userId}:${payload.projectId}:${sha256(payload.answer)}`,
      cacheTtl: 86400,
      payload,
      schema: {
        reflection: 'string',
        suggestion: 'string',
      },
      outputDto: CheckinReflectionOutputDto,
      fallback,
    });
  }

  private async resolveAiResult<T>({
    userId,
    scene,
    requestId,
    cacheKey,
    cacheTtl,
    payload,
    schema,
    outputDto,
    fallback,
  }: {
    userId: number;
    scene: string;
    requestId: string;
    cacheKey: string;
    cacheTtl: number;
    payload: unknown;
    schema: unknown;
    outputDto: ClassType<T>;
    fallback: T;
  }): Promise<T> {
    await this.enforceRateLimit(userId);

    const cached = await this.redisService.getJson<T>(cacheKey);
    if (cached) {
      await this.logAiCall({
        userId,
        scene,
        requestId,
        modelName: this.configService.getOrThrow<string>('deepseek.model'),
        cacheHit: true,
        inputTokens: 0,
        outputTokens: 0,
        latencyMs: 0,
        status: 'success',
        promptHash: sha256(JSON.stringify(payload)),
        resultPreview: JSON.stringify(cached).slice(0, 400),
      });
      return cached;
    }

    const apiKey = this.configService.get<string>('deepseek.apiKey') || '';
    if (!apiKey || apiKey === 'replace_me') {
      await this.redisService.setJsonWithTtl(cacheKey, cacheTtl, fallback);
      return fallback;
    }

    const startedAt = Date.now();

    try {
      const response = await this.client.chat.completions.create({
        model: this.configService.getOrThrow<string>('deepseek.model'),
        temperature: 0.3,
        response_format: { type: 'json_object' } as never,
        messages: [
          {
            role: 'system',
            content: '请只输出 json，并严格遵守给定字段，不要输出额外说明。',
          },
          {
            role: 'user',
            content: JSON.stringify({
              scene,
              input: payload,
              outputSchema: schema,
            }),
          },
        ],
      });

      const parsed = JSON.parse(response.choices[0]?.message?.content || '{}');
      const normalized = this.validateOutput(outputDto, parsed, fallback);
      await this.redisService.setJsonWithTtl(cacheKey, cacheTtl, normalized);

      await this.logAiCall({
        userId,
        scene,
        requestId,
        modelName: response.model,
        cacheHit: false,
        inputTokens: response.usage?.prompt_tokens || 0,
        outputTokens: response.usage?.completion_tokens || 0,
        latencyMs: Date.now() - startedAt,
        status: 'success',
        promptHash: sha256(JSON.stringify(payload)),
        resultPreview: JSON.stringify(normalized).slice(0, 400),
      });

      return normalized;
    } catch {
      await this.redisService.setJsonWithTtl(cacheKey, cacheTtl, fallback);
      await this.logAiCall({
        userId,
        scene,
        requestId,
        modelName: this.configService.getOrThrow<string>('deepseek.model'),
        cacheHit: false,
        inputTokens: 0,
        outputTokens: 0,
        latencyMs: Date.now() - startedAt,
        status: 'fallback',
        promptHash: sha256(JSON.stringify(payload)),
        resultPreview: JSON.stringify(fallback).slice(0, 400),
      });
      return fallback;
    }
  }

  private validateOutput<T>(dtoClass: ClassType<T>, raw: unknown, fallback: T): T {
    const instance = plainToInstance(dtoClass, raw);
    const errors = validateSync(instance as object, {
      whitelist: true,
      forbidNonWhitelisted: false,
    });

    return errors.length ? fallback : (instance as T);
  }

  private async enforceRateLimit(userId: number): Promise<void> {
    const key = `habit:rate-limit:ai:${userId}:${dayjs().format('YYYYMMDDHHmm')}`;
    const count = await this.redisService.incr(key);
    if (count === 1) {
      await this.redisService.expire(key, 60);
    }
    if (count > 20) {
      throw new HttpException('AI 请求太频繁了，稍后再试', HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  private async logAiCall(payload: {
    userId: number;
    scene: string;
    requestId: string;
    modelName: string;
    cacheHit: boolean;
    inputTokens: number;
    outputTokens: number;
    latencyMs: number;
    status: string;
    promptHash: string;
    resultPreview: string;
  }) {
    await this.aiCallLogsRepository.save(
      this.aiCallLogsRepository.create({
        userId: String(payload.userId),
        scene: payload.scene,
        requestId: payload.requestId,
        modelName: payload.modelName,
        cacheHit: payload.cacheHit,
        inputTokens: payload.inputTokens,
        outputTokens: payload.outputTokens,
        latencyMs: payload.latencyMs,
        status: payload.status,
        promptHash: payload.promptHash,
        resultPreview: payload.resultPreview,
      }),
    );
  }

  private createLocalHomeNudge(payload: HomeNudgeDto): HomeNudgeOutputDto {
    if (payload.projectCount === 0) {
      return {
        tone: 'gentle',
        message: '今天先别急着铺太满，先写下一个最想开始的小习惯。',
        suggestionTag: '先定一个小目标',
      };
    }

    if (payload.pendingCount === 0) {
      return {
        tone: 'celebrate',
        message: `今天的 ${payload.projectCount} 件小事都稳稳落地了，节奏很漂亮。`,
        suggestionTag: '收下今天的成就感',
      };
    }

    if (payload.completedCount === 0) {
      return {
        tone: 'recover',
        message: '先完成最容易的一件，让今天重新启动起来。',
        suggestionTag: '先做最轻的一步',
      };
    }

    return {
      tone: 'steady',
      message: `已经完成 ${payload.completedCount} 件了，接下来只盯住下一件就好。`,
      suggestionTag: '继续下一件',
    };
  }

  private createLocalReportInsight(payload: ReportInsightDto): ReportInsightOutputDto {
    return {
      summary: `${payload.title} 这段时间已经不是零散尝试了，节奏正在慢慢稳定。`,
      blockerHypothesis:
        payload.lowEnergyCount && payload.lowEnergyCount > 0
          ? '最近的阻力更像是状态波动，而不是你真的不想继续。'
          : '眼下更需要的是固定节奏，而不是额外加码。 ',
      nextStep:
        payload.reminderEnabled && payload.reminderTimes.length
          ? `下一步先守住 ${payload.reminderTimes[0]} 这个提醒点，连续完成 2 天。`
          : '下一步先把开始动作再缩小一点，让自己更容易接上。 ',
    };
  }

  private createLocalProjectDraft(payload: ProjectDraftDto): ProjectDraftOutputDto {
    const prompt = payload.prompt.trim();
    const text = prompt.toLowerCase();
    let title = '小坚持';
    let icon = '🌱';
    let colorTheme = 'blue';
    let metricUnit = '';
    let metricEnabled = false;
    let moodEnabled = true;
    let scoreEnabled = false;

    if (text.includes('早睡') || text.includes('sleep')) {
      title = '早睡';
      icon = '🌙';
    } else if (text.includes('阅读') || text.includes('读书') || text.includes('read')) {
      title = '阅读';
      icon = '📚';
      metricEnabled = true;
      metricUnit = '分钟';
      moodEnabled = false;
      scoreEnabled = true;
      colorTheme = 'green';
    } else if (text.includes('运动') || text.includes('跑步') || text.includes('健身')) {
      title = '运动';
      icon = '🏃';
      metricEnabled = true;
      metricUnit = '分钟';
      colorTheme = 'orange';
    } else if (text.includes('喝水')) {
      title = '喝水';
      icon = '💧';
      metricEnabled = true;
      metricUnit = '杯';
      moodEnabled = false;
    }

    const scheduleType = /工作日/.test(prompt) ? 'weekly-custom' : 'daily';
    const scheduleDays = scheduleType === 'weekly-custom' ? WORKDAY_DAYS : ALL_SCHEDULE_DAYS;
    const reminderTimes = normalizeReminderTimes(this.extractTimes(prompt));

    return {
      title,
      slogan: '先把步子放小一点，习惯就更容易长出来。',
      reminderTimes: reminderTimes.length ? reminderTimes : ['21:30'],
      moodEnabled,
      scoreEnabled,
      metricEnabled,
      metricUnit,
      scheduleType,
      scheduleDays,
      icon,
      colorTheme,
    };
  }

  private createLocalCheckinCoach(_: CheckinCoachDto): CheckinCoachOutputDto {
    return {
      question: '今天这次完成，最帮到你的那个小动作是什么？',
      hint: '不用写很多，抓住一个最具体的动作就够了。',
    };
  }

  private createLocalCheckinReflection(payload: CheckinReflectionDto): CheckinReflectionOutputDto {
    return {
      reflection: payload.answer.trim()
        ? `你刚刚提到的「${payload.answer.trim()}」很可能就是这次最值得保留的启动线索。`
        : '你已经愿意停下来回看一下，这本身就在帮习惯长出来。',
      suggestion: '下次开始前，先把这一个小动作默念一遍，让自己更容易接上。',
    };
  }

  private extractTimes(prompt: string): string[] {
    const matches = prompt.match(/(\d{1,2})[:：点](\d{1,2})?/g) || [];
    return matches.map((item) => {
      const match = item.match(/(\d{1,2})[:：点](\d{1,2})?/);
      const hour = `${match?.[1] || 21}`.padStart(2, '0');
      const minute = `${match?.[2] || 0}`.padStart(2, '0');
      return `${hour}:${minute}`;
    });
  }

}
