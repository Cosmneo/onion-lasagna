import { BaseInboundAdapter } from '@cosmneo/onion-lasagna/backend/core/onion-layers';
import { SKIP_DTO_VALIDATION } from '@cosmneo/onion-lasagna/backend/core/global';
import {
  type ListProjectsPort,
  ListProjectsInputDto,
  ListProjectsOutputDto,
} from '../../ports/inbound/projects/list-projects.query.port';
import type { ProjectQueryRepositoryPort } from '../../ports/outbound';

/**
 * Query for listing all projects with pagination.
 */
export class ListProjectsQuery
  extends BaseInboundAdapter<ListProjectsInputDto, ListProjectsOutputDto>
  implements ListProjectsPort
{
  constructor(private readonly queryRepository: ProjectQueryRepositoryPort) {
    super();
  }

  protected async handle(input: ListProjectsInputDto): Promise<ListProjectsOutputDto> {
    const { page, pageSize } = input.data;

    const result = await this.queryRepository.listProjects({ page, pageSize });

    return new ListProjectsOutputDto(result, SKIP_DTO_VALIDATION);
  }
}
