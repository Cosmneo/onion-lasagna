import { BaseDomainEvent } from '@cosmneo/onion-lasagna/backend/core/onion-layers';

/**
 * Payload for the ProjectCreated domain event.
 */
export interface ProjectCreatedPayload {
  projectId: string;
  name: string;
  description: string;
  statusCount: number;
  createdAt: string;
}

/**
 * Domain event raised when a new project is created.
 *
 * This event is emitted after the project is created with its
 * default statuses (To Do, In Progress, Complete).
 */
export class ProjectCreatedEvent extends BaseDomainEvent<ProjectCreatedPayload> {
  constructor(payload: ProjectCreatedPayload) {
    super('ProjectCreated', payload.projectId, payload);
  }
}
