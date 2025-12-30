import type { ServiceMetadata } from '@cosmneo/onion-lasagna/backend/core/presentation';

export const projectManagementServiceMetadata: ServiceMetadata = {
  id: 'project-management-service',
  shortId: 'pm',
  name: 'Project Management Service',
  description: 'Manages projects, tasks, and statuses for the todo application.',
  basePath: '/api/projects',
  openApi: {
    title: 'Project Management API',
    description: 'API for managing projects, tasks, and statuses.',
  },
};
