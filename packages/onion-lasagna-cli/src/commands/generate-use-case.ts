import * as p from '@clack/prompts';
import fs from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';
import { toPascalCase, toCamelCase, toKebabCase } from '../utils/naming.js';
import { findProjectRoot, loadConfig, getBackendPath, writeFileWithDir } from '../utils/project.js';

export async function generateUseCase(name?: string, type?: 'command' | 'query'): Promise<void> {
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

  const backendPath = getBackendPath(projectRoot, config);
  const bcPath = path.join(backendPath, 'bounded-contexts');

  // Find available bounded contexts
  const contexts = fs.existsSync(bcPath)
    ? fs.readdirSync(bcPath).filter((f) => {
        const stat = fs.statSync(path.join(bcPath, f));
        return stat.isDirectory();
      })
    : [];

  if (contexts.length === 0) {
    p.log.error(
      pc.red('No bounded contexts found. Create one first with: onion-lasagna g bc <name>'),
    );
    process.exit(1);
  }

  // Select bounded context
  const context = await p.select({
    message: 'Select bounded context',
    options: contexts.map((c) => ({ value: c, label: c })),
  });

  if (p.isCancel(context)) {
    p.cancel('Operation cancelled.');
    process.exit(0);
  }

  // Get use case type
  let useCaseType = type;
  if (!useCaseType) {
    const result = await p.select({
      message: 'Use case type',
      options: [
        { value: 'command', label: 'Command', hint: 'Modifies state' },
        { value: 'query', label: 'Query', hint: 'Reads data' },
      ],
    });

    if (p.isCancel(result)) {
      p.cancel('Operation cancelled.');
      process.exit(0);
    }
    useCaseType = result as 'command' | 'query';
  }

  // Get use case name
  let useCaseName = name;
  if (!useCaseName) {
    const result = await p.text({
      message: 'Use case name',
      placeholder: useCaseType === 'command' ? 'create-user' : 'get-user-by-id',
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
    useCaseName = result;
  }

  const kebabName = toKebabCase(useCaseName);
  const pascalName = toPascalCase(kebabName);
  const camelName = toCamelCase(kebabName);
  const typeFolder = useCaseType === 'command' ? 'commands' : 'queries';

  const s = p.spinner();
  s.start(`Creating ${useCaseType}: ${kebabName}`);

  const contextPath = path.join(bcPath, context as string);

  // Generate Port (interface)
  const portContent = `import type { BaseInboundPort } from '@cosmneo/onion-lasagna/backend/core/onion-layers';
import type { ${pascalName}InputDto, ${pascalName}OutputDto } from '../../use-cases/${typeFolder}/${kebabName}/${camelName}.dto.js';

export type ${pascalName}Port = BaseInboundPort<${pascalName}InputDto, ${pascalName}OutputDto>;
`;

  writeFileWithDir(
    path.join(contextPath, 'app', 'ports', 'inbound', typeFolder, `${kebabName}.port.ts`),
    portContent,
  );

  // Generate DTOs
  const dtoContent = `import { BaseDto } from '@cosmneo/onion-lasagna/backend/core/global';
import type { BoundValidator } from '@cosmneo/onion-lasagna/backend/core/global';

export class ${pascalName}InputDto extends BaseDto {
  // Add input properties here

  constructor(props: unknown, validator: BoundValidator<${pascalName}InputDto>) {
    super(props, validator);
  }
}

export class ${pascalName}OutputDto extends BaseDto {
  // Add output properties here

  constructor(props: unknown, validator: BoundValidator<${pascalName}OutputDto>) {
    super(props, validator);
  }
}
`;

  const useCasePath = path.join(contextPath, 'app', 'use-cases', typeFolder, kebabName);
  writeFileWithDir(path.join(useCasePath, `${camelName}.dto.ts`), dtoContent);

  // Generate Use Case
  const useCaseContent = `import { BaseInboundAdapter } from '@cosmneo/onion-lasagna/backend/core/onion-layers';
import type { ${pascalName}Port } from '../../../ports/inbound/${typeFolder}/${kebabName}.port.js';
import type { ${pascalName}InputDto, ${pascalName}OutputDto } from './${camelName}.dto.js';

export class ${pascalName}UseCase
  extends BaseInboundAdapter<${pascalName}InputDto, ${pascalName}OutputDto>
  implements ${pascalName}Port
{
  protected async execute(input: ${pascalName}InputDto): Promise<${pascalName}OutputDto> {
    // Implement your ${useCaseType} logic here
    throw new Error('Not implemented');
  }
}
`;

  writeFileWithDir(path.join(useCasePath, `${camelName}.use-case.ts`), useCaseContent);

  // Generate index file
  const indexContent = `export { ${pascalName}UseCase } from './${camelName}.use-case.js';
export { ${pascalName}InputDto, ${pascalName}OutputDto } from './${camelName}.dto.js';
`;

  writeFileWithDir(path.join(useCasePath, 'index.ts'), indexContent);

  // Update ports index
  const portsIndexPath = path.join(contextPath, 'app', 'ports', 'inbound', typeFolder, 'index.ts');
  const currentPortsIndex = fs.existsSync(portsIndexPath)
    ? fs.readFileSync(portsIndexPath, 'utf-8')
    : `// ${toPascalCase(context as string)} ${useCaseType === 'command' ? 'Command' : 'Query'} Ports\n`;

  if (!currentPortsIndex.includes(`${kebabName}.port.js`)) {
    const newPortsIndex = currentPortsIndex.replace(
      /^(\/\/ .+\n)?/,
      `$1export type { ${pascalName}Port } from './${kebabName}.port.js';\n`,
    );
    fs.writeFileSync(portsIndexPath, newPortsIndex);
  }

  // Update use cases index
  const useCasesIndexPath = path.join(contextPath, 'app', 'use-cases', typeFolder, 'index.ts');
  const currentUseCasesIndex = fs.existsSync(useCasesIndexPath)
    ? fs.readFileSync(useCasesIndexPath, 'utf-8')
    : `// ${toPascalCase(context as string)} ${useCaseType === 'command' ? 'Command' : 'Query'} Use Cases\n`;

  if (!currentUseCasesIndex.includes(`${kebabName}/index.js`)) {
    const newUseCasesIndex = currentUseCasesIndex.replace(
      /^(\/\/ .+\n)?/,
      `$1export * from './${kebabName}/index.js';\n`,
    );
    fs.writeFileSync(useCasesIndexPath, newUseCasesIndex);
  }

  s.stop(`${useCaseType === 'command' ? 'Command' : 'Query'} created: ${kebabName}`);

  p.log.success(pc.green(`Created ${useCaseType} in: ${context}`));
  p.log.info(`
Files created:
  app/ports/inbound/${typeFolder}/${kebabName}.port.ts
  app/use-cases/${typeFolder}/${kebabName}/
    ├── ${camelName}.dto.ts
    ├── ${camelName}.use-case.ts
    └── index.ts
`);
}
