import { NotFoundError } from '@cosmneo/onion-lasagna/backend/core/onion-layers';
import {
  type UpdateProjectPort,
  UpdateProjectInputDto,
} from '../../ports/inbound/projects/update-project.command.port';
import type { ProjectRepositoryPort } from '../../ports/outbound';
import { ProjectId } from '../../../domain/value-objects';
import { BaseVoidInboundAdapter } from '../base-void-inbound-adapter';

/**
 * Use case for updating a project.
 */
export class UpdateProjectUseCase
  extends BaseVoidInboundAdapter<UpdateProjectInputDto>
  implements UpdateProjectPort
{
  constructor(private readonly projectRepository: ProjectRepositoryPort) {
    super();
  }

  protected async handle(input: UpdateProjectInputDto): Promise<void> {
    const { projectId, name, description } = input.data;

    const project = await this.projectRepository.findById(ProjectId.create(projectId));
    if (!project) {
      throw new NotFoundError({ message: `Project ${projectId} not found` });
    }

    if (name !== undefined) {
      project.updateName(name);
    }
    if (description !== undefined) {
      project.updateDescription(description);
    }

    await this.projectRepository.save(project);
  }
}
