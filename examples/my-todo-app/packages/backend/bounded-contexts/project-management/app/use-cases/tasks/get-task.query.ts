import { BaseInboundAdapter, NotFoundError } from '@cosmneo/onion-lasagna/backend/core/onion-layers';
import { SKIP_DTO_VALIDATION } from '@cosmneo/onion-lasagna/backend/core/global';
import {
  type GetTaskPort,
  GetTaskInputDto,
  GetTaskOutputDto,
} from '../../ports/inbound/tasks/get-task.query.port';
import type { ProjectQueryRepositoryPort } from '../../ports/outbound';

/**
 * Query for getting a single task by ID.
 */
export class GetTaskQuery
  extends BaseInboundAdapter<GetTaskInputDto, GetTaskOutputDto>
  implements GetTaskPort
{
  constructor(private readonly queryRepository: ProjectQueryRepositoryPort) {
    super();
  }

  protected async handle(input: GetTaskInputDto): Promise<GetTaskOutputDto> {
    const { projectId, taskId } = input.data;

    const task = await this.queryRepository.getTaskById(projectId, taskId);
    if (!task) {
      throw new NotFoundError({ message: `Task ${taskId} not found` });
    }

    return new GetTaskOutputDto(task, SKIP_DTO_VALIDATION);
  }
}
