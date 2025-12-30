import type { BaseInboundPort } from '@cosmneo/onion-lasagna/backend/core/onion-layers';
import { BaseDto } from '@cosmneo/onion-lasagna/backend/core/global';

export interface CreateProjectInput {
  name: string;
  description?: string;
}

export interface CreateProjectOutput {
  projectId: string;
}

export class CreateProjectInputDto extends BaseDto<CreateProjectInput> {}

export class CreateProjectOutputDto extends BaseDto<CreateProjectOutput> {}

/**
 * Inbound port for CreateProject command.
 *
 * Creates a new project with default statuses.
 */
export interface CreateProjectPort
  extends BaseInboundPort<CreateProjectInputDto, CreateProjectOutputDto> {}
