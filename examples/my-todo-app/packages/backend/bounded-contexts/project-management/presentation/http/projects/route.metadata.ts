import type { ResourceMetadata } from '@cosmneo/onion-lasagna/backend/core/presentation';

export const projectsResourceMetadata: ResourceMetadata = {
  id: 'projects',
  shortId: 'proj',
  name: 'Projects',
  description: 'Project management endpoints.',
  path: '/',
  order: 1,
  openApi: {
    tag: 'Projects',
    tagDescription: 'Create, read, update, and delete projects.',
  },
};
