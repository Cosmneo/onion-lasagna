import * as p from '@clack/prompts';
import pc from 'picocolors';
import { scaffold } from './scaffold.js';

interface CliArgs {
  name?: string;
  starter?: 'simple' | 'modules';
  validator?: 'zod' | 'valibot' | 'arktype' | 'typebox';
  framework?: 'hono' | 'elysia' | 'fastify';
  install?: boolean;
  yes?: boolean;
  help?: boolean;
}

function parseArgs(args: string[]): CliArgs {
  const result: CliArgs = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      result.help = true;
    } else if (arg === '--yes' || arg === '-y') {
      result.yes = true;
    } else if (arg === '--no-install') {
      result.install = false;
    } else if (arg === '--starter' || arg === '-s') {
      result.starter = args[++i] as CliArgs['starter'];
    } else if (arg === '--validator' || arg === '-v') {
      result.validator = args[++i] as CliArgs['validator'];
    } else if (arg === '--framework' || arg === '-f') {
      result.framework = args[++i] as CliArgs['framework'];
    } else if (!arg?.startsWith('-') && !result.name) {
      result.name = arg;
    }
  }

  return result;
}

function showHelp() {
  console.log(`
${pc.bold('create-onion-lasagna-app')} - Scaffold a new onion-lasagna project

${pc.bold('Usage:')}
  create-onion-lasagna-app [project-name] [options]

${pc.bold('Options:')}
  -s, --starter <type>     Starter template: simple, modules (default: simple)
  -v, --validator <lib>    Validation library: zod, valibot, arktype, typebox (default: zod)
  -f, --framework <fw>     Web framework: hono, elysia, fastify (default: hono)
  -y, --yes                Skip prompts and use defaults
  --no-install             Skip dependency installation
  -h, --help               Show this help message

${pc.bold('Examples:')}
  create-onion-lasagna-app my-app
  create-onion-lasagna-app my-app -s modules -v zod -f hono
  create-onion-lasagna-app my-app --yes
`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    showHelp();
    process.exit(0);
  }

  // Non-interactive mode with --yes flag
  if (args.yes || (args.name && args.starter && args.validator && args.framework)) {
    const options = {
      name: args.name || 'my-onion-app',
      starter: args.starter || 'simple',
      validator: args.validator || 'zod',
      framework: args.framework || 'hono',
      install: args.install !== false,
    };

    console.log(pc.cyan(`Creating ${options.name}...`));

    try {
      await scaffold(options);
      console.log(pc.green(`\nProject created successfully!`));
      console.log(`\nNext steps:`);
      console.log(`  cd ${options.name}`);
      if (!options.install) console.log(`  bun install`);
      console.log(`  bun run dev`);
    } catch (error) {
      console.error(pc.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
    return;
  }

  // Interactive mode
  console.clear();

  p.intro(pc.bgCyan(pc.black(' create-onion-lasagna-app ')));

  const project = await p.group(
    {
      name: () =>
        p.text({
          message: 'Project name',
          placeholder: 'my-onion-app',
          defaultValue: args.name || 'my-onion-app',
          validate: (value) => {
            if (!value) return 'Project name is required';
            if (!/^[a-z0-9-_]+$/.test(value)) {
              return 'Project name can only contain lowercase letters, numbers, hyphens, and underscores';
            }
          },
        }),

      starter: () =>
        p.select({
          message: 'Select a starter template',
          initialValue: args.starter,
          options: [
            {
              value: 'simple',
              label: 'Simple',
              hint: 'Flat structure, great for small to medium projects',
            },
            {
              value: 'modules',
              label: 'Modules',
              hint: 'Module-based structure for large enterprise projects',
            },
          ],
        }),

      validator: () =>
        p.select({
          message: 'Select a validation library',
          initialValue: args.validator,
          options: [
            { value: 'zod', label: 'Zod', hint: 'Most popular, great TypeScript inference' },
            { value: 'valibot', label: 'Valibot', hint: 'Smallest bundle size' },
            { value: 'arktype', label: 'ArkType', hint: 'Fastest runtime validation' },
            { value: 'typebox', label: 'TypeBox', hint: 'JSON Schema compatible' },
          ],
        }),

      framework: () =>
        p.select({
          message: 'Select a web framework',
          initialValue: args.framework,
          options: [
            { value: 'hono', label: 'Hono', hint: 'Fast, lightweight, works everywhere' },
            { value: 'elysia', label: 'Elysia', hint: 'Bun-optimized, end-to-end type safety' },
            { value: 'fastify', label: 'Fastify', hint: 'Mature, plugin ecosystem' },
          ],
        }),

      install: () =>
        p.confirm({
          message: 'Install dependencies?',
          initialValue: args.install !== false,
        }),
    },
    {
      onCancel: () => {
        p.cancel('Operation cancelled.');
        process.exit(0);
      },
    },
  );

  const s = p.spinner();

  try {
    s.start('Scaffolding project...');

    await scaffold({
      name: project.name as string,
      starter: project.starter as 'simple' | 'modules',
      validator: project.validator as 'zod' | 'valibot' | 'arktype' | 'typebox',
      framework: project.framework as 'hono' | 'elysia' | 'fastify',
      install: project.install as boolean,
    });

    s.stop('Project scaffolded!');

    const nextSteps = [
      `cd ${project.name}`,
      project.install ? '' : 'bun install',
      'bun run dev',
    ].filter(Boolean);

    p.note(nextSteps.join('\n'), 'Next steps');

    p.outro(pc.green('Happy coding!'));
  } catch (error) {
    s.stop('Failed to scaffold project');
    p.log.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main().catch(console.error);
