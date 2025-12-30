import { createAdapters } from './adapters.bootstrap';
import { createUseCases } from './use-cases.bootstrap';
import { createProjectManagementControllers } from './controller.bootstrap';
import { createProjectManagementRoutes } from './routes.bootstrap';

export function bootstrapProjectManagement() {
  // 1. Create adapters (infra layer)
  const adapters = createAdapters();

  // 2. Create use cases with adapters (app layer)
  const useCases = createUseCases(adapters);

  // 3. Create controllers with use cases (presentation layer)
  const controllers = createProjectManagementControllers(useCases);

  // 4. Create routes with controllers
  const routes = createProjectManagementRoutes(controllers);

  return { adapters, useCases, controllers, routes };
}

export type ProjectManagementModule = ReturnType<typeof bootstrapProjectManagement>;

// Re-export all bootstrap modules
export * from './adapters.bootstrap';
export * from './use-cases.bootstrap';
export * from './controller.bootstrap';
export * from './routes.bootstrap';
export * from './validators.bootstrap';
