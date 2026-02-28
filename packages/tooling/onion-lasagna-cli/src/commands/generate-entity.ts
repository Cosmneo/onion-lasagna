import * as p from '@clack/prompts';
import fs from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';
import { toPascalCase, toCamelCase, toKebabCase } from '../utils/naming.js';
import { findProjectRoot, loadConfig, getBackendPath, writeFileWithDir } from '../utils/project.js';

export async function generateEntity(name?: string): Promise<void> {
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

  // Get entity name
  let entityName = name;
  if (!entityName) {
    const result = await p.text({
      message: 'Entity name',
      placeholder: 'user',
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
    entityName = result;
  }

  const kebabName = toKebabCase(entityName);
  const pascalName = toPascalCase(kebabName);
  const camelName = toCamelCase(kebabName);

  const s = p.spinner();
  s.start(`Creating entity: ${kebabName}`);

  const contextPath = path.join(bcPath, context as string);
  const entitiesPath = path.join(contextPath, 'domain', 'entities');

  // Generate Entity
  const entityContent = `import { BaseEntity } from '@cosmneo/onion-lasagna';

interface ${pascalName}Props {
  id: string;
  // Add your entity properties here
  createdAt: Date;
  updatedAt: Date;
}

export class ${pascalName} extends BaseEntity<${pascalName}Props> {
  private constructor(props: ${pascalName}Props) {
    super(props);
  }

  get id(): string {
    return this.props.id;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  static create(props: Omit<${pascalName}Props, 'createdAt' | 'updatedAt'>): ${pascalName} {
    const now = new Date();
    return new ${pascalName}({
      ...props,
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstitute(props: ${pascalName}Props): ${pascalName} {
    return new ${pascalName}(props);
  }

  protected validate(): void {
    if (!this.props.id) {
      throw new Error('${pascalName} id is required');
    }
  }
}
`;

  writeFileWithDir(path.join(entitiesPath, `${kebabName}.entity.ts`), entityContent);

  // Update index file
  const indexPath = path.join(entitiesPath, 'index.ts');
  const currentIndex = fs.existsSync(indexPath)
    ? fs.readFileSync(indexPath, 'utf-8')
    : `// ${toPascalCase(context as string)} Entities\n`;

  if (!currentIndex.includes(`${kebabName}.entity.js`)) {
    const newIndex = currentIndex.replace(
      /^(\/\/ .+\n)?/,
      `$1export { ${pascalName} } from './${kebabName}.entity.js';\n`,
    );
    fs.writeFileSync(indexPath, newIndex);
  }

  s.stop(`Entity created: ${kebabName}`);

  p.log.success(pc.green(`Created entity in: ${context}`));
  p.log.info(`
File created:
  domain/entities/${kebabName}.entity.ts

Usage:
  import { ${pascalName} } from './${context}/domain/entities/index.js';

  // Create new entity
  const ${camelName} = ${pascalName}.create({ id: 'uuid', /* ... */ });

  // Reconstitute from persistence
  const ${camelName}FromDb = ${pascalName}.reconstitute(dbRecord);
`);
}
