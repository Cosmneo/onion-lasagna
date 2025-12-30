import type { BaseInboundPort } from '@cosmneo/onion-lasagna/backend/core/onion-layers';
import { BaseDto } from '@cosmneo/onion-lasagna/backend/core/global';

export interface UpdateProjectInput {
  projectId: string;
  name?: string;
  description?: string;
}

export class UpdateProjectInputDto extends BaseDto<UpdateProjectInput> {}

/**
 * Inbound port for UpdateProject command.
 *
 * Updates project name and/or description.
 */
export interface UpdateProjectPort
  extends BaseInboundPort<UpdateProjectInputDto, void> {}
