/**
 * @fileoverview Tests for event error mapping.
 */

import { describe, it, expect } from 'vitest';
import { mapErrorToEventResult } from '../error-mapping';
import { UseCaseError } from '../../../../app/exceptions/use-case.error';
import { NotFoundError } from '../../../../app/exceptions/not-found.error';
import { ConflictError } from '../../../../app/exceptions/conflict.error';
import { UnprocessableError } from '../../../../app/exceptions/unprocessable.error';
import { DomainError } from '../../../../domain/exceptions/domain.error';
import { InfraError } from '../../../../infra/exceptions/infra.error';
import { ObjectValidationError } from '../../../../global/exceptions/object-validation.error';
import { InvalidRequestError } from '../../../exceptions/invalid-request.error';
import { AccessDeniedError } from '../../../exceptions/access-denied.error';

describe('mapErrorToEventResult', () => {
  describe('DLQ errors (permanent failures)', () => {
    it('maps ObjectValidationError to dlq', () => {
      const result = mapErrorToEventResult(
        new ObjectValidationError({
          message: 'Validation failed',
          validationErrors: [{ field: 'name', message: 'required' }],
        }),
      );
      expect(result.outcome).toBe('dlq');
    });

    it('maps InvalidRequestError to dlq', () => {
      const result = mapErrorToEventResult(
        new InvalidRequestError({
          message: 'Bad request',
          validationErrors: [{ field: 'body', message: 'invalid' }],
        }),
      );
      expect(result.outcome).toBe('dlq');
    });

    it('maps UseCaseError to dlq', () => {
      const result = mapErrorToEventResult(
        new UseCaseError({ message: 'Business rule violated' }),
      );
      expect(result.outcome).toBe('dlq');
      expect(result).toHaveProperty('reason', 'Business rule violated');
    });

    it('maps DomainError to dlq', () => {
      const result = mapErrorToEventResult(
        new DomainError({ message: 'Domain invariant violated' }),
      );
      expect(result.outcome).toBe('dlq');
    });

    it('maps UnprocessableError to dlq', () => {
      const result = mapErrorToEventResult(
        new UnprocessableError({ message: 'Cannot process' }),
      );
      expect(result.outcome).toBe('dlq');
    });

    it('maps AccessDeniedError to dlq', () => {
      const result = mapErrorToEventResult(
        new AccessDeniedError({ message: 'No access' }),
      );
      expect(result.outcome).toBe('dlq');
    });
  });

  describe('Retry errors (transient failures)', () => {
    it('maps NotFoundError to retry', () => {
      const result = mapErrorToEventResult(
        new NotFoundError({ message: 'Not found yet' }),
      );
      expect(result.outcome).toBe('retry');
    });

    it('maps ConflictError to retry', () => {
      const result = mapErrorToEventResult(
        new ConflictError({ message: 'Concurrent write' }),
      );
      expect(result.outcome).toBe('retry');
    });

    it('maps InfraError to retry', () => {
      const result = mapErrorToEventResult(
        new InfraError({ message: 'DB connection lost' }),
      );
      expect(result.outcome).toBe('retry');
    });
  });

  describe('Unknown errors', () => {
    it('maps unknown Error to retry', () => {
      const result = mapErrorToEventResult(new Error('something broke'));
      expect(result.outcome).toBe('retry');
      expect(result).toHaveProperty('reason', 'something broke');
    });

    it('maps non-Error to retry with default message', () => {
      const result = mapErrorToEventResult('string error');
      expect(result.outcome).toBe('retry');
      expect(result).toHaveProperty('reason', 'Unknown error occurred during event processing');
    });

    it('maps null/undefined to retry', () => {
      const result = mapErrorToEventResult(null);
      expect(result.outcome).toBe('retry');
    });
  });
});
