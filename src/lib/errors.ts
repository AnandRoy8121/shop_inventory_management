import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(
    message: string,
    public code: string = 'INTERNAL_ERROR',
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// Alias for domain-driven error naming
export const DomainError = AppError;

export class NotFoundError extends AppError {
  constructor(entity: string, identifier?: string) {
    super(
      `${entity}${identifier ? ` with identifier "${identifier}"` : ''} was not found.`,
      'NOT_FOUND',
      404
    );
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication is required to perform this action.') {
    super(message, 'UNAUTHORIZED', 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to access this resource.') {
    super(message, 'FORBIDDEN', 403);
    this.name = 'ForbiddenError';
  }
}

export class ValidationError extends AppError {
  constructor(
    message = 'Validation failed.',
    public fieldErrors?: Record<string, string[]>
  ) {
    super(message, 'VALIDATION_ERROR', 400, fieldErrors);
    this.name = 'ValidationError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409);
    this.name = 'ConflictError';
  }
}

export class InsufficientStockError extends AppError {
  constructor(
    public productName: string,
    public available: number,
    public requested: number
  ) {
    super(
      `Insufficient stock for "${productName}". Requested ${requested}, but only ${available} available.`,
      'INSUFFICIENT_STOCK',
      400
    );
    this.name = 'InsufficientStockError';
  }
}

export class ProductDeactivatedError extends AppError {
  constructor(public identifier: string) {
    super(`Product "${identifier}" is currently inactive or deactivated.`, 'PRODUCT_INACTIVE', 400);
    this.name = 'ProductDeactivatedError';
  }
}

export type ActionResult<T = void> =
  | { success: true; data: T }
  | {
      success: false;
      error: string;
      code: string;
      fieldErrors?: Record<string, string[]>;
    };

export function successResult<T>(data: T): ActionResult<T> {
  return { success: true, data };
}

export function errorResult(
  error: string,
  codeOrFieldErrors?: string | Record<string, string[]>,
  fieldErrors?: Record<string, string[]>
): ActionResult<never> {
  let code = 'ERROR';
  let errors = fieldErrors;

  if (typeof codeOrFieldErrors === 'string') {
    code = codeOrFieldErrors;
  } else if (typeof codeOrFieldErrors === 'object' && codeOrFieldErrors !== null) {
    errors = codeOrFieldErrors;
    code = 'VALIDATION_ERROR';
  }

  return { success: false, error, code, fieldErrors: errors };
}

/**
 * Converts any caught error into a safe, sanitized ActionResult
 */
export function handleActionError(err: unknown): ActionResult<never> {
  if (err instanceof ZodError) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of err.issues) {
      const path = issue.path.join('.');
      fieldErrors[path] = fieldErrors[path] || [];
      fieldErrors[path].push(issue.message);
    }
    return errorResult('Input validation failed.', 'VALIDATION_ERROR', fieldErrors);
  }

  if (err instanceof AppError) {
    return errorResult(
      err.message,
      err.code,
      err instanceof ValidationError ? err.fieldErrors : undefined
    );
  }

  // Sanitize internal server or database errors
  console.error('Unhandled Server Error:', err);
  return errorResult('An unexpected server error occurred. Please try again.', 'INTERNAL_ERROR');
}
