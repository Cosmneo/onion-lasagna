import type { ProjectRepositoryPort, ProjectQueryRepositoryPort } from '../app/ports/outbound';

// Project use cases
import { CreateProjectUseCase } from '../app/use-cases/projects/create-project.command';
import { ListProjectsQuery } from '../app/use-cases/projects/list-projects.query';
import { GetProjectQuery } from '../app/use-cases/projects/get-project.query';
import { UpdateProjectUseCase } from '../app/use-cases/projects/update-project.command';
import { DeleteProjectUseCase } from '../app/use-cases/projects/delete-project.command';

// Status use cases
import { AddStatusUseCase } from '../app/use-cases/statuses/add-status.command';
import { ListStatusesQuery } from '../app/use-cases/statuses/list-statuses.query';
import { UpdateStatusUseCase } from '../app/use-cases/statuses/update-status.command';
import { DeleteStatusUseCase } from '../app/use-cases/statuses/delete-status.command';

// Task use cases
import { AddTaskUseCase } from '../app/use-cases/tasks/add-task.command';
import { ListTasksQuery } from '../app/use-cases/tasks/list-tasks.query';
import { GetTaskQuery } from '../app/use-cases/tasks/get-task.query';
import { UpdateTaskUseCase } from '../app/use-cases/tasks/update-task.command';
import { MoveTaskUseCase } from '../app/use-cases/tasks/move-task.command';
import { DeleteTaskUseCase } from '../app/use-cases/tasks/delete-task.command';
import { ListTasksByStatusQuery } from '../app/use-cases/tasks/list-tasks-by-status.query';

export interface UseCaseDeps {
  projectRepository: ProjectRepositoryPort;
  projectQueryRepository: ProjectQueryRepositoryPort;
}

export function createUseCases(deps: UseCaseDeps) {
  return {
    // Project use cases
    createProjectUseCase: new CreateProjectUseCase(deps.projectRepository),
    listProjectsUseCase: new ListProjectsQuery(deps.projectQueryRepository),
    getProjectUseCase: new GetProjectQuery(deps.projectQueryRepository),
    updateProjectUseCase: new UpdateProjectUseCase(deps.projectRepository),
    deleteProjectUseCase: new DeleteProjectUseCase(deps.projectRepository),

    // Status use cases
    addStatusUseCase: new AddStatusUseCase(deps.projectRepository),
    listStatusesUseCase: new ListStatusesQuery(deps.projectQueryRepository),
    updateStatusUseCase: new UpdateStatusUseCase(deps.projectRepository),
    deleteStatusUseCase: new DeleteStatusUseCase(deps.projectRepository),

    // Task use cases
    addTaskUseCase: new AddTaskUseCase(deps.projectRepository),
    listTasksUseCase: new ListTasksQuery(deps.projectQueryRepository),
    getTaskUseCase: new GetTaskQuery(deps.projectQueryRepository),
    updateTaskUseCase: new UpdateTaskUseCase(deps.projectRepository),
    moveTaskUseCase: new MoveTaskUseCase(deps.projectRepository),
    deleteTaskUseCase: new DeleteTaskUseCase(deps.projectRepository),
    listTasksByStatusUseCase: new ListTasksByStatusQuery(deps.projectQueryRepository),
  };
}

export type UseCases = ReturnType<typeof createUseCases>;
