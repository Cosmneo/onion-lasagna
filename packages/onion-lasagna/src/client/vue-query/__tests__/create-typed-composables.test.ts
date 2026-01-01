import { describe, it, expect, vi } from 'vitest';
import { defineRouteContract, defineRouterContract } from '../../../shared/contracts';
import { createTypedComposables } from '../create-typed-composables';

// Mock @tanstack/vue-query
vi.mock('@tanstack/vue-query', () => ({
  useQuery: vi.fn((options) => ({
    data: { value: null },
    isLoading: { value: true },
    error: { value: null },
    queryKey: options.queryKey,
    queryFn: options.queryFn,
  })),
  useMutation: vi.fn((options) => ({
    data: { value: null },
    isLoading: { value: false },
    error: { value: null },
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    mutationFn: options.mutationFn,
  })),
}));

// Test interfaces
interface CreateProjectRequestData {
  body: { name: string };
}

interface CreateProjectResponseData {
  statusCode: number;
  body: { projectId: string };
}

interface ListProjectsRequestData {
  queryParams: { page?: string };
}

interface ListProjectsResponseData {
  statusCode: number;
  body: { items: { id: string }[]; total: number };
}

interface GetProjectRequestData {
  pathParams: { projectId: string };
}

interface GetProjectResponseData {
  statusCode: number;
  body: { id: string; name: string };
}

// Create test routes
const createProjectRoute = defineRouteContract<
  '/api/projects',
  'POST',
  CreateProjectRequestData,
  CreateProjectResponseData
>({
  path: '/api/projects',
  method: 'POST',
});

const listProjectsRoute = defineRouteContract<
  '/api/projects',
  'GET',
  ListProjectsRequestData,
  ListProjectsResponseData
>({
  path: '/api/projects',
  method: 'GET',
});

const getProjectRoute = defineRouteContract<
  '/api/projects/{projectId}',
  'GET',
  GetProjectRequestData,
  GetProjectResponseData
>({
  path: '/api/projects/{projectId}',
  method: 'GET',
});

describe('createTypedComposables', () => {
  describe('composables structure', () => {
    it('should create composables matching router structure', () => {
      const router = defineRouterContract({
        projects: defineRouterContract({
          create: createProjectRoute,
          list: listProjectsRoute,
          get: getProjectRoute,
        }),
      });

      // Mock client matching router structure
      const mockClient = {
        projects: {
          create: vi.fn(),
          list: vi.fn(),
          get: vi.fn(),
        },
      };

      const { composables } = createTypedComposables(mockClient as never, router);

      expect(composables.projects).toBeDefined();
      expect(composables.projects.create).toBeDefined();
      expect(composables.projects.list).toBeDefined();
      expect(composables.projects.get).toBeDefined();
    });

    it('should create useQuery for GET routes', () => {
      const router = defineRouterContract({
        list: listProjectsRoute,
      });

      const mockClient = {
        list: vi.fn(),
      };

      const { composables } = createTypedComposables(mockClient as never, router);

      expect(composables.list.useQuery).toBeDefined();
      expect(typeof composables.list.useQuery).toBe('function');
    });

    it('should create useMutation for POST routes', () => {
      const router = defineRouterContract({
        create: createProjectRoute,
      });

      const mockClient = {
        create: vi.fn(),
      };

      const { composables } = createTypedComposables(mockClient as never, router);

      expect(composables.create.useMutation).toBeDefined();
      expect(typeof composables.create.useMutation).toBe('function');
    });

    it('should handle flat router structure', () => {
      const router = defineRouterContract({
        createProject: createProjectRoute,
        listProjects: listProjectsRoute,
      });

      const mockClient = {
        createProject: vi.fn(),
        listProjects: vi.fn(),
      };

      const { composables } = createTypedComposables(mockClient as never, router);

      expect(composables.createProject.useMutation).toBeDefined();
      expect(composables.listProjects.useQuery).toBeDefined();
    });

    it('should handle deeply nested routers', () => {
      const router = defineRouterContract({
        api: defineRouterContract({
          v1: defineRouterContract({
            projects: defineRouterContract({
              list: listProjectsRoute,
            }),
          }),
        }),
      });

      const mockClient = {
        api: {
          v1: {
            projects: {
              list: vi.fn(),
            },
          },
        },
      };

      const { composables } = createTypedComposables(mockClient as never, router);

      expect(composables.api.v1.projects.list.useQuery).toBeDefined();
    });
  });

  describe('query keys', () => {
    it('should create query key factories for routes', () => {
      const router = defineRouterContract({
        projects: defineRouterContract({
          list: listProjectsRoute,
          get: getProjectRoute,
        }),
      });

      const mockClient = {
        projects: {
          list: vi.fn(),
          get: vi.fn(),
        },
      };

      const { queryKeys } = createTypedComposables(mockClient as never, router);

      expect(queryKeys.projects.list).toBeDefined();
      expect(queryKeys.projects.get).toBeDefined();
      expect(typeof queryKeys.projects.list).toBe('function');
      expect(typeof queryKeys.projects.get).toBe('function');
    });

    it('should generate correct query key without params', () => {
      const router = defineRouterContract({
        projects: defineRouterContract({
          list: listProjectsRoute,
        }),
      });

      const mockClient = {
        projects: {
          list: vi.fn(),
        },
      };

      const { queryKeys } = createTypedComposables(mockClient as never, router);

      const key = queryKeys.projects.list();
      expect(key).toEqual(['projects', 'list']);
    });

    it('should generate correct query key with params', () => {
      const router = defineRouterContract({
        projects: defineRouterContract({
          list: listProjectsRoute,
        }),
      });

      const mockClient = {
        projects: {
          list: vi.fn(),
        },
      };

      const { queryKeys } = createTypedComposables(mockClient as never, router);

      const key = queryKeys.projects.list({ queryParams: { page: '1' } });
      expect(key).toEqual(['projects', 'list', { queryParams: { page: '1' } }]);
    });

    it('should include pathParams in query key', () => {
      const router = defineRouterContract({
        projects: defineRouterContract({
          get: getProjectRoute,
        }),
      });

      const mockClient = {
        projects: {
          get: vi.fn(),
        },
      };

      const { queryKeys } = createTypedComposables(mockClient as never, router);

      const key = queryKeys.projects.get({ pathParams: { projectId: '123' } });
      expect(key).toEqual(['projects', 'get', { pathParams: { projectId: '123' } }]);
    });

    it('should handle nested query keys', () => {
      const router = defineRouterContract({
        api: defineRouterContract({
          projects: defineRouterContract({
            list: listProjectsRoute,
          }),
        }),
      });

      const mockClient = {
        api: {
          projects: {
            list: vi.fn(),
          },
        },
      };

      const { queryKeys } = createTypedComposables(mockClient as never, router);

      const key = queryKeys.api.projects.list();
      expect(key).toEqual(['api', 'projects', 'list']);
    });
  });

  describe('composable invocation', () => {
    it('should call useQuery with correct options for GET routes', () => {
      const router = defineRouterContract({
        list: listProjectsRoute,
      });

      const mockListFn = vi.fn().mockResolvedValue({ items: [], total: 0 });
      const mockClient = {
        list: mockListFn,
      };

      const { composables } = createTypedComposables(mockClient as never, router);

      // Call the composable
      const result = composables.list.useQuery({ queryParams: { page: '1' } });

      // Verify the result has expected shape
      expect(result).toHaveProperty('queryKey');
      expect(result).toHaveProperty('queryFn');
      expect(result.queryKey).toEqual(['list', { queryParams: { page: '1' } }]);
    });

    it('should call useMutation with correct options for POST routes', () => {
      const router = defineRouterContract({
        create: createProjectRoute,
      });

      const mockCreateFn = vi.fn().mockResolvedValue({ projectId: '123' });
      const mockClient = {
        create: mockCreateFn,
      };

      const { composables } = createTypedComposables(mockClient as never, router);

      // Call the composable
      const result = composables.create.useMutation();

      // Verify the result has expected shape
      expect(result).toHaveProperty('mutationFn');
      expect(result.mutationFn).toBe(mockCreateFn);
    });

    it('should pass additional options to useQuery', () => {
      const router = defineRouterContract({
        list: listProjectsRoute,
      });

      const mockClient = {
        list: vi.fn(),
      };

      const { composables } = createTypedComposables(mockClient as never, router);

      // Call with additional options
      const result = composables.list.useQuery(
        { queryParams: { page: '1' } },
        { enabled: false, staleTime: 5000 },
      );

      expect(result).toBeDefined();
    });

    it('should pass additional options to useMutation', () => {
      const router = defineRouterContract({
        create: createProjectRoute,
      });

      const mockClient = {
        create: vi.fn(),
      };

      const { composables } = createTypedComposables(mockClient as never, router);

      const onSuccessMock = vi.fn();

      // Call with additional options
      const result = composables.create.useMutation({
        onSuccess: onSuccessMock,
      });

      expect(result).toBeDefined();
    });
  });

  describe('HTTP method mapping', () => {
    it('should create useMutation for PUT routes', () => {
      const updateRoute = defineRouteContract<
        '/api/projects/{projectId}',
        'PUT',
        { pathParams: { projectId: string }; body: { name: string } },
        { statusCode: number; body: null }
      >({
        path: '/api/projects/{projectId}',
        method: 'PUT',
      });

      const router = defineRouterContract({
        update: updateRoute,
      });

      const mockClient = {
        update: vi.fn(),
      };

      const { composables } = createTypedComposables(mockClient as never, router);

      expect(composables.update.useMutation).toBeDefined();
      expect((composables.update as { useQuery?: unknown }).useQuery).toBeUndefined();
    });

    it('should create useMutation for PATCH routes', () => {
      const patchRoute = defineRouteContract<
        '/api/projects/{projectId}',
        'PATCH',
        { pathParams: { projectId: string }; body: { name?: string } },
        { statusCode: number; body: null }
      >({
        path: '/api/projects/{projectId}',
        method: 'PATCH',
      });

      const router = defineRouterContract({
        patch: patchRoute,
      });

      const mockClient = {
        patch: vi.fn(),
      };

      const { composables } = createTypedComposables(mockClient as never, router);

      expect(composables.patch.useMutation).toBeDefined();
    });

    it('should create useMutation for DELETE routes', () => {
      const deleteRoute = defineRouteContract<
        '/api/projects/{projectId}',
        'DELETE',
        { pathParams: { projectId: string } },
        { statusCode: number; body: null }
      >({
        path: '/api/projects/{projectId}',
        method: 'DELETE',
      });

      const router = defineRouterContract({
        delete: deleteRoute,
      });

      const mockClient = {
        delete: vi.fn(),
      };

      const { composables } = createTypedComposables(mockClient as never, router);

      expect(composables.delete.useMutation).toBeDefined();
    });
  });
});
