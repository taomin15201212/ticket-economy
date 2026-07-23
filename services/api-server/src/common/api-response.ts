import { randomUUID } from 'crypto';

export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  traceId: string;
  data: T;
}

export function ok<T>(data: T, message = 'ok'): ApiResponse<T> {
  return {
    code: 0,
    message,
    traceId: randomUUID(),
    data,
  };
}

export function fail(
  message: string,
  code = 400,
  data: unknown = null,
): ApiResponse {
  return {
    code,
    message,
    traceId: randomUUID(),
    data,
  };
}
