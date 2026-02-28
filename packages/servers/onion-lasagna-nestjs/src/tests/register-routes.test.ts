/**
 * @fileoverview Integration tests for NestJS route registration.
 *
 * Tests the complete flow from unified routes to NestJS controllers
 * using @nestjs/testing and supertest.
 */

import 'reflect-metadata';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { UnifiedRouteInput } from '@cosmneo/onion-lasagna/http/server';
import { NotFoundError, UseCaseError } from '@cosmneo/onion-lasagna';
import { OnionLasagnaModule, createNestController } from '../register-routes';

describe('NestJS register-routes', () => {
  describe('OnionLasagnaModule.register', () => {
    const routes: UnifiedRouteInput[] = [
      {
        method: 'GET',
        path: '/users/{id}',
        handler: async (req) => ({
          status: 200,
          body: { id: req.params?.id, name: 'Test User' },
        }),
        metadata: { operationId: 'getUser' },
      },
      {
        method: 'POST',
        path: '/users',
        handler: async (req) => ({
          status: 201,
          body: { id: '1', ...(req.body as object) },
        }),
        metadata: { operationId: 'createUser' },
      },
      {
        method: 'DELETE',
        path: '/users/{id}',
        handler: async () => ({
          status: 204,
        }),
        metadata: { operationId: 'deleteUser' },
      },
      {
        method: 'PATCH',
        path: '/users/{id}',
        handler: async (req) => ({
          status: 200,
          body: { id: req.params?.id, ...(req.body as object) },
          headers: { 'x-custom-header': 'custom-value' },
        }),
        metadata: { operationId: 'updateUser' },
      },
    ];

    let app: INestApplication;

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        imports: [OnionLasagnaModule.register(routes)],
      }).compile();

      app = module.createNestApplication();
      await app.init();
    });

    afterAll(async () => {
      await app.close();
    });

    it('handles GET requests with path params', async () => {
      const response = await request(app.getHttpServer()).get('/users/123');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ id: '123', name: 'Test User' });
    });

    it('handles POST requests with body and custom status', async () => {
      const response = await request(app.getHttpServer())
        .post('/users')
        .send({ name: 'New User', email: 'test@example.com' });
      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        id: '1',
        name: 'New User',
        email: 'test@example.com',
      });
    });

    it('handles DELETE requests with 204 No Content', async () => {
      const response = await request(app.getHttpServer()).delete('/users/456');
      expect(response.status).toBe(204);
      expect(response.body).toEqual({});
    });

    it('handles PATCH requests with custom response headers', async () => {
      const response = await request(app.getHttpServer())
        .patch('/users/789')
        .send({ name: 'Updated' });
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ id: '789', name: 'Updated' });
      expect(response.headers['x-custom-header']).toBe('custom-value');
    });
  });

  describe('prefix option', () => {
    const routes: UnifiedRouteInput[] = [
      {
        method: 'GET',
        path: '/items',
        handler: async () => ({
          status: 200,
          body: [{ id: '1', name: 'Item 1' }],
        }),
        metadata: { operationId: 'listItems' },
      },
    ];

    let app: INestApplication;

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        imports: [OnionLasagnaModule.register(routes, { prefix: '/api/v1' })],
      }).compile();

      app = module.createNestApplication();
      await app.init();
    });

    afterAll(async () => {
      await app.close();
    });

    it('prepends prefix to all routes', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/items');
      expect(response.status).toBe(200);
      expect(response.body).toEqual([{ id: '1', name: 'Item 1' }]);
    });

    it('returns 404 for routes without prefix', async () => {
      const response = await request(app.getHttpServer()).get('/items');
      expect(response.status).toBe(404);
    });
  });

  describe('contextExtractor option', () => {
    let app: INestApplication;

    beforeAll(async () => {
      const routes: UnifiedRouteInput[] = [
        {
          method: 'GET',
          path: '/profile',
          handler: async (_req, ctx) => ({
            status: 200,
            body: { requestId: ctx?.requestId },
          }),
          metadata: { operationId: 'getProfile' },
        },
      ];

      const module = await Test.createTestingModule({
        imports: [
          OnionLasagnaModule.register(routes, {
            contextExtractor: (req) => ({
              requestId: req.headers['x-request-id'] as string,
            }),
          }),
        ],
      }).compile();

      app = module.createNestApplication();
      await app.init();
    });

    afterAll(async () => {
      await app.close();
    });

    it('passes extracted context to handlers', async () => {
      const response = await request(app.getHttpServer())
        .get('/profile')
        .set('x-request-id', 'req-123');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ requestId: 'req-123' });
    });
  });

  describe('error handling', () => {
    let app: INestApplication;

    beforeAll(async () => {
      const routes: UnifiedRouteInput[] = [
        {
          method: 'GET',
          path: '/items/{id}',
          handler: async () => {
            throw new NotFoundError({ message: 'Item not found', code: 'ITEM_NOT_FOUND' });
          },
          metadata: { operationId: 'getItem' },
        },
        {
          method: 'POST',
          path: '/items',
          handler: async () => {
            throw new UseCaseError({ message: 'Validation failed', code: 'VALIDATION_ERROR' });
          },
          metadata: { operationId: 'createItem' },
        },
      ];

      const module = await Test.createTestingModule({
        imports: [OnionLasagnaModule.register(routes)],
      }).compile();

      app = module.createNestApplication();
      await app.init();
    });

    afterAll(async () => {
      await app.close();
    });

    it('maps NotFoundError to 404', async () => {
      const response = await request(app.getHttpServer()).get('/items/999');
      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Item not found');
      expect(response.body.errorCode).toBe('ITEM_NOT_FOUND');
    });

    it('maps UseCaseError to 400', async () => {
      const response = await request(app.getHttpServer()).post('/items').send({});
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Validation failed');
      expect(response.body.errorCode).toBe('VALIDATION_ERROR');
    });
  });

  describe('createNestController', () => {
    it('creates a valid NestJS controller class', () => {
      const routes: UnifiedRouteInput[] = [
        {
          method: 'GET',
          path: '/test',
          handler: async () => ({ status: 200, body: { ok: true } }),
          metadata: { operationId: 'testRoute' },
        },
      ];

      const controller = createNestController(routes);
      expect(controller).toBeDefined();
      expect(typeof controller).toBe('function');
      expect(controller.prototype.testRoute).toBeDefined();
      expect(typeof controller.prototype.testRoute).toBe('function');
    });

    it('falls back to index-based method names without operationId', () => {
      const routes: UnifiedRouteInput[] = [
        {
          method: 'GET',
          path: '/test',
          handler: async () => ({ status: 200, body: { ok: true } }),
          metadata: {},
        },
      ];

      const controller = createNestController(routes);
      expect(controller.prototype.handler0).toBeDefined();
    });

    it('throws for unsupported HTTP methods', () => {
      const routes: UnifiedRouteInput[] = [
        {
          method: 'TRACE' as never,
          path: '/test',
          handler: async () => ({ status: 200 }),
          metadata: {},
        },
      ];

      expect(() => createNestController(routes)).toThrow('Unsupported HTTP method: TRACE');
    });
  });

  describe('query parameters', () => {
    let app: INestApplication;

    beforeAll(async () => {
      const routes: UnifiedRouteInput[] = [
        {
          method: 'GET',
          path: '/search',
          handler: async (req) => ({
            status: 200,
            body: { query: req.query },
          }),
          metadata: { operationId: 'search' },
        },
      ];

      const module = await Test.createTestingModule({
        imports: [OnionLasagnaModule.register(routes)],
      }).compile();

      app = module.createNestApplication();
      await app.init();
    });

    afterAll(async () => {
      await app.close();
    });

    it('passes query parameters to handlers', async () => {
      const response = await request(app.getHttpServer()).get('/search?q=test&page=1');
      expect(response.status).toBe(200);
      expect(response.body.query.q).toBe('test');
      expect(response.body.query.page).toBe('1');
    });
  });
});
