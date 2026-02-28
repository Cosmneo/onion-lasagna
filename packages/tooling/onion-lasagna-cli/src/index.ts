import * as p from '@clack/prompts';
import pc from 'picocolors';
import { generateBoundedContext } from './commands/generate-bounded-context.js';
import { generateUseCase } from './commands/generate-use-case.js';
import { generateValueObject } from './commands/generate-value-object.js';
import { generateEntity } from './commands/generate-entity.js';

interface CliArgs {
  command?: string;
  subcommand?: string;
  name?: string;
  help?: boolean;
  type?: string;
  path?: string;
}

function parseArgs(args: string[]): CliArgs {
  const result: CliArgs = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      result.help = true;
    } else if (arg === '--type' || arg === '-t') {
      result.type = args[++i];
    } else if (arg === '--path' || arg === '-p') {
      result.path = args[++i];
    } else if (!arg?.startsWith('-')) {
      if (!result.command) {
        result.command = arg;
      } else if (!result.subcommand) {
        result.subcommand = arg;
      } else if (!result.name) {
        result.name = arg;
      }
    }
  }

  return result;
}

function showHelp() {
  console.log(`
${pc.bold('onion-lasagna')} - Development CLI for onion-lasagna projects

${pc.bold('Usage:')}
  onion-lasagna <command> [options]

${pc.bold('Commands:')}
  generate, g       Generate code scaffolds
    bounded-context, bc   Generate a new bounded context
    use-case, uc          Generate a new use case (command or query)
    value-object, vo      Generate a new value object
    entity, e             Generate a new entity

${pc.bold('Examples:')}
  onion-lasagna generate bounded-context user-management
  onion-lasagna g uc create-user --type command
  onion-lasagna g vo email
  onion-lasagna g entity user

${pc.bold('Options:')}
  -h, --help        Show this help message
  -t, --type        Type of use case (command or query)
  -p, --path        Custom path for generation
`);
}

async function runInteractiveGenerate() {
  const generator = await p.select({
    message: 'What would you like to generate?',
    options: [
      { value: 'bounded-context', label: 'Bounded Context', hint: 'A new domain boundary' },
      { value: 'use-case', label: 'Use Case', hint: 'Command or query' },
      { value: 'value-object', label: 'Value Object', hint: 'Immutable domain value' },
      { value: 'entity', label: 'Entity', hint: 'Domain entity with identity' },
    ],
  });

  if (p.isCancel(generator)) {
    p.cancel('Operation cancelled.');
    process.exit(0);
  }

  switch (generator) {
    case 'bounded-context':
      await generateBoundedContext();
      break;
    case 'use-case':
      await generateUseCase();
      break;
    case 'value-object':
      await generateValueObject();
      break;
    case 'entity':
      await generateEntity();
      break;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    showHelp();
    process.exit(0);
  }

  // No command - show interactive menu
  if (!args.command) {
    console.clear();
    p.intro(pc.bgMagenta(pc.black(' onion-lasagna ')));

    const action = await p.select({
      message: 'What would you like to do?',
      options: [{ value: 'generate', label: 'Generate', hint: 'Scaffold new code' }],
    });

    if (p.isCancel(action)) {
      p.cancel('Operation cancelled.');
      process.exit(0);
    }

    if (action === 'generate') {
      await runInteractiveGenerate();
    }

    p.outro(pc.green('Done!'));
    return;
  }

  // Handle commands
  const command = args.command;
  const subcommand = args.subcommand;

  if (command === 'generate' || command === 'g') {
    if (!subcommand) {
      console.clear();
      p.intro(pc.bgMagenta(pc.black(' onion-lasagna generate ')));
      await runInteractiveGenerate();
      p.outro(pc.green('Done!'));
      return;
    }

    switch (subcommand) {
      case 'bounded-context':
      case 'bc':
        await generateBoundedContext(args.name);
        break;
      case 'use-case':
      case 'uc':
        await generateUseCase(args.name, args.type as 'command' | 'query' | undefined);
        break;
      case 'value-object':
      case 'vo':
        await generateValueObject(args.name);
        break;
      case 'entity':
      case 'e':
        await generateEntity(args.name);
        break;
      default:
        console.error(pc.red(`Unknown generator: ${subcommand}`));
        process.exit(1);
    }
  } else {
    console.error(pc.red(`Unknown command: ${command}`));
    showHelp();
    process.exit(1);
  }
}

main().catch(console.error);
