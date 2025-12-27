import * as p from '@clack/prompts';
import pc from 'picocolors';
import { scaffold, STARTERS, type Structure, type Starter, type PackageManager } from './scaffold.js';

const VERSION = '0.1.0';

interface CliArgs {
  name?: string;
  structure?: Structure;
  starter?: Starter;
  validator?: 'zod' | 'valibot' | 'arktype' | 'typebox';
  framework?: 'hono' | 'elysia' | 'fastify';
  packageManager?: PackageManager;
  install?: boolean;
  skipGit?: boolean;
  yes?: boolean;
  help?: boolean;
  version?: boolean;
}

function setupSignalHandlers() {
  const cleanup = () => {
    // Restore terminal cursor visibility
    process.stdout.write('\x1B[?25h');
    console.log('\n');
    p.cancel('Operation cancelled.');
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

function detectPackageManager(): PackageManager {
  const userAgent = process.env.npm_config_user_agent || '';
  if (userAgent.startsWith('yarn')) return 'yarn';
  if (userAgent.startsWith('pnpm')) return 'pnpm';
  if (userAgent.startsWith('bun')) return 'bun';
  if (userAgent.startsWith('npm')) return 'npm';
  return 'bun'; // Default fallback
}

function parseArgs(args: string[]): CliArgs {
  const result: CliArgs = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      result.help = true;
    } else if (arg === '--version' || arg === '-V') {
      result.version = true;
    } else if (arg === '--yes' || arg === '-y') {
      result.yes = true;
    } else if (arg === '--no-install') {
      result.install = false;
    } else if (arg === '--skip-git' || arg === '-g') {
      result.skipGit = true;
    } else if (arg === '--use-npm') {
      result.packageManager = 'npm';
    } else if (arg === '--use-yarn') {
      result.packageManager = 'yarn';
    } else if (arg === '--use-pnpm') {
      result.packageManager = 'pnpm';
    } else if (arg === '--use-bun') {
      result.packageManager = 'bun';
    } else if (arg === '--structure') {
      result.structure = args[++i] as Structure;
    } else if (arg === '--starter' || arg === '-s') {
      result.starter = args[++i] as Starter;
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
  const simpleStarters = Object.entries(STARTERS)
    .filter(([, s]) => s.structure === 'simple')
    .map(([key]) => key);
  const modulesStarters = Object.entries(STARTERS)
    .filter(([, s]) => s.structure === 'modules')
    .map(([key]) => key);

  console.log(`
${pc.bold('create-onion-lasagna-app')} ${pc.dim(`v${VERSION}`)} - Scaffold a new onion-lasagna project

${pc.bold('Usage:')}
  create-onion-lasagna-app [project-name] [options]

${pc.bold('Options:')}
  --structure <type>       Project structure: simple, modules (default: simple)
  -s, --starter <name>     Starter template (filtered by structure)
  -v, --validator <lib>    Validation library: zod, valibot, arktype, typebox (default: zod)
  -f, --framework <fw>     Web framework: hono, elysia, fastify (default: hono)

  --use-bun                Use bun package manager (default)
  --use-npm                Use npm package manager
  --use-yarn               Use yarn package manager
  --use-pnpm               Use pnpm package manager

  -g, --skip-git           Skip git initialization
  --no-install             Skip dependency installation
  -y, --yes                Skip prompts and use defaults

  -V, --version            Show version number
  -h, --help               Show this help message

${pc.bold('Starters:')}
  ${pc.dim('simple structure:')}  ${simpleStarters.join(', ')}
  ${pc.dim('modules structure:')} ${modulesStarters.join(', ')}

${pc.bold('Examples:')}
  create-onion-lasagna-app my-app
  create-onion-lasagna-app my-app --use-pnpm --skip-git
  create-onion-lasagna-app my-app --structure modules -s modules-clean
  create-onion-lasagna-app my-app --yes
`);
}

function getStartersForStructure(structure: Structure) {
  return Object.entries(STARTERS)
    .filter(([, s]) => s.structure === structure)
    .map(([key, s]) => ({
      value: key as Starter,
      label: s.label,
      hint: s.hint,
    }));
}

function getDefaultStarterForStructure(structure: Structure): Starter {
  const starters = Object.entries(STARTERS).filter(([, s]) => s.structure === structure);
  return starters[0]?.[0] as Starter;
}

function getRunCommand(pm: PackageManager): string {
  return pm === 'npm' ? 'npm run' : pm;
}

function getInstallCommand(pm: PackageManager): string {
  return pm === 'yarn' ? 'yarn' : `${pm} install`;
}

async function main() {
  setupSignalHandlers();

  const args = parseArgs(process.argv.slice(2));

  if (args.version) {
    console.log(`create-onion-lasagna-app v${VERSION}`);
    process.exit(0);
  }

  if (args.help) {
    showHelp();
    process.exit(0);
  }

  // Determine package manager: explicit flag > auto-detection > default
  const detectedPm = detectPackageManager();

  // Non-interactive mode with --yes flag
  if (args.yes || (args.name && args.structure && args.starter && args.validator && args.framework)) {
    const structure = args.structure || 'simple';
    const starter = args.starter || getDefaultStarterForStructure(structure);
    const packageManager = args.packageManager || detectedPm;

    // Validate starter matches structure
    const starterConfig = STARTERS[starter];
    if (starterConfig && starterConfig.structure !== structure) {
      console.error(
        pc.red(`Starter "${starter}" is not compatible with structure "${structure}"`)
      );
      console.error(
        pc.dim(`Available starters for ${structure}: ${getStartersForStructure(structure).map((s) => s.value).join(', ')}`)
      );
      process.exit(1);
    }

    const options = {
      name: args.name || 'my-onion-app',
      structure,
      starter,
      validator: args.validator || 'zod',
      framework: args.framework || 'hono',
      packageManager,
      install: args.install !== false,
      skipGit: args.skipGit ?? false,
    };

    console.log(pc.cyan(`\nCreating ${options.name}...\n`));

    try {
      await scaffold(options);

      console.log(pc.green(`\nProject created successfully!`));
      console.log(`\n${pc.bold('Next steps:')}`);
      console.log(pc.dim('─'.repeat(40)));
      console.log(`  cd ${options.name}`);
      if (!options.install) {
        console.log(`  ${getInstallCommand(packageManager)}`);
      }
      console.log(`  ${getRunCommand(packageManager)} dev`);
      console.log('');
    } catch (error) {
      console.error(pc.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
    return;
  }

  // Interactive mode
  console.clear();

  p.intro(pc.bgCyan(pc.black(` create-onion-lasagna-app v${VERSION} `)));

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

      structure: () =>
        p.select({
          message: 'Select project structure',
          initialValue: args.structure,
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

      starter: ({ results }) => {
        const structure = results.structure as Structure;
        const starters = getStartersForStructure(structure);

        // If only one starter, skip the prompt
        if (starters.length === 1) {
          return Promise.resolve(starters[0]!.value);
        }

        return p.select({
          message: 'Select a starter template',
          initialValue: args.starter,
          options: starters,
        });
      },

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

      packageManager: () =>
        p.select({
          message: 'Select a package manager',
          initialValue: args.packageManager || detectedPm,
          options: [
            { value: 'bun', label: 'bun', hint: 'Fast, all-in-one toolkit' },
            { value: 'pnpm', label: 'pnpm', hint: 'Fast, disk space efficient' },
            { value: 'npm', label: 'npm', hint: 'Node.js default package manager' },
            { value: 'yarn', label: 'yarn', hint: 'Classic alternative to npm' },
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

    const packageManager = project.packageManager as PackageManager;

    await scaffold({
      name: project.name as string,
      structure: project.structure as Structure,
      starter: project.starter as Starter,
      validator: project.validator as 'zod' | 'valibot' | 'arktype' | 'typebox',
      framework: project.framework as 'hono' | 'elysia' | 'fastify',
      packageManager,
      install: project.install as boolean,
      skipGit: args.skipGit ?? false,
    });

    s.stop('Project scaffolded!');

    const nextSteps = [
      `cd ${project.name}`,
      project.install ? '' : getInstallCommand(packageManager),
      `${getRunCommand(packageManager)} dev`,
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
