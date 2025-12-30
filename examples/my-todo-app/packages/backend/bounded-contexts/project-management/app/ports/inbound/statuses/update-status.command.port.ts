import type { BaseInboundPort } from '@cosmneo/onion-lasagna/backend/core/onion-layers';
import { BaseDto } from '@cosmneo/onion-lasagna/backend/core/global';

export interface UpdateStatusInput {
  projectId: string;
  statusId: string;
  name?: string;
  isFinal?: boolean;
  order?: number;
}

export class UpdateStatusInputDto extends BaseDto<UpdateStatusInput> {}

/**
 * Inbound port for UpdateStatus command.
 *
 * Updates an existing status.
 */
export interface UpdateStatusPort
  extends BaseInboundPort<UpdateStatusInputDto, void> {}
