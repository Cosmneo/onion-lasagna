import { NotFoundError } from '@cosmneo/onion-lasagna/backend/core/onion-layers';
import {
  type DeleteProjectPort,
  DeleteProjectInputDto,
} from '../../ports/inbound/projects/delete-project.command.port';
import type { ProjectRepositoryPort } from '../../ports/outbound';
import { ProjectId } from '../../../domain/value-objects';
import { BaseVoidInboundAdapter } from '../base-void-inbound-adapter';

/**
 * Use case for deleting a project.
 */
export class DeleteProjectUseCase
  extends BaseVoidInboundAdapter<DeleteProjectInputDto>
  implements DeleteProjectPort
{
  constructor(private readonly projectRepository: ProjectRepositoryPort) {
    super();
  }

  protected async handle(input: DeleteProjectInputDto): Promise<void> {
    const { projectId } = input.data;

    const id = ProjectId.create(projectId);
    const exists = await this.projectRepository.exists(id);
    if (!exists) {
      throw new NotFoundError({ message: `Project ${projectId} not found` });
    }

    await this.projectRepository.delete(id);
  }
}
