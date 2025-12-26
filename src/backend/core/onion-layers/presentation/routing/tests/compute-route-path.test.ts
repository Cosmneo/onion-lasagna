import { describe, it, expect } from 'vitest';
import { computeRoutePath } from '../compute-route-path.util';

describe('computeRoutePath', () => {
  describe('basic concatenation', () => {
    it('should concatenate service, resource, and endpoint paths', () => {
      const result = computeRoutePath(
        { basePath: '/user-service' },
        { path: '/users' },
        { path: '/{id}' },
      );
      expect(result).toBe('/user-service/users/{id}');
    });

    it('should handle collection endpoints (no id)', () => {
      const result = computeRoutePath(
        { basePath: '/user-service' },
        { path: '/users' },
        { path: '' },
      );
      expect(result).toBe('/user-service/users');
    });

    it('should handle root endpoint path', () => {
      const result = computeRoutePath({ basePath: '/api' }, { path: '/health' }, { path: '/' });
      expect(result).toBe('/api/health');
    });
  });

  describe('path normalization - leading slashes', () => {
    it('should add leading slash when missing from service basePath', () => {
      const result = computeRoutePath(
        { basePath: 'user-service' },
        { path: '/users' },
        { path: '/{id}' },
      );
      expect(result).toBe('/user-service/users/{id}');
    });

    it('should add leading slash when missing from resource path', () => {
      const result = computeRoutePath(
        { basePath: '/user-service' },
        { path: 'users' },
        { path: '/{id}' },
      );
      expect(result).toBe('/user-service/users/{id}');
    });

    it('should add leading slash when missing from endpoint path', () => {
      const result = computeRoutePath(
        { basePath: '/user-service' },
        { path: '/users' },
        { path: '{id}' },
      );
      expect(result).toBe('/user-service/users/{id}');
    });

    it('should handle all paths missing leading slashes', () => {
      const result = computeRoutePath(
        { basePath: 'user-service' },
        { path: 'users' },
        { path: '{id}' },
      );
      expect(result).toBe('/user-service/users/{id}');
    });
  });

  describe('path normalization - double slashes', () => {
    it('should collapse double slashes from trailing service basePath', () => {
      const result = computeRoutePath(
        { basePath: '/user-service/' },
        { path: '/users' },
        { path: '/{id}' },
      );
      expect(result).toBe('/user-service/users/{id}');
    });

    it('should collapse double slashes from trailing resource path', () => {
      const result = computeRoutePath(
        { basePath: '/user-service' },
        { path: '/users/' },
        { path: '/{id}' },
      );
      expect(result).toBe('/user-service/users/{id}');
    });

    it('should collapse multiple consecutive slashes', () => {
      const result = computeRoutePath(
        { basePath: '/user-service//' },
        { path: '//users//' },
        { path: '//{id}' },
      );
      expect(result).toBe('/user-service/users/{id}');
    });
  });

  describe('path normalization - trailing slashes', () => {
    it('should remove trailing slash from final path', () => {
      const result = computeRoutePath(
        { basePath: '/user-service' },
        { path: '/users' },
        { path: '/{id}/' },
      );
      expect(result).toBe('/user-service/users/{id}');
    });

    it('should return root path when all paths are empty or slashes', () => {
      const result = computeRoutePath({ basePath: '' }, { path: '' }, { path: '' });
      expect(result).toBe('/');
    });

    it('should return root path when paths only contain slashes', () => {
      const result = computeRoutePath({ basePath: '/' }, { path: '/' }, { path: '/' });
      expect(result).toBe('/');
    });
  });

  describe('complex path parameters', () => {
    it('should handle multiple path parameters', () => {
      const result = computeRoutePath(
        { basePath: '/org-service' },
        { path: '/organizations/{orgId}/members' },
        { path: '/{memberId}' },
      );
      expect(result).toBe('/org-service/organizations/{orgId}/members/{memberId}');
    });

    it('should handle nested resource paths', () => {
      const result = computeRoutePath(
        { basePath: '/api/v1' },
        { path: '/users/{userId}/posts' },
        { path: '/{postId}/comments/{commentId}' },
      );
      expect(result).toBe('/api/v1/users/{userId}/posts/{postId}/comments/{commentId}');
    });
  });

  describe('edge cases', () => {
    it('should handle empty service basePath', () => {
      const result = computeRoutePath({ basePath: '' }, { path: '/users' }, { path: '/{id}' });
      expect(result).toBe('/users/{id}');
    });

    it('should handle empty resource path', () => {
      const result = computeRoutePath({ basePath: '/api' }, { path: '' }, { path: '/health' });
      expect(result).toBe('/api/health');
    });

    it('should handle empty endpoint path', () => {
      const result = computeRoutePath({ basePath: '/api' }, { path: '/users' }, { path: '' });
      expect(result).toBe('/api/users');
    });
  });
});
