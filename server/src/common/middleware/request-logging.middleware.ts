import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Response } from 'express';
import type { RequestWithContext } from '../types/request-context.type';

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HttpRequest');
  private readonly sensitiveKeys = ['authorization', 'accessToken', 'refreshToken', 'password', 'secret'];

  use(request: RequestWithContext, response: Response, next: NextFunction): void {
    const startedAt = Date.now();
    let responseSummary = '';
    const originalJson = response.json.bind(response);

    response.json = ((body: unknown) => {
      responseSummary = this.buildPayloadSummary(body);
      return originalJson(body);
    }) as Response['json'];

    response.on('finish', () => {
      const durationMs = Date.now() - startedAt;
      const path = request.originalUrl || request.url;
      const userId = request.user?.userId ? ` userId=${request.user.userId}` : '';
      const responseText = responseSummary ? ` response=${responseSummary}` : '';

      this.logger.log(
        `${request.method} ${path} ${response.statusCode} ${durationMs}ms${userId}${responseText}`,
      );
    });

    next();
  }

  private buildPayloadSummary(payload: unknown): string {
    if (payload === undefined) {
      return '';
    }

    return JSON.stringify(this.summarizeValue(payload));
  }

  private isSensitiveKey(key: string): boolean {
    const lowerKey = key.toLowerCase();
    return this.sensitiveKeys.some((item) => lowerKey.includes(item.toLowerCase()));
  }

  private summarizeValue(value: unknown, depth = 0): unknown {
    if (typeof value === 'string') {
      return value.length > 80 ? `${value.slice(0, 77)}...` : value;
    }

    if (Array.isArray(value)) {
      const limited = value.slice(0, 6).map((item) => this.summarizeValue(item, depth + 1));
      return value.length > 6 ? [...limited, '...'] : limited;
    }

    if (value && typeof value === 'object') {
      if (depth >= 2) {
        return '[Object]';
      }

      const entries = Object.entries(value as Record<string, unknown>);
      const limitedEntries = entries.slice(0, 8);
      const summarized = limitedEntries.reduce<Record<string, unknown>>((result, [key, item]) => {
        result[key] = this.isSensitiveKey(key) ? '[REDACTED]' : this.summarizeValue(item, depth + 1);
        return result;
      }, {});

      if (entries.length > 8) {
        summarized.__truncated = `+${entries.length - 8} fields`;
      }

      return summarized;
    }

    return value;
  }
}
