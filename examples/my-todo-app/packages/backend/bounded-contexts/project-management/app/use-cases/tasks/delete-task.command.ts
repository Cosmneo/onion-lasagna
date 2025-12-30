import { NotFoundError } from '@cosmneo/onion-lasagna/backend/core/onion-layers';
import {
  type DeleteTaskPort,
  DeleteTaskInputDto,
} from '../../ports/inbound/tasks/delete-task.command.port';
import type { ProjectRepositoryPort } from '../../ports/outbound';
import { ProjectId, TaskId } from '../../../domain/value-objects';
import { BaseVoidInboundAdapter } from '../base-void-inbound-adapter';

/**
 * Use case for deleting a task from a project.
 */
export class DeleteTaskUseCase
  extends BaseVoidInboundAdapter<DeleteTaskInputDto>
  implements DeleteTaskPort
{
  constructor(private readonly projectRepository: ProjectRepositoryPort) {
    super();
  }

  protected async handle(input: DeleteTaskInputDto): Promise<void> {
    const { projectId, taskId } = input.data;

    const project = await this.projectRepository.findById(ProjectId.create(projectId));
    if (!project) {
      throw new NotFoundError({ message: `Project ${projectId} not found` });
    }

    project.deleteTask(TaskId.create(taskId));

    await this.projectRepository.save(project);
  }
}
