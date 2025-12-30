import { BaseInboundAdapter, NotFoundError } from '@cosmneo/onion-lasagna/backend/core/onion-layers';
import { SKIP_DTO_VALIDATION } from '@cosmneo/onion-lasagna/backend/core/global';
import {
  type AddTaskPort,
  AddTaskInputDto,
  AddTaskOutputDto,
} from '../../ports/inbound/tasks/add-task.command.port';
import type { ProjectRepositoryPort } from '../../ports/outbound';
import { ProjectId, StatusId, TaskTitle, TaskDescription } from '../../../domain/value-objects';

/**
 * Use case for adding a task to a project.
 */
export class AddTaskUseCase
  extends BaseInboundAdapter<AddTaskInputDto, AddTaskOutputDto>
  implements AddTaskPort
{
  constructor(private readonly projectRepository: ProjectRepositoryPort) {
    super();
  }

  protected async handle(input: AddTaskInputDto): Promise<AddTaskOutputDto> {
    const { projectId, title, statusId, description } = input.data;

    const project = await this.projectRepository.findById(ProjectId.create(projectId));
    if (!project) {
      throw new NotFoundError({ message: `Project ${projectId} not found` });
    }

    const taskTitle = TaskTitle.create(title);
    const taskStatusId = statusId ? StatusId.create(statusId) : undefined;
    const taskDescription = description ? TaskDescription.create(description) : undefined;

    const task = project.addTask(taskTitle, taskStatusId, taskDescription);

    await this.projectRepository.save(project);

    return new AddTaskOutputDto({ taskId: task.id.value }, SKIP_DTO_VALIDATION);
  }
}
