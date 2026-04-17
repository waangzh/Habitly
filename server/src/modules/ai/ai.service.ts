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

const SCENE_GUIDELINES: Record<string, string> = {
  'home-nudge': '输出一句短建议和一个短标签，语气轻、稳，不说教，不夸张，不提长期记忆。',
  'report-insight': '输出固定三段：summary、blockerHypothesis、nextStep。判断要克制，优先给可执行的下一步。',
  'project-draft':
    '只返回当前产品已支持的项目字段，不新增产品外字段，不设计复杂规则。title 必须准确保留用户原始目标语义；如果用户描述的是复合习惯（例如早睡早起），不要擅自缩成单一动作；如果原文包含早上、上午、中午、下午、晚上、凌晨等时间限定，reminderTimes 必须转换成正确的 24 小时制时间。',
  'checkin-coach': '只做单轮追问，问题具体、温和，鼓励用户说出最小行动线索。',
  'checkin-reflection': '只做单轮回应，先接住用户表达，再给一个轻量下一步。',
};

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
    const result = await this.resolveAiResult({
      userId,
      scene: 'project-draft',
      requestId: request.requestId || '',
      cacheKey: `habit:ai:project-draft:v2:${userId}:${sha256(payload.prompt)}`,
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

    return this.normalizeProjectDraftOutput(result, payload, fallback);
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
            content: this.buildSystemPrompt(scene, schema),
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

  private buildSystemPrompt(scene: string, schema: unknown): string {
    const sceneRule = SCENE_GUIDELINES[scene] || '输出简洁、温和、可执行的内容。';
    return [
      '你是 Habitly 小程序的 AI 助手。',
      '产品类型是习惯养成，不是任务管理工具。',
      '整体语气要鼓励式、陪伴式、轻提醒，不使用命令口吻，不写鸡汤，不夸张。',
      '输入只是一份结构化摘要，不要臆测不存在的历史，不要制造长期记忆。',
      '不要输出用户隐私推断，不要要求额外敏感信息。',
      sceneRule,
      `严格按以下 JSON 结构输出：${JSON.stringify(schema)}`,
      '不要输出 markdown，不要输出解释，不要输出 JSON 之外的任何内容。',
    ].join('\n');
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
    const inferred = this.inferProjectDraftDefaults(payload.prompt);

    return {
      title: inferred.title,
      slogan: '先把步子放小一点，习惯就更容易长出来。',
      reminderTimes: inferred.reminderTimes.length ? inferred.reminderTimes : ['21:30'],
      moodEnabled: inferred.moodEnabled,
      scoreEnabled: inferred.scoreEnabled,
      metricEnabled: inferred.metricEnabled,
      metricUnit: inferred.metricUnit,
      scheduleType: inferred.scheduleType,
      scheduleDays: inferred.scheduleDays,
      icon: inferred.icon,
      colorTheme: inferred.colorTheme,
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

  private normalizeProjectDraftOutput(
    result: ProjectDraftOutputDto,
    payload: ProjectDraftDto,
    fallback: ProjectDraftOutputDto,
  ): ProjectDraftOutputDto {
    const inferred = this.inferProjectDraftDefaults(payload.prompt);
    const normalizedReminderTimes = normalizeReminderTimes(result.reminderTimes);

    return {
      ...result,
      title: inferred.title || result.title || fallback.title,
      reminderTimes: inferred.reminderTimes.length
        ? inferred.reminderTimes
        : normalizedReminderTimes.length
          ? normalizedReminderTimes
          : fallback.reminderTimes,
      scheduleType: inferred.scheduleType,
      scheduleDays: inferred.scheduleDays,
    };
  }

  private inferProjectDraftDefaults(prompt: string) {
    const normalizedPrompt = prompt.trim();
    const title = this.inferProjectTitle(normalizedPrompt);
    const text = normalizedPrompt.toLowerCase();
    const scheduleType: ProjectDraftOutputDto['scheduleType'] = /工作日/.test(normalizedPrompt)
      ? 'weekly-custom'
      : 'daily';
    const scheduleDays = scheduleType === 'weekly-custom' ? WORKDAY_DAYS : ALL_SCHEDULE_DAYS;
    const reminderTimes = normalizeReminderTimes(this.extractTimes(normalizedPrompt));
    let icon = '🌱';
    let colorTheme = 'blue';
    let metricUnit = '';
    let metricEnabled = false;
    let moodEnabled = true;
    let scoreEnabled = false;

    if (title === '早睡早起' || text.includes('早睡') || text.includes('sleep')) {
      icon = '🌙';
    } else if (text.includes('阅读') || text.includes('读书') || text.includes('read')) {
      icon = '📚';
      metricEnabled = true;
      metricUnit = '分钟';
      moodEnabled = false;
      scoreEnabled = true;
      colorTheme = 'green';
    } else if (text.includes('运动') || text.includes('跑步') || text.includes('健身')) {
      icon = '🏃';
      metricEnabled = true;
      metricUnit = '分钟';
      colorTheme = 'orange';
    } else if (text.includes('喝水')) {
      icon = '💧';
      metricEnabled = true;
      metricUnit = '杯';
      moodEnabled = false;
    }

    return {
      title,
      scheduleType,
      scheduleDays,
      reminderTimes,
      icon,
      colorTheme,
      metricUnit,
      metricEnabled,
      moodEnabled,
      scoreEnabled,
    };
  }

  private inferProjectTitle(prompt: string): string {
    const text = prompt.trim();
    const lower = text.toLowerCase();
    const hasSleep = /早睡|sleep|放下手机|早点睡|作息/.test(text) || lower.includes('sleep');
    const hasWake = /早起|起床|早起床|早点起/.test(text);

    if (/早睡早起|规律作息/.test(text) || (hasSleep && hasWake)) {
      return '早睡早起';
    }

    if (hasSleep) {
      return '早睡';
    }

    if (text.includes('阅读') || text.includes('读书') || lower.includes('read')) {
      return '阅读';
    }

    if (text.includes('运动') || text.includes('跑步') || text.includes('健身')) {
      return '运动';
    }

    if (text.includes('喝水')) {
      return '喝水';
    }

    return '小坚持';
  }

  private extractTimes(prompt: string): string[] {
    const matches = prompt.matchAll(
      /(?:(凌晨|清晨|早上|上午|中午|下午|傍晚|晚上|夜里|夜间|半夜)\s*)?([0-9零〇一二两三四五六七八九十]{1,3})(?:\s*(?:点|时|:|：)\s*([0-9零〇一二两三四五六七八九十]{1,2})?)?\s*(半)?/g,
    );

    return Array.from(matches)
      .filter((match) => Boolean(match[1] || match[3] || match[4] || /[:：点时]/.test(match[0])))
      .map((match) => {
        const qualifier = match[1] || '';
        const rawHour = this.parseTimeNumber(match[2]);
        const rawMinute = match[4] ? 30 : this.parseTimeNumber(match[3] || '0');
        const hour = this.normalizeHourWithQualifier(rawHour, qualifier);
        const minute = Math.min(rawMinute, 59);
        return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      });
  }

  private parseTimeNumber(raw: string): number {
    if (!raw) {
      return 0;
    }

    if (/^\d+$/.test(raw)) {
      return Number(raw);
    }

    const normalized = raw.replace(/两/g, '二').replace(/〇/g, '零');
    const digitMap: Record<string, number> = {
      零: 0,
      一: 1,
      二: 2,
      三: 3,
      四: 4,
      五: 5,
      六: 6,
      七: 7,
      八: 8,
      九: 9,
    };

    if (normalized === '十') {
      return 10;
    }

    if (normalized.includes('十')) {
      const [tens, units] = normalized.split('十');
      const tensValue = tens ? digitMap[tens] || 0 : 1;
      const unitsValue = units ? digitMap[units] || 0 : 0;
      return tensValue * 10 + unitsValue;
    }

    return digitMap[normalized] ?? 0;
  }

  private normalizeHourWithQualifier(hour: number, qualifier: string): number {
    let normalized = hour % 24;

    if (!qualifier) {
      return normalized;
    }

    if (['凌晨', '清晨', '半夜'].includes(qualifier)) {
      return normalized === 12 ? 0 : normalized;
    }

    if (['早上', '上午'].includes(qualifier)) {
      return normalized === 12 ? 0 : normalized;
    }

    if (qualifier === '中午') {
      if (normalized === 0) {
        return 12;
      }
      return normalized < 11 ? normalized + 12 : normalized;
    }

    if (['下午', '傍晚', '晚上', '夜里', '夜间'].includes(qualifier)) {
      if (normalized < 12) {
        return normalized + 12;
      }
    }

    return normalized;
  }

}
