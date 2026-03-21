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
      console.log('\n🚀 DevBoost CLI (Simple Mode)\n');
      console.log('Type your message and press Enter to send.');
      console.log('Type /help for available commands.');
      console.log('Press Ctrl+C to exit.\n');

      // Simple readline interface
      const readline = await import('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const prompt = () => {
        rl.question('> ', async (input) => {
          if (input.trim() === '/exit' || input.trim() === '/quit') {
            console.log('Goodbye!');
            rl.close();
            process.exit(0);
          }

          if (input.trim()) {
            // Process input (placeholder - needs proper implementation)
            console.log(`Processing: ${input}`);
            // TODO: Implement actual message processing
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

main().catch(console.error);
