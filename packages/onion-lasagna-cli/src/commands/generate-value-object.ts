import * as p from '@clack/prompts';
import fs from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';
import { toPascalCase, toCamelCase, toKebabCase } from '../utils/naming.js';
import { findProjectRoot, loadConfig, getBackendPath, writeFileWithDir } from '../utils/project.js';

export async function generateValueObject(name?: string): Promise<void> {
  const projectRoot = findProjectRoot();
  if (!projectRoot) {
    p.log.error(pc.red('Not in an onion-lasagna project. Run this command from your project root.'));
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
    p.log.error(pc.red('No bounded contexts found. Create one first with: onion-lasagna g bc <name>'));
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

  // Get value object name
  let voName = name;
  if (!voName) {
    const result = await p.text({
      message: 'Value object name',
      placeholder: 'email',
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
    voName = result;
  }

  const kebabName = toKebabCase(voName);
  const pascalName = toPascalCase(kebabName);
  const camelName = toCamelCase(kebabName);

  const s = p.spinner();
  s.start(`Creating value object: ${kebabName}`);

  const contextPath = path.join(bcPath, context as string);
  const voPath = path.join(contextPath, 'domain', 'value-objects');

  // Generate Value Object
  const voContent = `import { BaseValueObject } from '@cosmneo/onion-lasagna/backend/core/onion-layers';
import type { BoundValidator } from '@cosmneo/onion-lasagna/backend/core/global';

interface ${pascalName}Props {
  value: string;
}

export class ${pascalName} extends BaseValueObject<${pascalName}Props> {
  private constructor(props: ${pascalName}Props) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }

  static create(value: unknown, validator: BoundValidator<${pascalName}Props>): ${pascalName} {
    const validated = validator.parse(value);
    return new ${pascalName}(validated);
  }

  protected validate(): void {
    // Add custom validation logic if needed
  }
}
`;

  writeFileWithDir(path.join(voPath, `${kebabName}.vo.ts`), voContent);

  // Update index file
  const indexPath = path.join(voPath, 'index.ts');
  const currentIndex = fs.existsSync(indexPath)
    ? fs.readFileSync(indexPath, 'utf-8')
    : `// ${toPascalCase(context as string)} Value Objects\n`;

  if (!currentIndex.includes(`${kebabName}.vo.js`)) {
    const newIndex = currentIndex.replace(
      /^(\/\/ .+\n)?/,
      `$1export { ${pascalName} } from './${kebabName}.vo.js';\n`
    );
    fs.writeFileSync(indexPath, newIndex);
  }

  s.stop(`Value object created: ${kebabName}`);

  p.log.success(pc.green(`Created value object in: ${context}`));
  p.log.info(`
File created:
  domain/value-objects/${kebabName}.vo.ts

Usage:
  import { ${pascalName} } from './${context}/domain/value-objects/index.js';

  const ${camelName} = ${pascalName}.create(rawValue, validator);
`);
}
