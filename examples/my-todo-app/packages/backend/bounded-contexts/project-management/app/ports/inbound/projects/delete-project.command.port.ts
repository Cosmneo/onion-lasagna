import type { BaseInboundPort } from '@cosmneo/onion-lasagna/backend/core/onion-layers';
import { BaseDto } from '@cosmneo/onion-lasagna/backend/core/global';

export interface DeleteProjectInput {
  projectId: string;
}

export class DeleteProjectInputDto extends BaseDto<DeleteProjectInput> {}

/**
 * Inbound port for DeleteProject command.
 *
 * Deletes a project and all its tasks/statuses.
 */
export interface DeleteProjectPort
  extends BaseInboundPort<DeleteProjectInputDto, void> {}
