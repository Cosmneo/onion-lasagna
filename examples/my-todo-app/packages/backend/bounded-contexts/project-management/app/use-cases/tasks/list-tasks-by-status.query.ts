import { BaseInboundAdapter } from '@cosmneo/onion-lasagna/backend/core/onion-layers';
import { SKIP_DTO_VALIDATION } from '@cosmneo/onion-lasagna/backend/core/global';
import {
  type ListTasksByStatusPort,
  ListTasksByStatusInputDto,
  ListTasksByStatusOutputDto,
} from '../../ports/inbound/tasks/list-tasks-by-status.query.port';
import type { ProjectQueryRepositoryPort } from '../../ports/outbound';

/**
 * Query for listing tasks filtered by status.
 */
export class ListTasksByStatusQuery
  extends BaseInboundAdapter<ListTasksByStatusInputDto, ListTasksByStatusOutputDto>
  implements ListTasksByStatusPort
{
  constructor(private readonly queryRepository: ProjectQueryRepositoryPort) {
    super();
  }

  protected async handle(input: ListTasksByStatusInputDto): Promise<ListTasksByStatusOutputDto> {
    const { projectId, statusId, page, pageSize } = input.data;

    const pagination = page !== undefined && pageSize !== undefined
      ? { page, pageSize }
      : undefined;

    const result = await this.queryRepository.listTasksByStatus(projectId, statusId, pagination);

    return new ListTasksByStatusOutputDto(result, SKIP_DTO_VALIDATION);
  }
}
