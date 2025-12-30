import { BaseInboundAdapter } from '@cosmneo/onion-lasagna/backend/core/onion-layers';
import { SKIP_DTO_VALIDATION } from '@cosmneo/onion-lasagna/backend/core/global';
import {
  type ListStatusesPort,
  ListStatusesInputDto,
  ListStatusesOutputDto,
} from '../../ports/inbound/statuses/list-statuses.query.port';
import type { ProjectQueryRepositoryPort } from '../../ports/outbound';

/**
 * Query for listing all statuses in a project.
 */
export class ListStatusesQuery
  extends BaseInboundAdapter<ListStatusesInputDto, ListStatusesOutputDto>
  implements ListStatusesPort
{
  constructor(private readonly queryRepository: ProjectQueryRepositoryPort) {
    super();
  }

  protected async handle(input: ListStatusesInputDto): Promise<ListStatusesOutputDto> {
    const { projectId } = input.data;

    const statuses = await this.queryRepository.listStatuses(projectId);

    return new ListStatusesOutputDto({ statuses }, SKIP_DTO_VALIDATION);
  }
}
