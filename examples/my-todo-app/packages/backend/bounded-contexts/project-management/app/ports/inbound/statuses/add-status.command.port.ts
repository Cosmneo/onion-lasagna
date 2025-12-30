import type { BaseInboundPort } from '@cosmneo/onion-lasagna/backend/core/onion-layers';
import { BaseDto } from '@cosmneo/onion-lasagna/backend/core/global';

export interface AddStatusInput {
  projectId: string;
  name: string;
  isFinal: boolean;
  order: number;
}

export interface AddStatusOutput {
  statusId: string;
}

export class AddStatusInputDto extends BaseDto<AddStatusInput> {}

export class AddStatusOutputDto extends BaseDto<AddStatusOutput> {}

/**
 * Inbound port for AddStatus command.
 *
 * Adds a new status to a project.
 */
export interface AddStatusPort
  extends BaseInboundPort<AddStatusInputDto, AddStatusOutputDto> {}
