/**
 * @fileoverview Tests for path parameter utilities.
 */

import { describe, it, expect } from 'vitest';
import {
  pathToRegex,
  getPathParamNames,
  hasPathParams,
  buildPath,
  normalizePath,
} from '../types/path-params.type';

describe('path-params', () => {
  describe('pathToRegex', () => {
    it('creates regex for simple path without params', () => {
      const regex = pathToRegex('/users');
      expect(regex.test('/users')).toBe(true);
      expect(regex.test('/users/')).toBe(true);
      expect(regex.test('/users/123')).toBe(false);
    });

    it('creates regex for path with colon params', () => {
      const regex = pathToRegex('/users/:userId');
      expect(regex.test('/users/123')).toBe(true);
      expect(regex.test('/users/abc-def')).toBe(true);
      expect(regex.test('/users/')).toBe(false);
      expect(regex.test('/users')).toBe(false);
    });

    it('creates regex for path with brace params', () => {
      const regex = pathToRegex('/users/{userId}');
      expect(regex.test('/users/123')).toBe(true);
      expect(regex.test('/users/abc')).toBe(true);
    });

    it('creates regex for multiple params', () => {
      const regex = pathToRegex('/users/:userId/posts/:postId');
      expect(regex.test('/users/1/posts/2')).toBe(true);
      expect(regex.test('/users/abc/posts/def')).toBe(true);
      expect(regex.test('/users/1/posts')).toBe(false);
    });

    it('captures param values', () => {
      const regex = pathToRegex('/users/:userId/posts/:postId');
      const match = '/users/123/posts/456'.match(regex);
      expect(match).toBeTruthy();
      expect(match![1]).toBe('123');
      expect(match![2]).toBe('456');
    });

    it('handles special regex characters in path', () => {
      const regex = pathToRegex('/api/v1.0/users');
      expect(regex.test('/api/v1.0/users')).toBe(true);
      expect(regex.test('/api/v1X0/users')).toBe(false);
    });
  });

  describe('getPathParamNames', () => {
    it('extracts colon-style params', () => {
      const names = getPathParamNames('/users/:userId/posts/:postId');
      expect(names).toEqual(['userId', 'postId']);
    });

    it('extracts brace-style params', () => {
      const names = getPathParamNames('/users/{userId}/posts/{postId}');
      expect(names).toEqual(['userId', 'postId']);
    });

    it('extracts mixed-style params', () => {
      const names = getPathParamNames('/users/:userId/posts/{postId}');
      expect(names).toEqual(['userId', 'postId']);
    });

    it('returns empty array for paths without params', () => {
      const names = getPathParamNames('/users');
      expect(names).toEqual([]);
    });

    it('handles single param', () => {
      const names = getPathParamNames('/users/:id');
      expect(names).toEqual(['id']);
    });

    it('handles params with underscores', () => {
      const names = getPathParamNames('/users/:user_id/posts/:post_id');
      expect(names).toEqual(['user_id', 'post_id']);
    });

    it('handles params with numbers', () => {
      const names = getPathParamNames('/api/v1/:resourceId2');
      expect(names).toEqual(['resourceId2']);
    });
  });

  describe('hasPathParams', () => {
    it('returns true for paths with colon params', () => {
      expect(hasPathParams('/users/:id')).toBe(true);
      expect(hasPathParams('/users/:userId/posts/:postId')).toBe(true);
    });

    it('returns true for paths with brace params', () => {
      expect(hasPathParams('/users/{id}')).toBe(true);
      expect(hasPathParams('/users/{userId}/posts/{postId}')).toBe(true);
    });

    it('returns false for paths without params', () => {
      expect(hasPathParams('/users')).toBe(false);
      expect(hasPathParams('/users/posts')).toBe(false);
      expect(hasPathParams('/')).toBe(false);
    });

    it('returns false for paths with colon in different context', () => {
      // Colon not followed by valid identifier
      expect(hasPathParams('/time/12:30')).toBe(false);
    });
  });

  describe('buildPath', () => {
    it('replaces colon-style params', () => {
      const result = buildPath('/users/:userId', { userId: '123' });
      expect(result).toBe('/users/123');
    });

    it('replaces brace-style params', () => {
      const result = buildPath('/users/{userId}', { userId: '123' });
      expect(result).toBe('/users/123');
    });

    it('replaces multiple params', () => {
      const result = buildPath('/users/:userId/posts/:postId', {
        userId: '1',
        postId: '2',
      });
      expect(result).toBe('/users/1/posts/2');
    });

    it('encodes special characters', () => {
      const result = buildPath('/users/:name', { name: 'John Doe' });
      expect(result).toBe('/users/John%20Doe');
    });

    it('encodes slashes in param values', () => {
      const result = buildPath('/files/:path', { path: 'a/b/c' });
      expect(result).toBe('/files/a%2Fb%2Fc');
    });

    it('handles empty params object', () => {
      const result = buildPath('/users', {});
      expect(result).toBe('/users');
    });

    it('replaces mixed param styles', () => {
      const result = buildPath('/users/:userId/posts/{postId}', {
        userId: '1',
        postId: '2',
      });
      expect(result).toBe('/users/1/posts/2');
    });
  });

  describe('normalizePath', () => {
    it('converts brace params to colon params', () => {
      const result = normalizePath('/users/{userId}');
      expect(result).toBe('/users/:userId');
    });

    it('converts multiple brace params', () => {
      const result = normalizePath('/users/{userId}/posts/{postId}');
      expect(result).toBe('/users/:userId/posts/:postId');
    });

    it('leaves colon params unchanged', () => {
      const result = normalizePath('/users/:userId');
      expect(result).toBe('/users/:userId');
    });

    it('leaves paths without params unchanged', () => {
      const result = normalizePath('/users');
      expect(result).toBe('/users');
    });

    it('handles mixed styles', () => {
      const result = normalizePath('/users/:userId/posts/{postId}');
      expect(result).toBe('/users/:userId/posts/:postId');
    });

    it('handles params with underscores', () => {
      const result = normalizePath('/users/{user_id}');
      expect(result).toBe('/users/:user_id');
    });
  });
});
