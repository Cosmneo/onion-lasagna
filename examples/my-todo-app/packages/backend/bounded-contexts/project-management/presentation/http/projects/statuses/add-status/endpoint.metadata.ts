import type { HttpEndpointMetadata } from '@cosmneo/onion-lasagna/backend/core/presentation';

export const addStatusEndpointMetadata: HttpEndpointMetadata = {
  id: 'add-status',
  shortId: 'as',
  name: 'addStatus',
  description: 'Adds a new status to a project.',
  path: '/',
  method: 'POST',
  openApi: {
    summary: 'Add a status to project',
    successStatus: 201,
  },
};
