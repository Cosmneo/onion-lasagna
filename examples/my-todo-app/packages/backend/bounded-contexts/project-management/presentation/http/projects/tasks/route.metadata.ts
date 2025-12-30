import type { ResourceMetadata } from '@cosmneo/onion-lasagna/backend/core/presentation';

export const tasksResourceMetadata: ResourceMetadata = {
  id: 'tasks',
  shortId: 'task',
  name: 'Tasks',
  description: 'Task management endpoints within a project.',
  path: '/{projectId}/tasks',
  order: 3,
  openApi: {
    tag: 'Tasks',
    tagDescription: 'Create, read, update, move, and delete tasks within a project.',
  },
};
