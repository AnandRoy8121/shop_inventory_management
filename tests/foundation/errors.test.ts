import { describe, it, expect } from 'vitest';
import {
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  handleActionError,
  successResult,
} from '../../src/lib/errors';
import { z } from 'zod';

describe('Centralized Error Handling Strategy', () => {
  it('instantiates specific domain errors with expected status codes and codes', () => {
    const notFound = new NotFoundError('User', 'u-123');
    expect(notFound.statusCode).toBe(404);
    expect(notFound.code).toBe('NOT_FOUND');
    expect(notFound.message).toContain('User with identifier "u-123" was not found.');

    const unauthorized = new UnauthorizedError();
    expect(unauthorized.statusCode).toBe(401);
    expect(unauthorized.code).toBe('UNAUTHORIZED');

    const forbidden = new ForbiddenError();
    expect(forbidden.statusCode).toBe(403);
    expect(forbidden.code).toBe('FORBIDDEN');

    const conflict = new ConflictError('Email in use');
    expect(conflict.statusCode).toBe(409);
    expect(conflict.code).toBe('CONFLICT');
  });

  it('formats Zod validation errors safely without crashing', () => {
    const schema = z.object({ email: z.string().email(), age: z.number().min(18) });
    const parsed = schema.safeParse({ email: 'not-an-email', age: 12 });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const result = handleActionError(parsed.error);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Input validation failed.');
        expect(result.code).toBe('VALIDATION_ERROR');
        expect(result.fieldErrors).toHaveProperty('email');
        expect(result.fieldErrors).toHaveProperty('age');
      }
    }
  });

  it('sanitizes unexpected exceptions to prevent leaking server details', () => {
    const rawError = new Error('FATAL: connection terminated unexpectedly');
    const result = handleActionError(rawError);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('An unexpected server error occurred. Please try again.');
      expect(result.code).toBe('INTERNAL_ERROR');
    }
  });

  it('wraps success results consistently', () => {
    const payload = { userId: '123' };
    const res = successResult(payload);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data).toEqual(payload);
    }
  });
});
