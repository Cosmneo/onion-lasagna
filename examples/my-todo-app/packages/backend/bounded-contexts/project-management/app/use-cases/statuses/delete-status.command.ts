import { NotFoundError } from '@cosmneo/onion-lasagna/backend/core/onion-layers';
import {
  type DeleteStatusPort,
  DeleteStatusInputDto,
} from '../../ports/inbound/statuses/delete-status.command.port';
import type { ProjectRepositoryPort } from '../../ports/outbound';
import { ProjectId, StatusId } from '../../../domain/value-objects';
import { BaseVoidInboundAdapter } from '../base-void-inbound-adapter';

/**
 * Use case for deleting a status from a project.
 */
export class DeleteStatusUseCase
  extends BaseVoidInboundAdapter<DeleteStatusInputDto>
  implements DeleteStatusPort
{
  constructor(private readonly projectRepository: ProjectRepositoryPort) {
    super();
  }

  protected async handle(input: DeleteStatusInputDto): Promise<void> {
    const { projectId, statusId } = input.data;

    const project = await this.projectRepository.findById(ProjectId.create(projectId));
    if (!project) {
      throw new NotFoundError({ message: `Project ${projectId} not found` });
    }

    project.deleteStatus(StatusId.create(statusId));

    await this.projectRepository.save(project);
  }
}
