import { describe, it, expect, vi } from 'vitest';
import { BaseController } from '../base-controller.class';
import { BaseDto, SKIP_DTO_VALIDATION } from '../../../../global/classes/base-dto.class';
import type { BaseInboundPort } from '../../../app/interfaces/ports/base-inbound.port';
import { ControllerError } from '../../exceptions/controller.error';
import { ObjectValidationError } from '../../../../global/exceptions/object-validation.error';
import { UseCaseError } from '../../../app/exceptions/use-case.error';

// Test DTOs
class RequestDto extends BaseDto<{ name: string; email: string }> {
  static create(data: { name: string; email: string }): RequestDto {
    return new RequestDto(data, SKIP_DTO_VALIDATION);
  }
}

class InputDto extends BaseDto<{ name: string; email: string }> {
  static create(data: { name: string; email: string }): InputDto {
    return new InputDto(data, SKIP_DTO_VALIDATION);
  }
}

class OutputDto extends BaseDto<{ id: string; name: string }> {
  static create(data: { id: string; name: string }): OutputDto {
    return new OutputDto(data, SKIP_DTO_VALIDATION);
  }
}

class ResponseDto extends BaseDto<{ userId: string; displayName: string }> {
  static create(data: { userId: string; displayName: string }): ResponseDto {
    return new ResponseDto(data, SKIP_DTO_VALIDATION);
  }
}

// Mock use case
function createMockUseCase(
  result?: OutputDto,
  error?: Error,
): BaseInboundPort<InputDto, OutputDto> {
  return {
    execute: vi.fn().mockImplementation(async () => {
      if (error) throw error;
      return result ?? OutputDto.create({ id: 'generated-id', name: 'Test User' });
    }),
  };
}

describe('BaseController', () => {
  describe('create factory', () => {
    it('should create controller from config', async () => {
      const useCase = createMockUseCase();
      const controller = BaseController.create({
        requestMapper: (req) => InputDto.create(req.data),
        useCase,
        responseMapper: (out) =>
          ResponseDto.create({ userId: out.data.id, displayName: out.data.name }),
      });

      const request = RequestDto.create({ name: 'John', email: 'john@example.com' });
      const response = await controller.execute(request);

      expect(response.data.userId).toBe('generated-id');
      expect(response.data.displayName).toBe('Test User');
    });
  });

  describe('execute', () => {
    it('should run full pipeline: requestMapper -> useCase -> responseMapper', async () => {
      const requestMapper = vi.fn((req: RequestDto) => InputDto.create(req.data));
      const useCase = createMockUseCase();
      const responseMapper = vi.fn((out: OutputDto) =>
        ResponseDto.create({ userId: out.data.id, displayName: out.data.name }),
      );

      const controller = BaseController.create({
        requestMapper,
        useCase,
        responseMapper,
      });

      const request = RequestDto.create({ name: 'Jane', email: 'jane@example.com' });
      await controller.execute(request);

      expect(requestMapper).toHaveBeenCalledWith(request);
      expect(useCase.execute).toHaveBeenCalled();
      expect(responseMapper).toHaveBeenCalled();
    });

    it('should return response DTO', async () => {
      const controller = BaseController.create({
        requestMapper: (req) => InputDto.create(req.data),
        useCase: createMockUseCase(OutputDto.create({ id: 'abc123', name: 'Custom Name' })),
        responseMapper: (out) =>
          ResponseDto.create({ userId: out.data.id, displayName: out.data.name }),
      });

      const request = RequestDto.create({ name: 'Test', email: 'test@example.com' });
      const response = await controller.execute(request);

      expect(response).toBeInstanceOf(ResponseDto);
      expect(response.data).toEqual({ userId: 'abc123', displayName: 'Custom Name' });
    });
  });

  describe('error handling', () => {
    describe('ObjectValidationError passthrough', () => {
      it('should pass through ObjectValidationError from requestMapper', async () => {
        // ObjectValidationError extends CodedError, so it passes through without conversion
        const controller = BaseController.create({
          requestMapper: () => {
            throw new ObjectValidationError({
              message: 'Validation failed',
              validationErrors: [{ path: 'email', message: 'Invalid email' }],
            });
          },
          useCase: createMockUseCase(),
          responseMapper: (out) =>
            ResponseDto.create({ userId: out.data.id, displayName: out.data.name }),
        });

        const request = RequestDto.create({ name: 'Test', email: 'invalid' });

        await expect(controller.execute(request)).rejects.toThrow(ObjectValidationError);
      });

      it('should preserve validation errors on passthrough', async () => {
        const validationErrors = [
          { path: 'email', message: 'Invalid format' },
          { path: 'name', message: 'Required' },
        ];

        const controller = BaseController.create({
          requestMapper: () => {
            throw new ObjectValidationError({
              message: 'Multiple validation errors',
              validationErrors,
            });
          },
          useCase: createMockUseCase(),
          responseMapper: (out) =>
            ResponseDto.create({ userId: out.data.id, displayName: out.data.name }),
        });

        const request = RequestDto.create({ name: '', email: 'bad' });

        try {
          await controller.execute(request);
        } catch (error) {
          expect(error).toBeInstanceOf(ObjectValidationError);
          expect((error as ObjectValidationError).validationErrors).toEqual(validationErrors);
        }
      });
    });

    describe('CodedError passthrough', () => {
      it('should pass through UseCaseError', async () => {
        const useCaseError = new UseCaseError({ message: 'Use case failed', code: 'UC_ERROR' });

        const controller = BaseController.create({
          requestMapper: (req) => InputDto.create(req.data),
          useCase: createMockUseCase(undefined, useCaseError),
          responseMapper: (out) =>
            ResponseDto.create({ userId: out.data.id, displayName: out.data.name }),
        });

        const request = RequestDto.create({ name: 'Test', email: 'test@example.com' });

        await expect(controller.execute(request)).rejects.toThrow(useCaseError);
      });

      it('should pass through ControllerError', async () => {
        const controllerError = new ControllerError({ message: 'Controller failed' });

        const controller = BaseController.create({
          requestMapper: () => {
            throw controllerError;
          },
          useCase: createMockUseCase(),
          responseMapper: (out) =>
            ResponseDto.create({ userId: out.data.id, displayName: out.data.name }),
        });

        const request = RequestDto.create({ name: 'Test', email: 'test@example.com' });

        await expect(controller.execute(request)).rejects.toThrow(controllerError);
      });
    });

    describe('unknown error wrapping', () => {
      it('should wrap unknown errors in ControllerError', async () => {
        const controller = BaseController.create({
          requestMapper: () => {
            throw new Error('Unexpected error');
          },
          useCase: createMockUseCase(),
          responseMapper: (out) =>
            ResponseDto.create({ userId: out.data.id, displayName: out.data.name }),
        });

        const request = RequestDto.create({ name: 'Test', email: 'test@example.com' });

        await expect(controller.execute(request)).rejects.toThrow(ControllerError);
      });

      it('should preserve error message in wrapped error', async () => {
        const controller = BaseController.create({
          requestMapper: () => {
            throw new TypeError('Type mismatch');
          },
          useCase: createMockUseCase(),
          responseMapper: (out) =>
            ResponseDto.create({ userId: out.data.id, displayName: out.data.name }),
        });

        const request = RequestDto.create({ name: 'Test', email: 'test@example.com' });

        try {
          await controller.execute(request);
        } catch (error) {
          expect(error).toBeInstanceOf(ControllerError);
          expect((error as ControllerError).message).toBe('Type mismatch');
        }
      });
    });

    describe('responseMapper errors', () => {
      it('should wrap responseMapper errors in ControllerError', async () => {
        const controller = BaseController.create({
          requestMapper: (req) => InputDto.create(req.data),
          useCase: createMockUseCase(),
          responseMapper: () => {
            throw new Error('Response mapping failed');
          },
        });

        const request = RequestDto.create({ name: 'Test', email: 'test@example.com' });

        await expect(controller.execute(request)).rejects.toThrow(ControllerError);
      });

      it('should pass through ObjectValidationError in responseMapper', async () => {
        // ObjectValidationError extends CodedError, so it passes through
        const controller = BaseController.create({
          requestMapper: (req) => InputDto.create(req.data),
          useCase: createMockUseCase(),
          responseMapper: () => {
            throw new ObjectValidationError({
              message: 'Response validation failed',
              validationErrors: [{ path: 'userId', message: 'Invalid' }],
            });
          },
        });

        const request = RequestDto.create({ name: 'Test', email: 'test@example.com' });

        try {
          await controller.execute(request);
        } catch (error) {
          expect(error).toBeInstanceOf(ObjectValidationError);
          expect((error as ObjectValidationError).message).toBe('Response validation failed');
        }
      });
    });
  });

  describe('constructor usage', () => {
    it('should work with direct constructor', async () => {
      const useCase = createMockUseCase();

      const controller = new BaseController(
        (req: RequestDto) => InputDto.create(req.data),
        useCase,
        (out: OutputDto) => ResponseDto.create({ userId: out.data.id, displayName: out.data.name }),
      );

      const request = RequestDto.create({ name: 'Direct', email: 'direct@example.com' });
      const response = await controller.execute(request);

      expect(response.data.userId).toBe('generated-id');
    });
  });
});
