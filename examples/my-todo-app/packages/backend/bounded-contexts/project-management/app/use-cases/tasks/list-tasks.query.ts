import { BaseInboundAdapter } from '@cosmneo/onion-lasagna/backend/core/onion-layers';
import { SKIP_DTO_VALIDATION } from '@cosmneo/onion-lasagna/backend/core/global';
import {
  type ListTasksPort,
  ListTasksInputDto,
  ListTasksOutputDto,
} from '../../ports/inbound/tasks/list-tasks.query.port';
import type { ProjectQueryRepositoryPort } from '../../ports/outbound';

/**
 * Query for listing all tasks in a project.
 */
export class ListTasksQuery
  extends BaseInboundAdapter<ListTasksInputDto, ListTasksOutputDto>
  implements ListTasksPort
{
  constructor(private readonly queryRepository: ProjectQueryRepositoryPort) {
    super();
  }

  protected async handle(input: ListTasksInputDto): Promise<ListTasksOutputDto> {
    const { projectId, page, pageSize } = input.data;

    const pagination = page !== undefined && pageSize !== undefined
      ? { page, pageSize }
      : undefined;

    const result = await this.queryRepository.listTasks(projectId, pagination);

    return new ListTasksOutputDto(result, SKIP_DTO_VALIDATION);
  }
}
