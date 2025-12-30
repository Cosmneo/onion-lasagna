import { BaseInboundAdapter, NotFoundError } from '@cosmneo/onion-lasagna/backend/core/onion-layers';
import { SKIP_DTO_VALIDATION } from '@cosmneo/onion-lasagna/backend/core/global';
import {
  type AddStatusPort,
  AddStatusInputDto,
  AddStatusOutputDto,
} from '../../ports/inbound/statuses/add-status.command.port';
import type { ProjectRepositoryPort } from '../../ports/outbound';
import { ProjectId, StatusName } from '../../../domain/value-objects';

/**
 * Use case for adding a status to a project.
 */
export class AddStatusUseCase
  extends BaseInboundAdapter<AddStatusInputDto, AddStatusOutputDto>
  implements AddStatusPort
{
  constructor(private readonly projectRepository: ProjectRepositoryPort) {
    super();
  }

  protected async handle(input: AddStatusInputDto): Promise<AddStatusOutputDto> {
    const { projectId, name, isFinal, order } = input.data;

    const project = await this.projectRepository.findById(ProjectId.create(projectId));
    if (!project) {
      throw new NotFoundError({ message: `Project ${projectId} not found` });
    }

    const statusName = StatusName.create(name);
    const status = project.addStatus(statusName, isFinal, order);

    await this.projectRepository.save(project);

    return new AddStatusOutputDto({ statusId: status.id.value }, SKIP_DTO_VALIDATION);
  }
}
