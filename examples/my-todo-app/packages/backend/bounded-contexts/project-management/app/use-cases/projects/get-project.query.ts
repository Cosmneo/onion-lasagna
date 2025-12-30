import { BaseInboundAdapter, NotFoundError } from '@cosmneo/onion-lasagna/backend/core/onion-layers';
import { SKIP_DTO_VALIDATION } from '@cosmneo/onion-lasagna/backend/core/global';
import {
  type GetProjectPort,
  GetProjectInputDto,
  GetProjectOutputDto,
} from '../../ports/inbound/projects/get-project.query.port';
import type { ProjectQueryRepositoryPort } from '../../ports/outbound';

/**
 * Query for getting a project by ID with all statuses and tasks.
 */
export class GetProjectQuery
  extends BaseInboundAdapter<GetProjectInputDto, GetProjectOutputDto>
  implements GetProjectPort
{
  constructor(private readonly queryRepository: ProjectQueryRepositoryPort) {
    super();
  }

  protected async handle(input: GetProjectInputDto): Promise<GetProjectOutputDto> {
    const { projectId } = input.data;

    const project = await this.queryRepository.getProjectById(projectId);
    if (!project) {
      throw new NotFoundError({ message: `Project ${projectId} not found` });
    }

    return new GetProjectOutputDto(project, SKIP_DTO_VALIDATION);
  }
}
