import { describe, it, expect, expectTypeOf } from 'vitest';
import { defineRouteContract, isRouteContract } from '../../shared/contracts';
import type { RouteContract } from '../../shared/contracts';

// Test interfaces matching the user's pattern
interface CreateProjectRequestData {
  body: {
    name: string;
    description?: string;
  };
}

interface CreateProjectResponseData {
  statusCode: number;
  body: {
    projectId: string;
  };
}

interface GetProjectRequestData {
  pathParams: {
    projectId: string;
  };
}

interface GetProjectResponseData {
  statusCode: number;
  body: {
    id: string;
    name: string;
    description: string;
  };
}

interface ListProjectsRequestData {
  queryParams: {
    page?: string;
    pageSize?: string;
  };
}

interface ListProjectsResponseData {
  statusCode: number;
  body: {
    items: { id: string; name: string }[];
    total: number;
  };
}

describe('defineRouteContract', () => {
  describe('route creation', () => {
    it('should create a route contract with path and method', () => {
      const route = defineRouteContract<
        '/api/projects',
        'POST',
        CreateProjectRequestData,
        CreateProjectResponseData
      >({
        path: '/api/projects',
        method: 'POST',
      });

      expect(route.path).toBe('/api/projects');
      expect(route.method).toBe('POST');
      expect(route._types).toBeDefined();
    });

    it('should create GET route', () => {
      const route = defineRouteContract<
        '/api/projects/{projectId}',
        'GET',
        GetProjectRequestData,
        GetProjectResponseData
      >({
        path: '/api/projects/{projectId}',
        method: 'GET',
      });

      expect(route.path).toBe('/api/projects/{projectId}');
      expect(route.method).toBe('GET');
    });

    it('should create route with query params', () => {
      const route = defineRouteContract<
        '/api/projects',
        'GET',
        ListProjectsRequestData,
        ListProjectsResponseData
      >({
        path: '/api/projects',
        method: 'GET',
      });

      expect(route.path).toBe('/api/projects');
      expect(route.method).toBe('GET');
    });

    it('should support all HTTP methods', () => {
      const postRoute = defineRouteContract({
        path: '/api/resource',
        method: 'POST',
      });
      expect(postRoute.method).toBe('POST');

      const putRoute = defineRouteContract({
        path: '/api/resource',
        method: 'PUT',
      });
      expect(putRoute.method).toBe('PUT');

      const patchRoute = defineRouteContract({
        path: '/api/resource',
        method: 'PATCH',
      });
      expect(patchRoute.method).toBe('PATCH');

      const deleteRoute = defineRouteContract({
        path: '/api/resource',
        method: 'DELETE',
      });
      expect(deleteRoute.method).toBe('DELETE');

      const getRoute = defineRouteContract({
        path: '/api/resource',
        method: 'GET',
      });
      expect(getRoute.method).toBe('GET');
    });
  });

  describe('type inference', () => {
    it('should infer route type correctly', () => {
      const route = defineRouteContract<
        '/api/projects',
        'POST',
        CreateProjectRequestData,
        CreateProjectResponseData
      >({
        path: '/api/projects',
        method: 'POST',
      });

      // Type-level test - route should be RouteContract with correct generics
      expectTypeOf(route).toMatchTypeOf<
        RouteContract<'/api/projects', 'POST', CreateProjectRequestData, CreateProjectResponseData>
      >();
    });

    it('should preserve path literal type', () => {
      const route = defineRouteContract<'/api/v1/users/{userId}/posts/{postId}', 'GET'>({
        path: '/api/v1/users/{userId}/posts/{postId}',
        method: 'GET',
      });

      // The path should be the exact literal type
      expectTypeOf(route.path).toEqualTypeOf<'/api/v1/users/{userId}/posts/{postId}'>();
    });

    it('should preserve method literal type', () => {
      const route = defineRouteContract<'/api/resource', 'DELETE'>({
        path: '/api/resource',
        method: 'DELETE',
      });

      expectTypeOf(route.method).toEqualTypeOf<'DELETE'>();
    });
  });

  describe('isRouteContract type guard', () => {
    it('should correctly identify RouteContract objects', () => {
      const route = defineRouteContract({
        path: '/api/test',
        method: 'GET',
      });

      expect(isRouteContract(route)).toBe(true);
    });

    it('should return false for non-RouteContract objects', () => {
      expect(isRouteContract(null)).toBe(false);
      expect(isRouteContract(undefined)).toBe(false);
      expect(isRouteContract({})).toBe(false);
      expect(isRouteContract({ path: '/test' })).toBe(false);
      expect(isRouteContract({ method: 'GET' })).toBe(false);
      expect(isRouteContract({ path: '/test', method: 'GET' })).toBe(false);
      expect(isRouteContract('string')).toBe(false);
      expect(isRouteContract(123)).toBe(false);
    });
  });
});
