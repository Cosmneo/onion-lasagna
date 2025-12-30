import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import {
  registerHonoRoutes,
  onionErrorHandler,
} from '@cosmneo/onion-lasagna/backend/frameworks/hono';
import { bootstrapProjectManagement } from '@repo/backend/bounded-contexts/project-management/index';

// Bootstrap the project management module
const { routes } = bootstrapProjectManagement();

// Create Hono app
const app = new Hono();

// Global middlewares
app.use('*', logger());
app.use('*', cors());

// Error handler
app.onError((err, c) => {
  console.error('Error:', err);
  return onionErrorHandler(err, c);
});

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }));

// Register routes
registerHonoRoutes(app, routes);

// Start server
const port = process.env['PORT'] ? parseInt(process.env['PORT']) : 3000;

console.log(`🚀 Project Management Service running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});
