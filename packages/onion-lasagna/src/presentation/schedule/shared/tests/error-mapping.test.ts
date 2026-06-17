import { describe, it, expect } from 'vitest';
import { mapErrorToScheduleResult } from '../error-mapping';
import { UseCaseError } from '../../../../app/exceptions/use-case.error';
import { UnprocessableError } from '../../../../app/exceptions/unprocessable.error';
import { NotFoundError } from '../../../../app/exceptions/not-found.error';
import { ConflictError } from '../../../../app/exceptions/conflict.error';
import { DomainError } from '../../../../domain/exceptions/domain.error';
import { InfraError } from '../../../../infra/exceptions/infra.error';
import { DbError } from '../../../../infra/exceptions/db.error';
import { ObjectValidationError } from '../../../../global/exceptions/object-validation.error';

describe('mapErrorToScheduleResult', () => {
  it('maps validation/domain/use-case errors to FAILED (permanent)', () => {
    const permanent = [
      new ObjectValidationError({ message: 'bad', validationErrors: [] }),
      new UseCaseError({ message: 'x' }),
      new UnprocessableError({ message: 'x' }),
      new DomainError({ message: 'x' }),
    ];
    for (const err of permanent) {
      expect(mapErrorToScheduleResult(err).outcome).toBe('failed');
    }
  });

  it('maps infra/transient errors to RETRY', () => {
    for (const err of [
      new InfraError({ message: 'x' }),
      new DbError({ message: 'x' }),
      new NotFoundError({ message: 'x' }),
      new ConflictError({ message: 'x' }),
    ]) {
      expect(mapErrorToScheduleResult(err).outcome).toBe('retry');
    }
  });

  it('maps unknown errors to RETRY (conservative — never lose a run)', () => {
    expect(mapErrorToScheduleResult(new Error('boom')).outcome).toBe('retry');
    expect(mapErrorToScheduleResult('a string').outcome).toBe('retry');
  });

  it('NEVER produces a skipped outcome from error mapping', () => {
    const errors: unknown[] = [
      new ObjectValidationError({ message: 'x', validationErrors: [] }),
      new UseCaseError({ message: 'x' }),
      new InfraError({ message: 'x' }),
      new NotFoundError({ message: 'x' }),
      new Error('unknown'),
      'string error',
      null,
    ];
    for (const err of errors) {
      expect(mapErrorToScheduleResult(err).outcome).not.toBe('skipped');
    }
  });
});
