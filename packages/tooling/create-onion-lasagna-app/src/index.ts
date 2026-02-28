import fs from 'node:fs';
import path from 'node:path';
import * as p from '@clack/prompts';
import pc from 'picocolors';
import {
  scaffold,
  STARTERS,
  validateProjectName,
  type Structure,
  type Starter,
  type PackageManager,
} from './scaffold.js';

const VERSION = '0.1.2';

interface CliArgs {
  name?: string;
  structure?: Structure;
  starter?: Starter;
  validator?: 'zod' | 'typebox';
  framework?: 'hono' | 'elysia' | 'fastify';
  packageManager?: PackageManager;
  install?: boolean;
  skipGit?: boolean;
  vscode?: boolean;
  dryRun?: boolean;
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
    } else if (arg === '--vscode') {
      result.vscode = true;
    } else if (arg === '--no-vscode') {
      result.vscode = false;
    } else if (arg === '--dry-run' || arg === '-d') {
      result.dryRun = true;
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
  -v, --validator <lib>    Validation library: zod, typebox (default: zod)
  -f, --framework <fw>     Web framework: hono, elysia, fastify (default: hono)

  --use-bun                Use bun package manager (default)
  --use-npm                Use npm package manager
  --use-yarn               Use yarn package manager
  --use-pnpm               Use pnpm package manager

  -g, --skip-git           Skip git initialization
  --no-install             Skip dependency installation
  --vscode                 Add VS Code settings to hide artifacts (default: prompt)
  --no-vscode              Skip VS Code settings
  -d, --dry-run            Show what would be created without making changes
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
  create-onion-lasagna-app my-app --dry-run
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

function showDryRunOutput(options: {
  name: string;
  structure: Structure;
  starter: Starter;
  validator: string;
  framework: string;
  packageManager: PackageManager;
  install: boolean;
  skipGit: boolean;
  vscode: boolean;
}) {
  const targetDir = path.resolve(process.cwd(), options.name);

  console.log(`\n${pc.bgYellow(pc.black(' DRY RUN '))} No changes will be made.\n`);
  console.log(`${pc.bold('Project Configuration:')}`);
  console.log(pc.dim('─'.repeat(50)));
  console.log(`  ${pc.cyan('Name:')}           ${options.name}`);
  console.log(`  ${pc.cyan('Directory:')}      ${targetDir}`);
  console.log(`  ${pc.cyan('Structure:')}      ${options.structure}`);
  console.log(`  ${pc.cyan('Starter:')}        ${options.starter}`);
  console.log(`  ${pc.cyan('Validator:')}      ${options.validator}`);
  console.log(`  ${pc.cyan('Framework:')}      ${options.framework}`);
  console.log(`  ${pc.cyan('Package Manager:')} ${options.packageManager}`);
  console.log(`  ${pc.cyan('Install deps:')}   ${options.install ? 'yes' : 'no'}`);
  console.log(`  ${pc.cyan('Git init:')}       ${options.skipGit ? 'no' : 'yes'}`);
  console.log(`  ${pc.cyan('VS Code config:')} ${options.vscode ? 'yes' : 'no'}`);

  console.log(`\n${pc.bold('Files that would be created:')}`);
  console.log(pc.dim('─'.repeat(50)));
  console.log(`  ${pc.green('+')} ${options.name}/`);
  console.log(`  ${pc.green('+')} ${options.name}/package.json`);
  console.log(`  ${pc.green('+')} ${options.name}/.onion-lasagna.json`);
  console.log(`  ${pc.green('+')} ${options.name}/packages/backend/`);
  console.log(`  ${pc.green('+')} ${options.name}/packages/backend/package.json`);
  console.log(`  ${pc.green('+')} ${options.name}/packages/backend/.env`);
  console.log(`  ${pc.green('+')} ${options.name}/packages/backend/.env.example`);
  if (!options.skipGit) {
    console.log(`  ${pc.green('+')} ${options.name}/.git/`);
  }
  if (options.vscode) {
    console.log(`  ${pc.green('+')} ${options.name}/.vscode/settings.json`);
  }

  console.log(`\n${pc.bold('Actions that would be performed:')}`);
  console.log(pc.dim('─'.repeat(50)));
  console.log(`  ${pc.blue('1.')} Clone starter template from GitHub`);
  console.log(`  ${pc.blue('2.')} Update package.json with project name`);
  console.log(`  ${pc.blue('3.')} Add ${options.validator} and ${options.framework} dependencies`);
  console.log(`  ${pc.blue('4.')} Create environment files`);
  console.log(`  ${pc.blue('5.')} Create .onion-lasagna.json config`);
  if (options.install) {
    console.log(`  ${pc.blue('6.')} Run ${getInstallCommand(options.packageManager)}`);
  }
  if (!options.skipGit) {
    console.log(`  ${pc.blue(options.install ? '7.' : '6.')} Initialize git repository`);
  }

  console.log(`\n${pc.dim('Run without --dry-run to create the project.')}\n`);
}

function showRichPostInstall(options: {
  name: string;
  packageManager: PackageManager;
  install: boolean;
  skipGit: boolean;
}) {
  const { name, packageManager, install, skipGit } = options;
  const run = getRunCommand(packageManager);

  console.log(
    `\n${pc.green('Success!')} Created ${pc.bold(name)} at ${pc.dim(path.resolve(process.cwd(), name))}`,
  );
  console.log(`\n${pc.bold('Inside that directory, you can run:')}`);
  console.log(pc.dim('─'.repeat(50)));

  console.log(`\n  ${pc.cyan(`${run} dev`)}`);
  console.log(`    ${pc.dim('Start the development server')}`);

  console.log(`\n  ${pc.cyan(`${run} build`)}`);
  console.log(`    ${pc.dim('Build for production')}`);

  console.log(`\n  ${pc.cyan(`${run} test`)}`);
  console.log(`    ${pc.dim('Run tests')}`);

  console.log(`\n  ${pc.cyan(`${run} lint`)}`);
  console.log(`    ${pc.dim('Check for linting errors')}`);

  console.log(`\n${pc.bold('We suggest you begin by typing:')}`);
  console.log(pc.dim('─'.repeat(50)));
  console.log(`\n  ${pc.cyan(`cd ${name}`)}`);
  if (!install) {
    console.log(`  ${pc.cyan(getInstallCommand(packageManager))}`);
  }
  console.log(`  ${pc.cyan(`${run} dev`)}`);

  if (!skipGit) {
    console.log(`\n${pc.dim('A git repository has been initialized with an initial commit.')}`);
  }

  console.log('');
}

async function checkDirectoryConflict(name: string): Promise<'overwrite' | 'new-name' | 'cancel'> {
  const targetDir = path.resolve(process.cwd(), name);

  if (!fs.existsSync(targetDir)) {
    return 'overwrite'; // No conflict
  }

  const files = fs.readdirSync(targetDir);
  if (files.length === 0) {
    return 'overwrite'; // Empty directory is fine
  }

  // Directory exists and has files
  p.log.warn(`Directory ${pc.cyan(name)} already exists and is not empty.`);

  const action = await p.select({
    message: 'How would you like to proceed?',
    options: [
      { value: 'overwrite', label: 'Overwrite', hint: 'Remove existing files and continue' },
      { value: 'new-name', label: 'Choose a different name', hint: 'Enter a new project name' },
      { value: 'cancel', label: 'Cancel', hint: 'Abort the operation' },
    ],
  });

  if (p.isCancel(action)) {
    return 'cancel';
  }

  return action as 'overwrite' | 'new-name' | 'cancel';
}

function removeDirectory(dir: string): void {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
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
  if (
    args.yes ||
    (args.name && args.structure && args.starter && args.validator && args.framework)
  ) {
    const structure = args.structure || 'simple';
    const starter = args.starter || getDefaultStarterForStructure(structure);
    const packageManager = args.packageManager || detectedPm;

    // Validate project name
    const nameValidation = validateProjectName(args.name || 'my-onion-app');
    if (!nameValidation.valid) {
      console.error(pc.red(`Invalid project name: ${nameValidation.error}`));
      if (nameValidation.suggestion) {
        console.error(pc.dim(`Suggestion: ${nameValidation.suggestion}`));
      }
      process.exit(1);
    }

    // Validate starter matches structure
    const starterConfig = STARTERS[starter];
    if (starterConfig && starterConfig.structure !== structure) {
      console.error(pc.red(`Starter "${starter}" is not compatible with structure "${structure}"`));
      console.error(
        pc.dim(
          `Available starters for ${structure}: ${getStartersForStructure(structure)
            .map((s) => s.value)
            .join(', ')}`,
        ),
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
      vscode: args.vscode ?? true, // Default to true in non-interactive mode
    };

    // Dry run mode
    if (args.dryRun) {
      showDryRunOutput(options);
      process.exit(0);
    }

    // Check for directory conflict in non-interactive mode
    const targetDir = path.resolve(process.cwd(), options.name);
    if (fs.existsSync(targetDir)) {
      const files = fs.readdirSync(targetDir);
      if (files.length > 0) {
        console.error(pc.red(`Directory "${options.name}" already exists and is not empty.`));
        console.error(pc.dim('Use interactive mode or choose a different name.'));
        process.exit(1);
      }
    }

    console.log(pc.cyan(`\nCreating ${options.name}...\n`));

    try {
      await scaffold(options);
      showRichPostInstall(options);
    } catch (error) {
      console.error(pc.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
    return;
  }

  // Interactive mode
  console.clear();

  p.intro(pc.bgCyan(pc.black(` create-onion-lasagna-app v${VERSION} `)));

  let projectName = args.name || 'my-onion-app';
  let needsNewName = false;

  // Validate initial name if provided
  if (args.name) {
    const nameValidation = validateProjectName(args.name);
    if (!nameValidation.valid) {
      p.log.warn(`Invalid project name: ${nameValidation.error}`);
      if (nameValidation.suggestion) {
        p.log.info(`Suggestion: ${nameValidation.suggestion}`);
      }
      needsNewName = true;
    }
  }

  // Check for directory conflict before starting prompts
  if (!needsNewName && projectName) {
    const conflictAction = await checkDirectoryConflict(projectName);
    if (conflictAction === 'cancel') {
      p.cancel('Operation cancelled.');
      process.exit(0);
    } else if (conflictAction === 'overwrite') {
      const targetDir = path.resolve(process.cwd(), projectName);
      if (fs.existsSync(targetDir) && fs.readdirSync(targetDir).length > 0) {
        removeDirectory(targetDir);
        p.log.info(`Removed existing directory: ${projectName}`);
      }
    } else if (conflictAction === 'new-name') {
      needsNewName = true;
    }
  }

  const project = await p.group(
    {
      name: () => {
        if (!needsNewName && args.name) {
          return Promise.resolve(args.name);
        }
        return p.text({
          message: 'Project name',
          placeholder: 'my-onion-app',
          defaultValue: needsNewName ? '' : projectName,
          validate: (value) => {
            if (!value) return 'Project name is required';
            const validation = validateProjectName(value);
            if (!validation.valid) {
              return (
                validation.error + (validation.suggestion ? ` (try: ${validation.suggestion})` : '')
              );
            }
            // Check if directory exists
            const targetDir = path.resolve(process.cwd(), value);
            if (fs.existsSync(targetDir) && fs.readdirSync(targetDir).length > 0) {
              return `Directory "${value}" already exists and is not empty`;
            }
          },
        });
      },

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

      vscode: () =>
        p.confirm({
          message: 'Add VS Code settings to hide artifacts?',
          initialValue: args.vscode !== false,
        }),
    },
    {
      onCancel: () => {
        p.cancel('Operation cancelled.');
        process.exit(0);
      },
    },
  );

  const packageManager = project.packageManager as PackageManager;
  const scaffoldOptions = {
    name: project.name as string,
    structure: project.structure as Structure,
    starter: project.starter as Starter,
    validator: project.validator as 'zod' | 'typebox',
    framework: project.framework as 'hono' | 'elysia' | 'fastify',
    packageManager,
    install: project.install as boolean,
    skipGit: args.skipGit ?? false,
    vscode: project.vscode as boolean,
  };

  // Dry run mode
  if (args.dryRun) {
    showDryRunOutput(scaffoldOptions);
    p.outro(pc.dim('Dry run complete. No changes were made.'));
    process.exit(0);
  }

  const s = p.spinner();

  try {
    s.start('Scaffolding project...');

    await scaffold(scaffoldOptions);

    s.stop('Project scaffolded!');

    showRichPostInstall({
      name: project.name as string,
      packageManager,
      install: project.install as boolean,
      skipGit: args.skipGit ?? false,
    });

    p.outro(pc.green('Happy coding!'));
  } catch (error) {
    s.stop('Failed to scaffold project');
    p.log.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main().catch(console.error);
