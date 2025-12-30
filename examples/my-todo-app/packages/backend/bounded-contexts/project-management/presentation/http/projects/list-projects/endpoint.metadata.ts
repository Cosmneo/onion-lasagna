import type { HttpEndpointMetadata } from '@cosmneo/onion-lasagna/backend/core/presentation';

export const listProjectsEndpointMetadata: HttpEndpointMetadata = {
  id: 'list-projects',
  shortId: 'lp',
  name: 'listProjects',
  description: 'Lists all projects with pagination.',
  path: '/',
  method: 'GET',
  openApi: {
    summary: 'List all projects',
    successStatus: 200,
  },
};
