/**
 * @fileoverview Tests for GraphQL error mapping.
 */

import { describe, it, expect } from 'vitest';
import {
  mapErrorToGraphQLError,
  getGraphQLErrorCode,
  shouldMaskGraphQLError,
} from '../error-mapping';
import { ObjectValidationError } from '../../../../global/exceptions/object-validation.error';
import { UseCaseError } from '../../../../app/exceptions/use-case.error';
import { NotFoundError } from '../../../../app/exceptions/not-found.error';
import { ConflictError } from '../../../../app/exceptions/conflict.error';
import { UnprocessableError } from '../../../../app/exceptions/unprocessable.error';
import { ForbiddenError } from '../../../../app/exceptions/forbidden.error';
import { UnauthorizedError } from '../../../../app/exceptions/unauthorized.error';
import { DomainError } from '../../../../domain/exceptions/domain.error';
import { InfraError } from '../../../../infra/exceptions/infra.error';
import { AccessDeniedError } from '../../../exceptions/access-denied.error';

describe('getGraphQLErrorCode', () => {
  it('maps ObjectValidationError to VALIDATION_ERROR', () => {
    const error = new ObjectValidationError({
      message: 'Invalid',
      validationErrors: [{ field: 'name', message: 'required' }],
    });
    expect(getGraphQLErrorCode(error)).toBe('VALIDATION_ERROR');
  });

  it('maps UnauthorizedError to FORBIDDEN', () => {
    expect(getGraphQLErrorCode(new UnauthorizedError({ message: 'No auth' }))).toBe('FORBIDDEN');
  });

  it('maps ForbiddenError to FORBIDDEN', () => {
    expect(getGraphQLErrorCode(new ForbiddenError({ message: 'No access' }))).toBe('FORBIDDEN');
  });

  it('maps AccessDeniedError to FORBIDDEN', () => {
    expect(getGraphQLErrorCode(new AccessDeniedError({ message: 'Denied' }))).toBe('FORBIDDEN');
  });

  it('maps NotFoundError to NOT_FOUND', () => {
    expect(getGraphQLErrorCode(new NotFoundError({ message: 'Missing' }))).toBe('NOT_FOUND');
  });

  it('maps ConflictError to CONFLICT', () => {
    expect(getGraphQLErrorCode(new ConflictError({ message: 'Duplicate' }))).toBe('CONFLICT');
  });

  it('maps UnprocessableError to UNPROCESSABLE', () => {
    expect(getGraphQLErrorCode(new UnprocessableError({ message: 'Cannot process' }))).toBe(
      'UNPROCESSABLE',
    );
  });

  it('maps UseCaseError to BAD_REQUEST', () => {
    expect(getGraphQLErrorCode(new UseCaseError({ message: 'Bad' }))).toBe('BAD_REQUEST');
  });

  it('maps unknown errors to INTERNAL_ERROR', () => {
    expect(getGraphQLErrorCode(new Error('unknown'))).toBe('INTERNAL_ERROR');
  });
});

describe('shouldMaskGraphQLError', () => {
  it('masks DomainError', () => {
    expect(shouldMaskGraphQLError(new DomainError({ message: 'internal' }))).toBe(true);
  });

  it('masks InfraError', () => {
    expect(shouldMaskGraphQLError(new InfraError({ message: 'db failed' }))).toBe(true);
  });

  it('does not mask UseCaseError', () => {
    expect(shouldMaskGraphQLError(new UseCaseError({ message: 'bad request' }))).toBe(false);
  });

  it('does not mask NotFoundError', () => {
    expect(shouldMaskGraphQLError(new NotFoundError({ message: 'missing' }))).toBe(false);
  });
});

describe('mapErrorToGraphQLError', () => {
  it('maps ObjectValidationError with field details', () => {
    const error = new ObjectValidationError({
      message: 'Validation failed',
      validationErrors: [
        { field: 'input.name', message: 'Required' },
        { field: 'input.email', message: 'Invalid format' },
      ],
    });

    const result = mapErrorToGraphQLError(error);

    expect(result.message).toBe('Validation failed');
    expect(result.extensions.code).toBe('VALIDATION_ERROR');
    expect(result.extensions.validationErrors).toEqual([
      { field: 'input.name', message: 'Required' },
      { field: 'input.email', message: 'Invalid format' },
    ]);
  });

  it('maps UseCaseError with message', () => {
    const result = mapErrorToGraphQLError(new UseCaseError({ message: 'Business rule violated' }));

    expect(result.message).toBe('Business rule violated');
    expect(result.extensions.code).toBe('BAD_REQUEST');
  });

  it('masks DomainError', () => {
    const result = mapErrorToGraphQLError(new DomainError({ message: 'secret internal info' }));

    expect(result.message).toBe('An unexpected error occurred');
    expect(result.extensions.code).toBe('INTERNAL_ERROR');
    expect(result.extensions.validationErrors).toBeUndefined();
  });

  it('masks InfraError', () => {
    const result = mapErrorToGraphQLError(new InfraError({ message: 'db connection string' }));

    expect(result.message).toBe('An unexpected error occurred');
    expect(result.extensions.code).toBe('INTERNAL_ERROR');
  });

  it('masks unknown errors', () => {
    const result = mapErrorToGraphQLError(new Error('something broke'));

    expect(result.message).toBe('An unexpected error occurred');
    expect(result.extensions.code).toBe('INTERNAL_ERROR');
  });

  it('maps NotFoundError with message', () => {
    const result = mapErrorToGraphQLError(new NotFoundError({ message: 'User not found' }));

    expect(result.message).toBe('User not found');
    expect(result.extensions.code).toBe('NOT_FOUND');
  });
});
