import type { BaseInboundPort } from '@cosmneo/onion-lasagna/backend/core/onion-layers';
import { BaseDto } from '@cosmneo/onion-lasagna/backend/core/global';
import type { ProjectDetailView } from '@repo/shared/read-models';

export interface GetProjectInput {
  projectId: string;
}

export type GetProjectOutput = ProjectDetailView;

export class GetProjectInputDto extends BaseDto<GetProjectInput> {}

export class GetProjectOutputDto extends BaseDto<GetProjectOutput> {}

/**
 * Inbound port for GetProject query.
 *
 * Gets a project by ID with all statuses and tasks.
 */
export interface GetProjectPort
  extends BaseInboundPort<GetProjectInputDto, GetProjectOutputDto> {}
