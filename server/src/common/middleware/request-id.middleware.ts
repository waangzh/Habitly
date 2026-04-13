import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { NextFunction, Response } from 'express';
import type { RequestWithContext } from '../types/request-context.type';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(request: RequestWithContext, response: Response, next: NextFunction): void {
    const requestId = String(request.headers['x-request-id'] || randomUUID());
    request.requestId = requestId;
    response.setHeader('x-request-id', requestId);
    next();
  }
}
