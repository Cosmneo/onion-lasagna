import { NotFoundError } from '@cosmneo/onion-lasagna/backend/core/onion-layers';
import {
  type MoveTaskPort,
  MoveTaskInputDto,
} from '../../ports/inbound/tasks/move-task.command.port';
import type { ProjectRepositoryPort } from '../../ports/outbound';
import { ProjectId, TaskId, StatusId } from '../../../domain/value-objects';
import { BaseVoidInboundAdapter } from '../base-void-inbound-adapter';

/**
 * Use case for moving a task to a different status.
 */
export class MoveTaskUseCase
  extends BaseVoidInboundAdapter<MoveTaskInputDto>
  implements MoveTaskPort
{
  constructor(private readonly projectRepository: ProjectRepositoryPort) {
    super();
  }

  protected async handle(input: MoveTaskInputDto): Promise<void> {
    const { projectId, taskId, statusId } = input.data;

    const project = await this.projectRepository.findById(ProjectId.create(projectId));
    if (!project) {
      throw new NotFoundError({ message: `Project ${projectId} not found` });
    }

    project.moveTask(TaskId.create(taskId), StatusId.create(statusId));

    await this.projectRepository.save(project);
  }
}
