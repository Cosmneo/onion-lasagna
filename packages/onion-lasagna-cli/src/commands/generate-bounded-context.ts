import * as p from '@clack/prompts';
import path from 'node:path';
import pc from 'picocolors';
import { toPascalCase, toKebabCase } from '../utils/naming.js';
import { findProjectRoot, loadConfig, getBackendPath, writeFileWithDir } from '../utils/project.js';

export async function generateBoundedContext(name?: string): Promise<void> {
  const projectRoot = findProjectRoot();
  if (!projectRoot) {
    p.log.error(
      pc.red('Not in an onion-lasagna project. Run this command from your project root.'),
    );
    process.exit(1);
  }

  const config = loadConfig(projectRoot);
  if (!config) {
    p.log.error(pc.red('Could not load .onion-lasagna.json config.'));
    process.exit(1);
  }

  let contextName = name;
  if (!contextName) {
    const result = await p.text({
      message: 'Bounded context name',
      placeholder: 'user-management',
      validate: (value) => {
        if (!value) return 'Name is required';
        if (!/^[a-z][a-z0-9-]*$/.test(value)) {
          return 'Name must be kebab-case (lowercase letters, numbers, hyphens)';
        }
      },
    });

    if (p.isCancel(result)) {
      p.cancel('Operation cancelled.');
      process.exit(0);
    }
    contextName = result;
  }

  const kebabName = toKebabCase(contextName);
  const pascalName = toPascalCase(kebabName);

  const backendPath = getBackendPath(projectRoot, config);
  const bcPath = path.join(backendPath, 'bounded-contexts', kebabName);

  const s = p.spinner();
  s.start(`Creating bounded context: ${kebabName}`);

  // Domain layer
  writeFileWithDir(
    path.join(bcPath, 'domain', 'value-objects', 'index.ts'),
    `// ${pascalName} Value Objects\nexport {};\n`,
  );

  writeFileWithDir(
    path.join(bcPath, 'domain', 'entities', 'index.ts'),
    `// ${pascalName} Entities\nexport {};\n`,
  );

  writeFileWithDir(
    path.join(bcPath, 'domain', 'aggregates', 'index.ts'),
    `// ${pascalName} Aggregates\nexport {};\n`,
  );

  writeFileWithDir(
    path.join(bcPath, 'domain', 'exceptions', 'index.ts'),
    `// ${pascalName} Domain Exceptions\nexport {};\n`,
  );

  writeFileWithDir(
    path.join(bcPath, 'domain', 'index.ts'),
    `export * from './value-objects/index.js';\nexport * from './entities/index.js';\nexport * from './aggregates/index.js';\nexport * from './exceptions/index.js';\n`,
  );

  // Application layer
  writeFileWithDir(
    path.join(bcPath, 'app', 'ports', 'inbound', 'commands', 'index.ts'),
    `// ${pascalName} Command Ports\nexport {};\n`,
  );

  writeFileWithDir(
    path.join(bcPath, 'app', 'ports', 'inbound', 'queries', 'index.ts'),
    `// ${pascalName} Query Ports\nexport {};\n`,
  );

  writeFileWithDir(
    path.join(bcPath, 'app', 'ports', 'inbound', 'index.ts'),
    `export * from './commands/index.js';\nexport * from './queries/index.js';\n`,
  );

  writeFileWithDir(
    path.join(bcPath, 'app', 'ports', 'outbound', 'index.ts'),
    `// ${pascalName} Outbound Ports\nexport {};\n`,
  );

  writeFileWithDir(
    path.join(bcPath, 'app', 'ports', 'index.ts'),
    `export * from './inbound/index.js';\nexport * from './outbound/index.js';\n`,
  );

  writeFileWithDir(
    path.join(bcPath, 'app', 'use-cases', 'commands', 'index.ts'),
    `// ${pascalName} Command Use Cases\nexport {};\n`,
  );

  writeFileWithDir(
    path.join(bcPath, 'app', 'use-cases', 'queries', 'index.ts'),
    `// ${pascalName} Query Use Cases\nexport {};\n`,
  );

  writeFileWithDir(
    path.join(bcPath, 'app', 'use-cases', 'index.ts'),
    `export * from './commands/index.js';\nexport * from './queries/index.js';\n`,
  );

  writeFileWithDir(
    path.join(bcPath, 'app', 'index.ts'),
    `export * from './ports/index.js';\nexport * from './use-cases/index.js';\n`,
  );

  // Infrastructure layer
  writeFileWithDir(
    path.join(bcPath, 'infra', 'outbound-adapters', 'index.ts'),
    `// ${pascalName} Outbound Adapters\nexport {};\n`,
  );

  writeFileWithDir(
    path.join(bcPath, 'infra', 'validators', 'index.ts'),
    `// ${pascalName} Validators\nexport {};\n`,
  );

  writeFileWithDir(
    path.join(bcPath, 'infra', 'schemas', 'index.ts'),
    `// ${pascalName} Schemas\nexport {};\n`,
  );

  writeFileWithDir(
    path.join(bcPath, 'infra', 'index.ts'),
    `export * from './outbound-adapters/index.js';\nexport * from './validators/index.js';\nexport * from './schemas/index.js';\n`,
  );

  // Presentation layer
  writeFileWithDir(
    path.join(bcPath, 'presentation', 'controllers', 'index.ts'),
    `// ${pascalName} Controllers\nexport {};\n`,
  );

  writeFileWithDir(
    path.join(bcPath, 'presentation', 'index.ts'),
    `export * from './controllers/index.js';\n`,
  );

  // Root index
  writeFileWithDir(
    path.join(bcPath, 'index.ts'),
    `export * from './domain/index.js';\nexport * from './app/index.js';\nexport * from './infra/index.js';\nexport * from './presentation/index.js';\n`,
  );

  s.stop(`Bounded context created: ${kebabName}`);

  p.log.success(pc.green(`Created bounded context at: ${bcPath}`));
  p.log.info(`
Structure:
  ${kebabName}/
  ├── domain/
  │   ├── value-objects/
  │   ├── entities/
  │   ├── aggregates/
  │   └── exceptions/
  ├── app/
  │   ├── ports/
  │   │   ├── inbound/
  │   │   │   ├── commands/
  │   │   │   └── queries/
  │   │   └── outbound/
  │   └── use-cases/
  │       ├── commands/
  │       └── queries/
  ├── infra/
  │   ├── outbound-adapters/
  │   ├── validators/
  │   └── schemas/
  └── presentation/
      └── controllers/
`);
}
