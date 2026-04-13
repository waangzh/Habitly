import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import type { RequestWithContext } from '../types/request-context.type';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<RequestWithContext>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse = isHttpException ? exception.getResponse() : null;

    let message = '服务暂时开了个小差';
    let code = 50000;

    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (exceptionResponse && typeof exceptionResponse === 'object') {
      const responseMessage = (exceptionResponse as { message?: string | string[] }).message;
      if (Array.isArray(responseMessage)) {
        message = responseMessage[0] || message;
      } else if (responseMessage) {
        message = responseMessage;
      }
      if (typeof (exceptionResponse as { code?: number }).code === 'number') {
        code = (exceptionResponse as { code?: number }).code as number;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    if (isHttpException && code === 50000) {
      const codeMap: Record<number, number> = {
        [HttpStatus.BAD_REQUEST]: 40001,
        [HttpStatus.UNAUTHORIZED]: 40101,
        [HttpStatus.FORBIDDEN]: 40301,
        [HttpStatus.NOT_FOUND]: 40401,
        [HttpStatus.CONFLICT]: 40901,
        [HttpStatus.TOO_MANY_REQUESTS]: 42901,
      };
      code = codeMap[status] || 50000;
    }

    if (!isHttpException) {
      this.logger.error(exception);
    }

    response.status(status).json({
      code,
      message,
      requestId: request.requestId || '',
    });
  }
}
