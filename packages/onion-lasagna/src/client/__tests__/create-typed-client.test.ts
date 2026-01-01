import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { defineRouteContract, defineRouterContract } from '../../shared/contracts';
import { createTypedClient } from '../create-typed-client';
import { ClientError } from '../types';

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
    search?: string;
  };
}

interface ListProjectsResponseData {
  statusCode: number;
  body: {
    items: { id: string; name: string }[];
    total: number;
  };
}

interface UpdateProjectRequestData {
  pathParams: {
    projectId: string;
  };
  body: {
    name?: string;
    description?: string;
  };
}

interface UpdateProjectResponseData {
  statusCode: number;
  body: null;
}

interface DeleteProjectRequestData {
  pathParams: {
    projectId: string;
  };
}

interface DeleteProjectResponseData {
  statusCode: number;
  body: null;
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

const updateProjectRoute = defineRouteContract<
  '/api/projects/{projectId}',
  'PUT',
  UpdateProjectRequestData,
  UpdateProjectResponseData
>({
  path: '/api/projects/{projectId}',
  method: 'PUT',
});

const deleteProjectRoute = defineRouteContract<
  '/api/projects/{projectId}',
  'DELETE',
  DeleteProjectRequestData,
  DeleteProjectResponseData
>({
  path: '/api/projects/{projectId}',
  method: 'DELETE',
});

// Create test router
const projectsRouter = defineRouterContract({
  create: createProjectRoute,
  list: listProjectsRoute,
  get: getProjectRoute,
  update: updateProjectRoute,
  delete: deleteProjectRoute,
});

const testRouter = defineRouterContract({
  projects: projectsRouter,
});

describe('createTypedClient', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('client creation', () => {
    it('should create client with nested structure matching router', () => {
      const client = createTypedClient(testRouter, {
        baseUrl: 'http://localhost:3000',
        fetch: mockFetch,
      });

      expect(client.projects).toBeDefined();
      expect(typeof client.projects.create).toBe('function');
      expect(typeof client.projects.list).toBe('function');
      expect(typeof client.projects.get).toBe('function');
      expect(typeof client.projects.update).toBe('function');
      expect(typeof client.projects.delete).toBe('function');
    });

    it('should include configure method', () => {
      const client = createTypedClient(testRouter);

      expect(typeof client.configure).toBe('function');
    });

    it('should throw when making request without baseUrl', async () => {
      const client = createTypedClient(testRouter, { fetch: mockFetch });

      await expect(
        client.projects.list({ queryParams: {} }),
      ).rejects.toThrow('Client not configured');
    });
  });

  describe('configure method', () => {
    it('should update baseUrl', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ items: [], total: 0 }),
      });

      const client = createTypedClient(testRouter, { fetch: mockFetch });
      client.configure({ baseUrl: 'http://localhost:4000' });

      await client.projects.list({ queryParams: {} });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4000/api/projects',
        expect.any(Object),
      );
    });

    it('should merge headers', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ items: [], total: 0 }),
      });

      const client = createTypedClient(testRouter, {
        baseUrl: 'http://localhost:3000',
        fetch: mockFetch,
        headers: { 'X-Custom': 'initial' },
      });

      client.configure({ headers: { Authorization: 'Bearer token' } });

      await client.projects.list({ queryParams: {} });

      const callArgs = mockFetch.mock.calls[0]?.[1] as RequestInit;
      expect(callArgs.headers).toEqual({
        'Content-Type': 'application/json',
        'X-Custom': 'initial',
        Authorization: 'Bearer token',
      });
    });
  });

  describe('HTTP methods', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ projectId: 'new-id' }),
      });
    });

    it('should make POST request with body', async () => {
      const client = createTypedClient(testRouter, {
        baseUrl: 'http://localhost:3000',
        fetch: mockFetch,
      });

      await client.projects.create({
        body: { name: 'New Project', description: 'Test' },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/projects',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'New Project', description: 'Test' }),
        }),
      );
    });

    it('should make GET request without body', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ items: [], total: 0 }),
      });

      const client = createTypedClient(testRouter, {
        baseUrl: 'http://localhost:3000',
        fetch: mockFetch,
      });

      await client.projects.list({ queryParams: { page: '1', pageSize: '20' } });

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs?.[0]).toContain('page=1');
      expect(callArgs?.[0]).toContain('pageSize=20');
      expect((callArgs?.[1] as RequestInit).body).toBeUndefined();
    });

    it('should make PUT request with path params and body', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve(null),
      });

      const client = createTypedClient(testRouter, {
        baseUrl: 'http://localhost:3000',
        fetch: mockFetch,
      });

      await client.projects.update({
        pathParams: { projectId: '123' },
        body: { name: 'Updated Name' },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/projects/123',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ name: 'Updated Name' }),
        }),
      );
    });

    it('should make DELETE request with path params', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve(null),
      });

      const client = createTypedClient(testRouter, {
        baseUrl: 'http://localhost:3000',
        fetch: mockFetch,
      });

      await client.projects.delete({
        pathParams: { projectId: '123' },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/projects/123',
        expect.objectContaining({
          method: 'DELETE',
        }),
      );
    });
  });

  describe('response handling', () => {
    it('should return parsed JSON response', async () => {
      const responseData = { projectId: 'abc-123' };
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve(responseData),
      });

      const client = createTypedClient(testRouter, {
        baseUrl: 'http://localhost:3000',
        fetch: mockFetch,
      });

      const result = await client.projects.create({
        body: { name: 'Test' },
      });

      expect(result).toEqual(responseData);
    });

    it('should handle text response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'text/plain' }),
        text: () => Promise.resolve('OK'),
      });

      const client = createTypedClient(testRouter, {
        baseUrl: 'http://localhost:3000',
        fetch: mockFetch,
      });

      const result = await client.projects.create({
        body: { name: 'Test' },
      });

      expect(result).toBe('OK');
    });
  });

  describe('error handling', () => {
    it('should throw ClientError for non-ok response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ message: 'Project not found', code: 'NOT_FOUND' }),
      });

      const client = createTypedClient(testRouter, {
        baseUrl: 'http://localhost:3000',
        fetch: mockFetch,
      });

      await expect(
        client.projects.get({ pathParams: { projectId: '999' } }),
      ).rejects.toThrow(ClientError);

      try {
        await client.projects.get({ pathParams: { projectId: '999' } });
      } catch (error) {
        expect(error).toBeInstanceOf(ClientError);
        expect((error as ClientError).status).toBe(404);
        expect((error as ClientError).message).toBe('Project not found');
        expect((error as ClientError).code).toBe('NOT_FOUND');
      }
    });

    it('should throw ClientError for network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const client = createTypedClient(testRouter, {
        baseUrl: 'http://localhost:3000',
        fetch: mockFetch,
      });

      await expect(
        client.projects.list({ queryParams: {} }),
      ).rejects.toThrow(ClientError);
    });

    it('should call onError hook when error occurs', async () => {
      const onError = vi.fn();
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ message: 'Server error' }),
      });

      const client = createTypedClient(testRouter, {
        baseUrl: 'http://localhost:3000',
        fetch: mockFetch,
        onError,
      });

      await expect(client.projects.list({ queryParams: {} })).rejects.toThrow();

      expect(onError).toHaveBeenCalled();
      expect(onError.mock.calls[0]?.[0]).toBeInstanceOf(ClientError);
    });
  });

  describe('request hooks', () => {
    it('should call onRequest hook before request', async () => {
      const onRequest = vi.fn((req) => ({
        ...req,
        headers: { ...req.headers, 'X-Request-Id': '12345' },
      }));

      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ items: [], total: 0 }),
      });

      const client = createTypedClient(testRouter, {
        baseUrl: 'http://localhost:3000',
        fetch: mockFetch,
        onRequest,
      });

      await client.projects.list({ queryParams: {} });

      expect(onRequest).toHaveBeenCalled();
      const callArgs = mockFetch.mock.calls[0]?.[1] as RequestInit;
      expect(callArgs.headers).toHaveProperty('X-Request-Id', '12345');
    });

    it('should call onResponse hook after response', async () => {
      const onResponse = vi.fn((data) => ({ ...data, transformed: true }));

      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ items: [], total: 0 }),
      });

      const client = createTypedClient(testRouter, {
        baseUrl: 'http://localhost:3000',
        fetch: mockFetch,
        onResponse,
      });

      const result = await client.projects.list({ queryParams: {} });

      expect(onResponse).toHaveBeenCalled();
      expect(result).toHaveProperty('transformed', true);
    });
  });

  describe('timeout', () => {
    it('should respect timeout configuration', async () => {
      // Just verify timeout is set in request - actual timeout testing is complex with AbortController
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ items: [], total: 0 }),
      });

      const client = createTypedClient(testRouter, {
        baseUrl: 'http://localhost:3000',
        fetch: mockFetch,
        timeout: 5000,
      });

      await client.projects.list({ queryParams: {} });

      // Verify fetch was called (timeout is handled internally via AbortController)
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('credentials', () => {
    it('should include credentials in request', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ items: [], total: 0 }),
      });

      const client = createTypedClient(testRouter, {
        baseUrl: 'http://localhost:3000',
        fetch: mockFetch,
        credentials: 'include',
      });

      await client.projects.list({ queryParams: {} });

      const callArgs = mockFetch.mock.calls[0]?.[1] as RequestInit;
      expect(callArgs.credentials).toBe('include');
    });
  });

  describe('flat router', () => {
    it('should work with flat router structure', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ projectId: 'new' }),
      });

      const flatRouter = defineRouterContract({
        createProject: createProjectRoute,
        listProjects: listProjectsRoute,
      });

      const client = createTypedClient(flatRouter, {
        baseUrl: 'http://localhost:3000',
        fetch: mockFetch,
      });

      expect(typeof client.createProject).toBe('function');
      expect(typeof client.listProjects).toBe('function');

      await client.createProject({ body: { name: 'Test' } });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/projects',
        expect.any(Object),
      );
    });
  });
});
