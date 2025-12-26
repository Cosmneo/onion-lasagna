import { describe, it, expect, vi } from 'vitest';
import { GuardedController } from '../guarded-controller.class';
import { BaseDto, SKIP_DTO_VALIDATION } from '../../../../global/classes/base-dto.class';
import type { BaseInboundPort } from '../../../app/interfaces/ports/base-inbound.port';
import { AccessDeniedError } from '../../exceptions/access-denied.error';
import type { AccessGuard } from '../../interfaces/types/access-guard.type';

// Test DTOs
class RequestDto extends BaseDto<{ userId: string; role: string }> {
  static create(data: { userId: string; role: string }): RequestDto {
    return new RequestDto(data, SKIP_DTO_VALIDATION);
  }

  get userId(): string {
    return this.data.userId;
  }

  get role(): string {
    return this.data.role;
  }
}

class InputDto extends BaseDto<{ userId: string }> {
  static create(data: { userId: string }): InputDto {
    return new InputDto(data, SKIP_DTO_VALIDATION);
  }
}

class OutputDto extends BaseDto<{ result: string }> {
  static create(data: { result: string }): OutputDto {
    return new OutputDto(data, SKIP_DTO_VALIDATION);
  }
}

class ResponseDto extends BaseDto<{ message: string }> {
  static create(data: { message: string }): ResponseDto {
    return new ResponseDto(data, SKIP_DTO_VALIDATION);
  }
}

// Mock use case
function createMockUseCase(): BaseInboundPort<InputDto, OutputDto> {
  return {
    execute: vi.fn().mockResolvedValue(OutputDto.create({ result: 'success' })),
  };
}

describe('GuardedController', () => {
  describe('create factory', () => {
    it('should create controller from config', async () => {
      const useCase = createMockUseCase();
      const controller = GuardedController.create({
        requestMapper: (req) => InputDto.create({ userId: req.data.userId }),
        useCase,
        responseMapper: (out) => ResponseDto.create({ message: out.data.result }),
      });

      const request = RequestDto.create({ userId: 'user-123', role: 'admin' });
      const response = await controller.execute(request);

      expect(response.data.message).toBe('success');
    });

    it('should accept access guard in config', async () => {
      const accessGuard: AccessGuard<RequestDto> = vi.fn().mockResolvedValue({ isAllowed: true });
      const controller = GuardedController.create({
        requestMapper: (req) => InputDto.create({ userId: req.data.userId }),
        useCase: createMockUseCase(),
        responseMapper: (out) => ResponseDto.create({ message: out.data.result }),
        accessGuard,
      });

      const request = RequestDto.create({ userId: 'user-123', role: 'admin' });
      await controller.execute(request);

      expect(accessGuard).toHaveBeenCalledWith(request);
    });
  });

  describe('access guard', () => {
    describe('when access is allowed', () => {
      it('should execute use case when guard allows', async () => {
        const useCase = createMockUseCase();
        const controller = GuardedController.create({
          requestMapper: (req) => InputDto.create({ userId: req.data.userId }),
          useCase,
          responseMapper: (out) => ResponseDto.create({ message: out.data.result }),
          accessGuard: async () => ({ isAllowed: true }),
        });

        const request = RequestDto.create({ userId: 'user-123', role: 'admin' });
        await controller.execute(request);

        expect(useCase.execute).toHaveBeenCalled();
      });

      it('should return response when guard allows', async () => {
        const controller = GuardedController.create({
          requestMapper: (req) => InputDto.create({ userId: req.data.userId }),
          useCase: createMockUseCase(),
          responseMapper: (out) => ResponseDto.create({ message: out.data.result }),
          accessGuard: async () => ({ isAllowed: true }),
        });

        const request = RequestDto.create({ userId: 'user-123', role: 'admin' });
        const response = await controller.execute(request);

        expect(response.data.message).toBe('success');
      });
    });

    describe('when access is denied', () => {
      it('should throw AccessDeniedError when guard denies', async () => {
        const controller = GuardedController.create({
          requestMapper: (req) => InputDto.create({ userId: req.data.userId }),
          useCase: createMockUseCase(),
          responseMapper: (out) => ResponseDto.create({ message: out.data.result }),
          accessGuard: async () => ({ isAllowed: false }),
        });

        const request = RequestDto.create({ userId: 'user-123', role: 'user' });

        await expect(controller.execute(request)).rejects.toThrow(AccessDeniedError);
      });

      it('should include reason in AccessDeniedError when provided', async () => {
        const controller = GuardedController.create({
          requestMapper: (req) => InputDto.create({ userId: req.data.userId }),
          useCase: createMockUseCase(),
          responseMapper: (out) => ResponseDto.create({ message: out.data.result }),
          accessGuard: async () => ({
            isAllowed: false,
            reason: 'Admin access required',
          }),
        });

        const request = RequestDto.create({ userId: 'user-123', role: 'user' });

        try {
          await controller.execute(request);
        } catch (error) {
          expect(error).toBeInstanceOf(AccessDeniedError);
          expect((error as AccessDeniedError).message).toBe('Admin access required');
        }
      });

      it('should use default message when no reason provided', async () => {
        const controller = GuardedController.create({
          requestMapper: (req) => InputDto.create({ userId: req.data.userId }),
          useCase: createMockUseCase(),
          responseMapper: (out) => ResponseDto.create({ message: out.data.result }),
          accessGuard: async () => ({ isAllowed: false }),
        });

        const request = RequestDto.create({ userId: 'user-123', role: 'user' });

        try {
          await controller.execute(request);
        } catch (error) {
          expect((error as AccessDeniedError).message).toBe('Access denied');
        }
      });

      it('should not call use case when access denied', async () => {
        const useCase = createMockUseCase();
        const controller = GuardedController.create({
          requestMapper: (req) => InputDto.create({ userId: req.data.userId }),
          useCase,
          responseMapper: (out) => ResponseDto.create({ message: out.data.result }),
          accessGuard: async () => ({ isAllowed: false }),
        });

        const request = RequestDto.create({ userId: 'user-123', role: 'user' });

        try {
          await controller.execute(request);
        } catch {
          // Expected
        }

        expect(useCase.execute).not.toHaveBeenCalled();
      });
    });

    describe('default access guard', () => {
      it('should allow all requests by default when no guard provided', async () => {
        const useCase = createMockUseCase();
        const controller = GuardedController.create({
          requestMapper: (req) => InputDto.create({ userId: req.data.userId }),
          useCase,
          responseMapper: (out) => ResponseDto.create({ message: out.data.result }),
        });

        const request = RequestDto.create({ userId: 'user-123', role: 'any' });
        await controller.execute(request);

        expect(useCase.execute).toHaveBeenCalled();
      });
    });

    describe('guard with request inspection', () => {
      it('should pass request to guard for inspection', async () => {
        const accessGuard: AccessGuard<RequestDto> = vi.fn().mockImplementation(async (req) => ({
          isAllowed: req.data.role === 'admin',
          reason: req.data.role !== 'admin' ? 'Admin only' : undefined,
        }));

        const controller = GuardedController.create({
          requestMapper: (req) => InputDto.create({ userId: req.data.userId }),
          useCase: createMockUseCase(),
          responseMapper: (out) => ResponseDto.create({ message: out.data.result }),
          accessGuard,
        });

        // Admin should be allowed
        const adminRequest = RequestDto.create({ userId: 'admin-1', role: 'admin' });
        await expect(controller.execute(adminRequest)).resolves.toBeDefined();

        // Non-admin should be denied
        const userRequest = RequestDto.create({ userId: 'user-1', role: 'user' });
        await expect(controller.execute(userRequest)).rejects.toThrow(AccessDeniedError);
      });
    });
  });

  describe('inheritance from BaseController', () => {
    it('should run full pipeline when access allowed', async () => {
      const requestMapper = vi.fn((req: RequestDto) =>
        InputDto.create({ userId: req.data.userId }),
      );
      const responseMapper = vi.fn((out: OutputDto) =>
        ResponseDto.create({ message: out.data.result }),
      );
      const useCase = createMockUseCase();

      const controller = GuardedController.create({
        requestMapper,
        useCase,
        responseMapper,
        accessGuard: async () => ({ isAllowed: true }),
      });

      const request = RequestDto.create({ userId: 'user-123', role: 'admin' });
      await controller.execute(request);

      expect(requestMapper).toHaveBeenCalled();
      expect(useCase.execute).toHaveBeenCalled();
      expect(responseMapper).toHaveBeenCalled();
    });
  });

  describe('constructor usage', () => {
    it('should work with direct constructor', async () => {
      const useCase = createMockUseCase();
      const accessGuard: AccessGuard<RequestDto> = async () => ({ isAllowed: true });

      const controller = new GuardedController(
        (req: RequestDto) => InputDto.create({ userId: req.data.userId }),
        useCase,
        (out: OutputDto) => ResponseDto.create({ message: out.data.result }),
        accessGuard,
      );

      const request = RequestDto.create({ userId: 'user-123', role: 'admin' });
      const response = await controller.execute(request);

      expect(response.data.message).toBe('success');
    });

    it('should work without access guard in constructor', async () => {
      const useCase = createMockUseCase();

      const controller = new GuardedController(
        (req: RequestDto) => InputDto.create({ userId: req.data.userId }),
        useCase,
        (out: OutputDto) => ResponseDto.create({ message: out.data.result }),
      );

      const request = RequestDto.create({ userId: 'user-123', role: 'any' });
      await expect(controller.execute(request)).resolves.toBeDefined();
    });
  });
});
