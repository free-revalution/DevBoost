#!/usr/bin/env node
/**
 * DevBoost CLI Entry Point
 *
 * Usage:
 *   node cli-entry.js              # Start with TUI
 *   node cli-entry.js --no-tui     # Start without TUI (simple mode)
 *   node cli-entry.js --help       # Show help
 */

import { DevBoostCLI } from './cli.js';

// Check for command line arguments
const args = process.argv.slice(2);
const noTui = args.includes('--no-tui');
const showHelp = args.includes('--help') || args.includes('-h');

if (showHelp) {
  console.log(`
DevBoost CLI v0.1.0

USAGE:
  devboost [options]

OPTIONS:
  --no-tui      Run without TUI (simple interactive mode)
  --help, -h    Show this help message

EXAMPLES:
  devboost              # Start with full TUI interface
  devboost --no-tui     # Start in simple mode
  devboost --help       # Show help

ENVIRONMENT VARIABLES:
  ANTHROPIC_API_KEY     API key for Anthropic Claude
  OPENAI_API_KEY        API key for OpenAI

QUICK START:
  1. Set API key: export ANTHROPIC_API_KEY="your-key"
  2. Add model: /model add
  3. Start agent: /agent start

For more information, visit: https://github.com/free-revalution/DevBoost
  `);
  process.exit(0);
}

async function main() {
  const cli = new DevBoostCLI();

  if (noTui) {
    // Simple mode: initialize and show welcome message
    try {
      await cli.initialize();
      cli.initializeForSimpleMode();
      const commandHandler = cli.getCommandHandler();

      if (!commandHandler) {
        console.error('Error: Command handler not initialized');
        process.exit(1);
        return;
      }

      // Check if there are any models configured
      const models = await cli.getConfigManager().getAllModels();
      const currentModel = await cli.getConfigManager().getCurrentModel();

      console.log('\n🚀 DevBoost CLI (Simple Mode)\n');

      if (models.length === 0) {
        console.log('⚠️  No models configured yet!\n');
        console.log('To get started, add a model:');
        console.log('  /model add\n');
      } else {
        console.log(`Current model: ${currentModel?.provider}/${currentModel?.modelName || 'None'}`);
        console.log(`Total models: ${models.length}\n`);
      }

      console.log('Type /help for available commands.');
      console.log('Press Ctrl+C or type /exit to quit.\n');

      // Simple readline interface
      const readline = await import('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const prompt = () => {
        rl.question('> ', async (input) => {
          const trimmed = input.trim();

          if (trimmed === '/exit' || trimmed === '/quit') {
            console.log('Goodbye!');
            rl.close();
            process.exit(0);
            return;
          }

          if (trimmed === '') {
            prompt();
            return;
          }

          try {
            // Check if this is a command
            if (trimmed.startsWith('/')) {
              // Handle model addition sub-commands
              if (commandHandler.isModelAddInProgress()) {
                await handleModelAddStep(trimmed, commandHandler, prompt);
              } else {
                const result = await handleCommand(trimmed, cli, commandHandler);
                console.log(result);
              }
            } else {
              // Regular message - show that agent needs to be started
              if (commandHandler.isAgentStarted()) {
                console.log('Processing message...');
                // TODO: Implement actual message processing
              } else {
                console.log('Agent is not started. Use /agent start to start the agent.');
              }
            }
          } catch (error) {
            console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
          }

          prompt();
        });
      };

      prompt();
    } catch (error) {
      console.error('Error starting DevBoost:', error);
      process.exit(1);
    }
  } else {
    // Full TUI mode
    try {
      await cli.run();
    } catch (error) {
      console.error('Error starting DevBoost:', error);
      process.exit(1);
    }
  }
}

/**
 * Handle model addition interactive steps
 */
async function handleModelAddStep(
  input: string,
  commandHandler: any,
  prompt: () => void
): Promise<void> {
  const parts = input.slice(1).split(/\s+/);
  const command = parts[0];
  const subCommand = parts[1];
  const value = parts.slice(2).join(' ');

  if (command === 'model' && subCommand === 'cancel') {
    const result = await commandHandler.execute({ command: 'model', action: 'cancel', args: [] });
    console.log(result);
    return;
  }

  if (command === 'model' && subCommand === 'provider') {
    const result = await commandHandler.handleModelAddProvider(value);
    console.log(result);
    return;
  }

  if (command === 'model' && subCommand === 'name') {
    const result = await commandHandler.handleModelAddName(value);
    console.log(result);
    return;
  }

  if (command === 'model' && subCommand === 'key') {
    const result = await commandHandler.handleModelAddKey(value);
    console.log(result);
    return;
  }

  // Other commands during model add
  const result = await commandHandler.execute({ command: 'model', action: 'cancel', args: [] });
  console.log(result);
}

/**
 * Handle regular commands
 */
async function handleCommand(input: string, cli: DevBoostCLI, commandHandler: any): Promise<string> {
  const parts = input.slice(1).split(/\s+/);
  const command = parts[0];
  const action = parts[1];
  const args = parts.slice(2);

  const parsedCommand = {
    command,
    action,
    args
  };

  return await commandHandler.execute(parsedCommand);
}

main().catch(console.error);
