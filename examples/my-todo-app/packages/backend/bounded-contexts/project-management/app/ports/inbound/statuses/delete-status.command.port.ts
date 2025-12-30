import type { BaseInboundPort } from '@cosmneo/onion-lasagna/backend/core/onion-layers';
import { BaseDto } from '@cosmneo/onion-lasagna/backend/core/global';

export interface DeleteStatusInput {
  projectId: string;
  statusId: string;
}

export class DeleteStatusInputDto extends BaseDto<DeleteStatusInput> {}

/**
 * Inbound port for DeleteStatus command.
 *
 * Removes a status from a project.
 */
export interface DeleteStatusPort
  extends BaseInboundPort<DeleteStatusInputDto, void> {}
