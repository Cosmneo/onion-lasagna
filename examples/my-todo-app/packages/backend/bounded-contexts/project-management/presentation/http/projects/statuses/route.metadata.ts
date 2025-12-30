import type { ResourceMetadata } from '@cosmneo/onion-lasagna/backend/core/presentation';

export const statusesResourceMetadata: ResourceMetadata = {
  id: 'statuses',
  shortId: 'stat',
  name: 'Statuses',
  description: 'Status management endpoints within a project.',
  path: '/{projectId}/statuses',
  order: 2,
  openApi: {
    tag: 'Statuses',
    tagDescription: 'Create, read, update, and delete statuses within a project.',
  },
};
