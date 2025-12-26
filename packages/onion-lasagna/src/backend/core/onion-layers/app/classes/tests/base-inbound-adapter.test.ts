import { describe, it, expect } from 'vitest';
import { BaseInboundAdapter } from '../base-inbound-adapter.class';
import { BaseDto, SKIP_DTO_VALIDATION } from '../../../../global/classes/base-dto.class';
import { UseCaseError } from '../../exceptions/use-case.error';
import { DomainError } from '../../../domain/exceptions/domain.error';
import { InfraError } from '../../../infra/exceptions/infra.error';
import { ObjectValidationError } from '../../../../global/exceptions/object-validation.error';

// Test DTOs
class InputDto extends BaseDto<{ name: string }> {
  static create(data: { name: string }): InputDto {
    return new InputDto(data, SKIP_DTO_VALIDATION);
  }

  get name(): string {
    return this.data.name;
  }
}

class OutputDto extends BaseDto<{ id: string; name: string }> {
  static create(data: { id: string; name: string }): OutputDto {
    return new OutputDto(data, SKIP_DTO_VALIDATION);
  }
}

// Concrete test implementations
class SuccessfulUseCase extends BaseInboundAdapter<InputDto, OutputDto> {
  protected async handle(input: InputDto): Promise<OutputDto> {
    return OutputDto.create({ id: 'generated-id', name: input.name });
  }
}

class FailingUseCase extends BaseInboundAdapter<InputDto, OutputDto> {
  constructor(private error: Error) {
    super();
  }

  protected async handle(_input: InputDto): Promise<OutputDto> {
    throw this.error;
  }
}

class SyncErrorUseCase extends BaseInboundAdapter<InputDto, OutputDto> {
  protected handle(_input: InputDto): Promise<OutputDto> {
    throw new Error('Synchronous error');
  }
}

describe('BaseInboundAdapter', () => {
  describe('execute', () => {
    it('should execute handle and return result', async () => {
      const useCase = new SuccessfulUseCase();
      const input = InputDto.create({ name: 'Test User' });

      const result = await useCase.execute(input);

      expect(result.data).toEqual({ id: 'generated-id', name: 'Test User' });
    });

    it('should pass input to handle method', async () => {
      const useCase = new SuccessfulUseCase();
      const input = InputDto.create({ name: 'Custom Name' });

      const result = await useCase.execute(input);

      expect(result.data.name).toBe('Custom Name');
    });
  });

  describe('error handling', () => {
    describe('passthrough errors', () => {
      it('should re-throw UseCaseError without wrapping', async () => {
        const originalError = new UseCaseError({ message: 'Use case failed', code: 'TEST_ERROR' });
        const useCase = new FailingUseCase(originalError);
        const input = InputDto.create({ name: 'Test' });

        await expect(useCase.execute(input)).rejects.toThrow(originalError);
      });

      it('should re-throw DomainError without wrapping', async () => {
        const originalError = new DomainError({ message: 'Domain rule violated' });
        const useCase = new FailingUseCase(originalError);
        const input = InputDto.create({ name: 'Test' });

        await expect(useCase.execute(input)).rejects.toThrow(originalError);
      });

      it('should re-throw InfraError without wrapping', async () => {
        const originalError = new InfraError({ message: 'Infrastructure failed' });
        const useCase = new FailingUseCase(originalError);
        const input = InputDto.create({ name: 'Test' });

        await expect(useCase.execute(input)).rejects.toThrow(originalError);
      });

      it('should re-throw ObjectValidationError without wrapping', async () => {
        const originalError = new ObjectValidationError({
          message: 'Validation failed',
          validationErrors: [{ field: 'field', message: 'required' }],
        });
        const useCase = new FailingUseCase(originalError);
        const input = InputDto.create({ name: 'Test' });

        await expect(useCase.execute(input)).rejects.toThrow(originalError);
      });
    });

    describe('wrapped errors', () => {
      it('should wrap unknown errors in UseCaseError', async () => {
        const unknownError = new Error('Something unexpected');
        const useCase = new FailingUseCase(unknownError);
        const input = InputDto.create({ name: 'Test' });

        await expect(useCase.execute(input)).rejects.toThrow(UseCaseError);
      });

      it('should preserve original error as cause', async () => {
        const unknownError = new Error('Original error');
        const useCase = new FailingUseCase(unknownError);
        const input = InputDto.create({ name: 'Test' });

        try {
          await useCase.execute(input);
        } catch (error) {
          expect(error).toBeInstanceOf(UseCaseError);
          expect((error as UseCaseError).cause).toBe(unknownError);
        }
      });

      it('should wrap TypeError', async () => {
        const typeError = new TypeError('Cannot read property');
        const useCase = new FailingUseCase(typeError);
        const input = InputDto.create({ name: 'Test' });

        await expect(useCase.execute(input)).rejects.toThrow(UseCaseError);
      });

      it('should wrap RangeError', async () => {
        const rangeError = new RangeError('Value out of range');
        const useCase = new FailingUseCase(rangeError);
        const input = InputDto.create({ name: 'Test' });

        await expect(useCase.execute(input)).rejects.toThrow(UseCaseError);
      });
    });

    describe('synchronous errors in handle', () => {
      it('should handle synchronous throws in async method', async () => {
        const useCase = new SyncErrorUseCase();
        const input = InputDto.create({ name: 'Test' });

        await expect(useCase.execute(input)).rejects.toThrow(UseCaseError);
      });
    });
  });

  describe('BaseInboundPort interface', () => {
    it('should implement execute method', () => {
      const useCase = new SuccessfulUseCase();

      expect(typeof useCase.execute).toBe('function');
    });
  });

  describe('subclass error hierarchy preservation', () => {
    it('should preserve ConflictError', async () => {
      const { ConflictError } = await import('../../exceptions/conflict.error');
      const conflictError = new ConflictError({ message: 'Already exists' });
      const useCase = new FailingUseCase(conflictError);
      const input = InputDto.create({ name: 'Test' });

      await expect(useCase.execute(input)).rejects.toThrow(conflictError);
    });

    it('should preserve NotFoundError', async () => {
      const { NotFoundError } = await import('../../exceptions/not-found.error');
      const notFoundError = new NotFoundError({ message: 'Not found' });
      const useCase = new FailingUseCase(notFoundError);
      const input = InputDto.create({ name: 'Test' });

      await expect(useCase.execute(input)).rejects.toThrow(notFoundError);
    });

    it('should preserve UnprocessableError', async () => {
      const { UnprocessableError } = await import('../../exceptions/unprocessable.error');
      const unprocessableError = new UnprocessableError({ message: 'Cannot process' });
      const useCase = new FailingUseCase(unprocessableError);
      const input = InputDto.create({ name: 'Test' });

      await expect(useCase.execute(input)).rejects.toThrow(unprocessableError);
    });
  });
});
