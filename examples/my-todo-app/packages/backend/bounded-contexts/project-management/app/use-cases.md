# Project Management Use Cases

## Commands

| Use Case | Description | Input | Output |
|----------|-------------|-------|--------|
| CreateProject | Creates a new project with default statuses | name, description? | projectId |
| UpdateProject | Updates project name and/or description | projectId, name?, description? | void |
| DeleteProject | Deletes a project and all its tasks/statuses | projectId | void |
| AddStatus | Adds a new status to a project | projectId, name, isFinal, order | statusId |
| UpdateStatus | Updates an existing status | projectId, statusId, name?, isFinal?, order? | void |
| DeleteStatus | Removes a status from a project | projectId, statusId | void |
| AddTask | Creates a new task in a project | projectId, title, statusId?, description? | taskId |
| UpdateTask | Updates task title and/or description | projectId, taskId, title?, description? | void |
| MoveTask | Moves a task to a different status | projectId, taskId, statusId | void |
| DeleteTask | Removes a task from a project | projectId, taskId | void |

## Queries

| Use Case | Description | Input | Output |
|----------|-------------|-------|--------|
| GetProject | Gets a project by ID with statuses and tasks | projectId | Project |
| ListProjects | Lists all projects with pagination | page, pageSize | ProjectSummary[], total |
| GetTask | Gets a single task by ID | projectId, taskId | Task |
| ListTasksByStatus | Lists tasks filtered by status | projectId, statusId, page?, pageSize? | Task[], total |
