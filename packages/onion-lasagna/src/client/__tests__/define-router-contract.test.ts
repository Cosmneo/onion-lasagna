import { describe, it, expect, expectTypeOf } from 'vitest';
import { defineRouteContract, defineRouterContract } from '../../shared/contracts';

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
interface CreateTaskRequestData {
  pathParams: { projectId: string };
  body: { title: string };
}
interface CreateTaskResponseData {
  statusCode: number;
  body: { taskId: string };
}

describe('defineRouterContract', () => {
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

  const createTaskRoute = defineRouteContract<
    '/api/projects/{projectId}/tasks',
    'POST',
    CreateTaskRequestData,
    CreateTaskResponseData
  >({
    path: '/api/projects/{projectId}/tasks',
    method: 'POST',
  });

  describe('flat router', () => {
    it('should create a flat router with routes', () => {
      const router = defineRouterContract({
        create: createProjectRoute,
        list: listProjectsRoute,
      });

      expect(router.create).toBe(createProjectRoute);
      expect(router.list).toBe(listProjectsRoute);
    });

    it('should preserve route references', () => {
      const router = defineRouterContract({
        create: createProjectRoute,
      });

      expect(router.create.path).toBe('/api/projects');
      expect(router.create.method).toBe('POST');
    });
  });

  describe('nested router', () => {
    it('should create nested routers', () => {
      const projectsRouter = defineRouterContract({
        create: createProjectRoute,
        list: listProjectsRoute,
      });

      const tasksRouter = defineRouterContract({
        create: createTaskRoute,
      });

      const apiRouter = defineRouterContract({
        projects: projectsRouter,
        tasks: tasksRouter,
      });

      expect(apiRouter.projects.create).toBe(createProjectRoute);
      expect(apiRouter.projects.list).toBe(listProjectsRoute);
      expect(apiRouter.tasks.create).toBe(createTaskRoute);
    });

    it('should allow deeply nested routers', () => {
      const level3 = defineRouterContract({
        create: createProjectRoute,
      });

      const level2 = defineRouterContract({
        nested: level3,
      });

      const level1 = defineRouterContract({
        api: level2,
      });

      expect(level1.api.nested.create.path).toBe('/api/projects');
    });

    it('should allow mixing routes and nested routers', () => {
      const router = defineRouterContract({
        create: createProjectRoute,
        sub: defineRouterContract({
          list: listProjectsRoute,
        }),
      });

      expect(router.create.method).toBe('POST');
      expect(router.sub.list.method).toBe('GET');
    });
  });

  describe('type preservation', () => {
    it('should preserve the exact router type', () => {
      const router = defineRouterContract({
        create: createProjectRoute,
        list: listProjectsRoute,
      });

      // Type-level test - keys should be preserved
      expectTypeOf(router).toHaveProperty('create');
      expectTypeOf(router).toHaveProperty('list');
    });

    it('should preserve nested router types', () => {
      const router = defineRouterContract({
        projects: defineRouterContract({
          create: createProjectRoute,
        }),
      });

      expectTypeOf(router).toHaveProperty('projects');
      expectTypeOf(router.projects).toHaveProperty('create');
    });
  });

  describe('edge cases', () => {
    it('should handle empty router', () => {
      const router = defineRouterContract({});
      expect(Object.keys(router)).toHaveLength(0);
    });

    it('should handle single route router', () => {
      const router = defineRouterContract({
        only: createProjectRoute,
      });

      expect(router.only).toBe(createProjectRoute);
    });
  });
});
