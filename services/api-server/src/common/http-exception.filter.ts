import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { randomUUID } from 'crypto';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code = 500;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      code = status;
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else if (body && typeof body === 'object') {
        const obj = body as Record<string, unknown>;
        message = String(obj.message ?? obj.error ?? message);
        if (Array.isArray(obj.message)) {
          message = obj.message.join('; ');
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    res.status(status >= 500 ? status : 200).json({
      code,
      message,
      traceId: randomUUID(),
      data: null,
    });
  }
}
