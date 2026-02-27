import { describe, it, expect } from 'vitest';
import { CompensationError, TimeoutError, AbortError } from '../errors';

describe('CompensationError', () => {
  it('should set name, stepName, and message with cause', () => {
    const cause = new Error('db failed');
    const error = new CompensationError('createUser', cause);

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(CompensationError);
    expect(error.name).toBe('CompensationError');
    expect(error.stepName).toBe('createUser');
    expect(error.cause).toBe(cause);
    expect(error.message).toBe('Compensation failed for step "createUser": db failed');
  });

  it('should handle missing cause', () => {
    const error = new CompensationError('rollback');

    expect(error.stepName).toBe('rollback');
    expect(error.cause).toBeUndefined();
    expect(error.message).toBe('Compensation failed for step "rollback": ');
  });
});

describe('TimeoutError', () => {
  it('should set name and message', () => {
    const error = new TimeoutError('timed out after 5000 ms');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(TimeoutError);
    expect(error.name).toBe('TimeoutError');
    expect(error.message).toBe('timed out after 5000 ms');
  });
});

describe('AbortError', () => {
  it('should set name and message', () => {
    const error = new AbortError('Saga aborted');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AbortError);
    expect(error.name).toBe('AbortError');
    expect(error.message).toBe('Saga aborted');
  });
});
