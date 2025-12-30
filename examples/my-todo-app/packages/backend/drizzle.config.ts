import type { Config } from 'drizzle-kit';
import devConfig from './bounded-contexts/project-management/infra/config/drizzle/configs/dev.drizzle-config';
import qaConfig from './bounded-contexts/project-management/infra/config/drizzle/configs/qa.drizzle-config';
import prodConfig from './bounded-contexts/project-management/infra/config/drizzle/configs/prod.drizzle-config';

type Environment = 'dev' | 'qa' | 'prod';

const configs: Record<Environment, Config> = {
  dev: devConfig,
  qa: qaConfig,
  prod: prodConfig,
};

const environment = (process.env.ENVIRONMENT || 'dev') as Environment;

export default configs[environment];
