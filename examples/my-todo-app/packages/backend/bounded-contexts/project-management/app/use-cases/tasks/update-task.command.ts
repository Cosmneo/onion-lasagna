import { NotFoundError } from '@cosmneo/onion-lasagna/backend/core/onion-layers';
import {
  type UpdateTaskPort,
  UpdateTaskInputDto,
} from '../../ports/inbound/tasks/update-task.command.port';
import type { ProjectRepositoryPort } from '../../ports/outbound';
import { ProjectId, TaskId } from '../../../domain/value-objects';
import { BaseVoidInboundAdapter } from '../base-void-inbound-adapter';

/**
 * Use case for updating a task.
 */
export class UpdateTaskUseCase
  extends BaseVoidInboundAdapter<UpdateTaskInputDto>
  implements UpdateTaskPort
{
  constructor(private readonly projectRepository: ProjectRepositoryPort) {
    super();
  }

  protected async handle(input: UpdateTaskInputDto): Promise<void> {
    const { projectId, taskId, title, description } = input.data;

    const project = await this.projectRepository.findById(ProjectId.create(projectId));
    if (!project) {
      throw new NotFoundError({ message: `Project ${projectId} not found` });
    }

    project.updateTask(TaskId.create(taskId), { title, description });

    await this.projectRepository.save(project);
  }
}
