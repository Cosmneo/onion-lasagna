import type { BaseInboundPort } from '@cosmneo/onion-lasagna/backend/core/onion-layers';
import { BaseDto } from '@cosmneo/onion-lasagna/backend/core/global';
import type { StatusListItem } from '@repo/shared/read-models';

export interface ListStatusesInput {
  projectId: string;
}

export interface ListStatusesOutput {
  statuses: StatusListItem[];
}

export class ListStatusesInputDto extends BaseDto<ListStatusesInput> {}

export class ListStatusesOutputDto extends BaseDto<ListStatusesOutput> {}

/**
 * Inbound port for ListStatuses query.
 *
 * Lists all statuses in a project.
 */
export interface ListStatusesPort
  extends BaseInboundPort<ListStatusesInputDto, ListStatusesOutputDto> {}
