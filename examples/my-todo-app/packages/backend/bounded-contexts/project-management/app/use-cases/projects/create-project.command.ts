import { BaseInboundAdapter } from '@cosmneo/onion-lasagna/backend/core/onion-layers';
import { SKIP_DTO_VALIDATION } from '@cosmneo/onion-lasagna/backend/core/global';
import {
  type CreateProjectPort,
  CreateProjectInputDto,
  CreateProjectOutputDto,
} from '../../ports/inbound/projects/create-project.command.port';
import type { ProjectRepositoryPort } from '../../ports/outbound';
import { Project } from '../../../domain/aggregates';
import { ProjectName, ProjectDescription } from '../../../domain/value-objects';

/**
 * Use case for creating a new project.
 *
 * Creates a project with default statuses (To Do, In Progress, Done).
 */
export class CreateProjectUseCase
  extends BaseInboundAdapter<CreateProjectInputDto, CreateProjectOutputDto>
  implements CreateProjectPort
{
  constructor(private readonly projectRepository: ProjectRepositoryPort) {
    super();
  }

  protected async handle(input: CreateProjectInputDto): Promise<CreateProjectOutputDto> {
    const { name, description } = input.data;

    const projectName = ProjectName.create(name);
    const projectDescription = description ? ProjectDescription.create(description) : undefined;

    const project = Project.create(projectName, projectDescription);

    await this.projectRepository.save(project);

    return new CreateProjectOutputDto({ projectId: project.id.value }, SKIP_DTO_VALIDATION);
  }
}
