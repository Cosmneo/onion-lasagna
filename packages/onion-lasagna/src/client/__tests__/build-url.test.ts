import { describe, it, expect } from 'vitest';
import { buildUrl, extractPathParamNames, hasPathParams } from '../internals/build-url';

describe('buildUrl', () => {
  describe('basic URL building', () => {
    it('should build a simple URL without parameters', () => {
      const url = buildUrl('http://localhost:3000', '/api/projects');
      expect(url).toBe('http://localhost:3000/api/projects');
    });

    it('should handle base URL with trailing slash', () => {
      const url = buildUrl('http://localhost:3000/', '/api/projects');
      expect(url).toBe('http://localhost:3000/api/projects');
    });

    it('should handle path without leading slash', () => {
      const url = buildUrl('http://localhost:3000', 'api/projects');
      expect(url).toBe('http://localhost:3000/api/projects');
    });

    it('should handle both trailing and missing leading slashes', () => {
      const url = buildUrl('http://localhost:3000/', 'api/projects');
      expect(url).toBe('http://localhost:3000/api/projects');
    });
  });

  describe('path parameters', () => {
    it('should replace single path parameter', () => {
      const url = buildUrl(
        'http://localhost:3000',
        '/api/projects/{projectId}',
        { projectId: '123' },
      );
      expect(url).toBe('http://localhost:3000/api/projects/123');
    });

    it('should replace multiple path parameters', () => {
      const url = buildUrl(
        'http://localhost:3000',
        '/api/projects/{projectId}/tasks/{taskId}',
        { projectId: 'proj-1', taskId: 'task-2' },
      );
      expect(url).toBe('http://localhost:3000/api/projects/proj-1/tasks/task-2');
    });

    it('should encode path parameters with special characters', () => {
      const url = buildUrl(
        'http://localhost:3000',
        '/api/users/{userId}',
        { userId: 'user@example.com' },
      );
      expect(url).toBe('http://localhost:3000/api/users/user%40example.com');
    });

    it('should handle path parameters with spaces', () => {
      const url = buildUrl(
        'http://localhost:3000',
        '/api/search/{term}',
        { term: 'hello world' },
      );
      expect(url).toBe('http://localhost:3000/api/search/hello%20world');
    });

    it('should work without path parameters when none provided', () => {
      const url = buildUrl('http://localhost:3000', '/api/projects');
      expect(url).toBe('http://localhost:3000/api/projects');
    });
  });

  describe('query parameters', () => {
    it('should append single query parameter', () => {
      const url = buildUrl(
        'http://localhost:3000',
        '/api/projects',
        undefined,
        { page: '1' },
      );
      expect(url).toBe('http://localhost:3000/api/projects?page=1');
    });

    it('should append multiple query parameters', () => {
      const url = buildUrl(
        'http://localhost:3000',
        '/api/projects',
        undefined,
        { page: '1', pageSize: '20' },
      );
      expect(url).toContain('page=1');
      expect(url).toContain('pageSize=20');
      expect(url).toContain('?');
      expect(url).toContain('&');
    });

    it('should skip undefined query parameters', () => {
      const url = buildUrl(
        'http://localhost:3000',
        '/api/projects',
        undefined,
        { page: '1', filter: undefined },
      );
      expect(url).toBe('http://localhost:3000/api/projects?page=1');
    });

    it('should skip null query parameters', () => {
      const url = buildUrl(
        'http://localhost:3000',
        '/api/projects',
        undefined,
        { page: '1', filter: null as unknown as string | undefined },
      );
      expect(url).toBe('http://localhost:3000/api/projects?page=1');
    });

    it('should skip empty string query parameters', () => {
      const url = buildUrl(
        'http://localhost:3000',
        '/api/projects',
        undefined,
        { page: '1', filter: '' },
      );
      expect(url).toBe('http://localhost:3000/api/projects?page=1');
    });

    it('should not append query string when all params are undefined', () => {
      const url = buildUrl(
        'http://localhost:3000',
        '/api/projects',
        undefined,
        { filter: undefined, search: undefined },
      );
      expect(url).toBe('http://localhost:3000/api/projects');
    });
  });

  describe('combined path and query parameters', () => {
    it('should handle both path and query parameters', () => {
      const url = buildUrl(
        'http://localhost:3000',
        '/api/projects/{projectId}/tasks',
        { projectId: '123' },
        { status: 'active', page: '1' },
      );
      expect(url).toContain('http://localhost:3000/api/projects/123/tasks?');
      expect(url).toContain('status=active');
      expect(url).toContain('page=1');
    });
  });
});

describe('extractPathParamNames', () => {
  it('should extract single path parameter', () => {
    const params = extractPathParamNames('/api/projects/{projectId}');
    expect(params).toEqual(['projectId']);
  });

  it('should extract multiple path parameters', () => {
    const params = extractPathParamNames('/api/projects/{projectId}/tasks/{taskId}');
    expect(params).toEqual(['projectId', 'taskId']);
  });

  it('should return empty array for path without parameters', () => {
    const params = extractPathParamNames('/api/projects');
    expect(params).toEqual([]);
  });

  it('should handle consecutive path parameters', () => {
    const params = extractPathParamNames('/api/{orgId}/{projectId}');
    expect(params).toEqual(['orgId', 'projectId']);
  });
});

describe('hasPathParams', () => {
  it('should return true for path with parameters', () => {
    expect(hasPathParams('/api/projects/{projectId}')).toBe(true);
  });

  it('should return false for path without parameters', () => {
    expect(hasPathParams('/api/projects')).toBe(false);
  });

  it('should return true for path with multiple parameters', () => {
    expect(hasPathParams('/api/{a}/{b}/{c}')).toBe(true);
  });
});
