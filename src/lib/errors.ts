export abstract class BaseError extends Error {
  abstract readonly code: string;
  abstract readonly status: number;

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends BaseError {
  readonly code = 'VALIDATION_ERROR';
  readonly status = 400;
  readonly errors: Record<string, string[]>;

  constructor(message: string, errors: Record<string, string[]> = {}) {
    super(message);
    this.errors = errors;
  }
}

export class AuthenticationError extends BaseError {
  readonly code = 'AUTHENTICATION_ERROR';
  readonly status = 401;
}

export class ForbiddenError extends BaseError {
  readonly code = 'FORBIDDEN_ERROR';
  readonly status = 403;
}

export class NotFoundError extends BaseError {
  readonly code = 'NOT_FOUND_ERROR';
  readonly status = 404;
}

export class DatabaseError extends BaseError {
  readonly code = 'DATABASE_ERROR';
  readonly status = 500;
  readonly originalError?: unknown;

  constructor(message: string, originalError?: unknown) {
    super(message);
    this.originalError = originalError;
  }
}

export class InternalServerError extends BaseError {
  readonly code = 'INTERNAL_SERVER_ERROR';
  readonly status = 500;
}

export type AppError = BaseError;

export type Result<T, E = AppError> =
  | { success: true; data: T; error?: never }
  | { success: false; data?: never; error: E };
