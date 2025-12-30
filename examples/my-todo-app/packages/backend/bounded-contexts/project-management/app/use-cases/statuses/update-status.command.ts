import { NotFoundError } from '@cosmneo/onion-lasagna/backend/core/onion-layers';
import {
  type UpdateStatusPort,
  UpdateStatusInputDto,
} from '../../ports/inbound/statuses/update-status.command.port';
import type { ProjectRepositoryPort } from '../../ports/outbound';
import { ProjectId, StatusId } from '../../../domain/value-objects';
import { BaseVoidInboundAdapter } from '../base-void-inbound-adapter';

/**
 * Use case for updating a status.
 */
export class UpdateStatusUseCase
  extends BaseVoidInboundAdapter<UpdateStatusInputDto>
  implements UpdateStatusPort
{
  constructor(private readonly projectRepository: ProjectRepositoryPort) {
    super();
  }

  protected async handle(input: UpdateStatusInputDto): Promise<void> {
    const { projectId, statusId, name, isFinal, order } = input.data;

    const project = await this.projectRepository.findById(ProjectId.create(projectId));
    if (!project) {
      throw new NotFoundError({ message: `Project ${projectId} not found` });
    }

    project.updateStatus(StatusId.create(statusId), { name, isFinal, order });

    await this.projectRepository.save(project);
  }
}
