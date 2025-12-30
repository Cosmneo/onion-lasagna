import {
  ProjectRepositoryAdapter,
  ProjectQueryRepositoryAdapter,
} from '../infra/outbound-adapters/persistence/drizzle';

export function createAdapters() {
  return {
    projectRepository: new ProjectRepositoryAdapter(),
    projectQueryRepository: new ProjectQueryRepositoryAdapter(),
  };
}

export type Adapters = ReturnType<typeof createAdapters>;
