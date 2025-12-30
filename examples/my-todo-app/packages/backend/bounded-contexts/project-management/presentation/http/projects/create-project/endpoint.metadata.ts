import type { HttpEndpointMetadata } from '@cosmneo/onion-lasagna/backend/core/presentation';

export const createProjectEndpointMetadata: HttpEndpointMetadata = {
  id: 'create-project',
  shortId: 'cp',
  name: 'createProject',
  description: 'Creates a new project with default statuses.',
  path: '/',
  method: 'POST',
  openApi: {
    summary: 'Create a new project',
    successStatus: 201,
  },
};
