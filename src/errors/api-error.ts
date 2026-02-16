import { SDKError } from './base';

export class APIError extends SDKError {
  constructor(message: string, statusCode?: number, details?: unknown) {
    super(message, 'API_ERROR', statusCode, details);
  }

  static fromResponse(status: number, data: unknown): APIError {
    const body = data as Record<string, unknown> | undefined;
    const errorField = body?.error as Record<string, unknown> | string | undefined;
    const message =
      (typeof body?.message === 'string' ? body.message : undefined) ||
      (typeof errorField === 'string' ? errorField : undefined) ||
      (typeof errorField === 'object' && typeof errorField?.message === 'string'
        ? errorField.message
        : undefined) ||
      `API request failed with status code ${status}`;
    return new APIError(message, status, data);
  }
}

export class ValidationError extends SDKError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', undefined, details);
  }
}

export class AuthenticationError extends SDKError {
  constructor(message: string = 'Authentication failed') {
    super(message, 'AUTHENTICATION_ERROR', 401);
  }
}

export class RateLimitError extends SDKError {
  public readonly retryAfter?: number;

  constructor(message: string, retryAfter?: number) {
    super(message, 'RATE_LIMIT_ERROR', 429);
    this.retryAfter = retryAfter;
  }
}
