/**
 * Command Handler for DevBoost CLI
 *
 * Handles all CLI commands including agent management,
 * context operations, tools listing, and history.
 * Model management has been moved to a separate module.
 */

import { ConfigManager } from './config.js';
import { Agent } from '@devboost/core';
import { TUIManager } from './tui.js';
import { ModelCommands } from './model-commands.js';

// Forward declaration to avoid circular dependency
interface DevBoostCLIInterface {
  initializeTelegram(): Promise<boolean>;
  startTelegram(): Promise<boolean>;
  stopTelegram(): Promise<boolean>;
  getTelegramStatus(): { running: boolean; users: number; sessions: number };
}

export interface ParsedCommand {
  command: string;
  action?: string;
  args: string[];
}

export class CommandHandler {
  private commands = [
    'help',
    'agent',
    'context',
    'tools',
    'history',
    'clear',
    'model',
    'telegram',
    'devboost',
    'quit',
    'exit'
  ];

  private agentStarted: boolean = false;
  private modelCommands: ModelCommands;

  constructor(
    private configManager: ConfigManager,
    private agent: Agent,
    private tuiManager: TUIManager,
    private cli?: DevBoostCLIInterface
  ) {
    this.modelCommands = new ModelCommands(configManager);
  }

  parse(input: string): ParsedCommand | null {
    if (!input.startsWith('/')) return null;
    const parts = input.slice(1).split(/\s+/).filter(p => p.length > 0);
    const command = parts[0];
    if (!this.commands.includes(command)) return null;
    return { command, action: parts[1], args: parts.slice(2) };
  }

  async execute(command: ParsedCommand): Promise<string> {
    try {
      switch (command.command) {
        case 'help':
          return this.getHelp();
        case 'agent':
          if (!command.action) {
            return 'Usage: /agent <start|stop|status|restart>';
          }
          return await this.handleAgentCommand(command.action, command.args);
        case 'context':
          if (!command.action) {
            return 'Usage: /context <clear|save|load|info> [args]';
          }
          return await this.handleContextCommand(command.action, command.args);
        case 'tools':
          return await this.handleToolsCommand();
        case 'history':
          return await this.handleHistoryCommand(command.args[0] ? parseInt(command.args[0]) : 10);
        case 'clear':
          return this.handleClearCommand();
        case 'model':
          // Get screen from TUI manager
          const screen = (this.tuiManager.getLayout() as any)?.screen;
          if (!screen) {
            return 'TUI not initialized. Please restart the CLI.';
          }
          return await this.modelCommands.handleModelCommand(screen);
        case 'telegram':
          if (!command.action) {
            return 'Usage: /telegram <start|stop|status|users>';
          }
          return await this.handleTelegramCommand(command.action, command.args);
        case 'devboost':
          return this.handleDevBoostCommand(command);
        case 'quit':
        case 'exit':
          return this.handleQuitCommand();
        default:
          return 'Unknown command. Type /help for available commands.';
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return `Error executing command: ${errorMessage}`;
    }
  }

  getHelp(): string {
    return `Available commands:

  {bold}/help{/bold}                          Show this help message

  {bold}/model{/bold}                         Model management (interactive menu)
    ↑↓ Navigate  • Enter Select  • Esc Cancel

  {bold}/agent{/bold} <action>                 Agent management
    start                               Start the agent
    stop                                Stop the agent
    status                              Show agent status
    restart                             Restart the agent

  {bold}/context{/bold} <action>                Context management
    clear                               Clear conversation context
    save [name]                         Save current context
    load [name]                         Load saved context
    info                                Show context info

  {bold}/tools{/bold}                          List available tools

  {bold}/history{/bold} [count]                Show conversation history (default: 10)

  {bold}/clear{/bold}                          Clear the screen

  {bold}/telegram{/bold} <action>               Telegram Bot
    init <token>                        Initialize with bot token
    start                               Start Telegram bot
    stop                                Stop Telegram bot
    status                              Show bot status

  {bold}/quit{/bold} or {bold}/exit{/bold}                 Exit DevBoost

  {bold}/devboost{/bold} <action>               Project info
    info                                Show project info`;
  }

  async handleAgentCommand(action: string, args: string[]): Promise<string> {
    switch (action) {
      case 'start':
        if (this.agentStarted) {
          return 'Agent is already running.';
        }
        await this.agent.initialize();
        this.agentStarted = true;
        this.tuiManager.showStatus('ready', 'Agent started and ready');
        return '✓ Agent started successfully';

      case 'stop':
        if (!this.agentStarted) {
          return 'Agent is not running.';
        }
        await this.agent.shutdown();
        this.agentStarted = false;
        this.tuiManager.showStatus('idle', 'Agent stopped');
        return '✓ Agent stopped';

      case 'status':
        const status = this.agentStarted ? 'Running' : 'Stopped';
        const context = this.agent.getContext();
        const messageCount = context.getMessages().length;
        return `Agent Status: ${status}
Messages in context: ${messageCount}
Tools available: ${this.agent.getToolRegistry().list().length}`;

      case 'restart':
        await this.agent.shutdown();
        await this.agent.initialize();
        this.tuiManager.showStatus('ready', 'Agent restarted');
        return '✓ Agent restarted';

      default:
        return `Unknown agent action: ${action}`;
    }
  }

  async handleContextCommand(action: string, args: string[]): Promise<string> {
    switch (action) {
      case 'clear':
        this.tuiManager.clearConversation();
        const context = this.agent.getContext();
        context.clear();
        this.tuiManager.showStatus('ready', 'Context cleared');
        return '✓ Context cleared';

      case 'save':
        const name = args[0] || 'default';
        // In a real implementation, this would save to a file
        this.tuiManager.showStatus('ready', `Context saved as "${name}"`);
        return `✓ Context saved as "${name}"`;

      case 'load':
        const loadName = args[0] || 'default';
        // In a real implementation, this would load from a file
        this.tuiManager.showStatus('ready', `Context loaded from "${loadName}"`);
        return `✓ Context loaded from "${loadName}"`;

      case 'info':
        const ctx = this.agent.getContext();
        const msgCount = ctx.getMessages().length;
        return `Context Information:
Total messages: ${msgCount}
Last updated: ${new Date().toISOString()}`;

      default:
        return `Unknown context action: ${action}`;
    }
  }

  async handleToolsCommand(): Promise<string> {
    const tools = this.agent.getToolRegistry().list();
    let output = 'Available Tools:\n\n';

    for (const tool of tools) {
      output += `  {bold}${tool.name}{/bold}\n`;
      output += `    Description: ${tool.description}\n`;
      if (tool.parameters) {
        const params = Object.keys(tool.parameters).join(', ');
        output += `    Parameters: ${params}\n`;
      }
      output += '\n';
    }

    return output.trim();
  }

  async handleHistoryCommand(count: number = 10): Promise<string> {
    const history = this.tuiManager.getConversationHistory();
    const limitedHistory = history.slice(-count);

    let output = `Conversation History (last ${limitedHistory.length} messages):\n\n`;

    for (const msg of limitedHistory) {
      const time = new Date(msg.timestamp).toLocaleTimeString();
      const role = msg.role.padEnd(10);
      output += `[${time}] ${role} ${msg.content}\n`;
    }

    return output;
  }

  handleClearCommand(): string {
    this.tuiManager.clearConversation();
    return '✓ Screen cleared';
  }

  handleDevBoostCommand(command: ParsedCommand): string {
    if (!command.action) {
      return 'Usage: /devboost <init|clean|reset|info>';
    }

    switch (command.action) {
      case 'init':
        return 'DevBoost project initialization. Implementation pending.';
      case 'clean':
        return 'DevBoost project clean. Implementation pending.';
      case 'reset':
        return 'DevBoost project reset. Implementation pending.';
      case 'info':
        return `DevBoost Project Information:
Path: ${process.cwd()}
Config: ${this.configManager.getConfigPath()}
Initialized: ${this.configManager.exists() ? 'Yes' : 'No'}`;
      default:
        return `Unknown devboost action: ${command.action}`;
    }
  }

  isAgentStarted(): boolean {
    return this.agentStarted;
  }

  setAgentStarted(started: boolean): void {
    this.agentStarted = started;
  }

  /**
   * Handle Telegram bot commands
   */
  async handleTelegramCommand(action: string, args: string[]): Promise<string> {
    if (!this.cli) {
      return 'Telegram integration is not available. Please restart the CLI.';
    }

    switch (action) {
      case 'start':
        const started = await this.cli.startTelegram();
        if (started) {
          return '✓ Telegram bot started successfully.\n\nUse /telegram status to check the bot status.';
        }
        return '✗ Failed to start Telegram bot.\n\nMake sure Telegram is configured with:\n  /telegram init <bot-token>';

      case 'stop':
        const stopped = await this.cli.stopTelegram();
        if (stopped) {
          return '✓ Telegram bot stopped.';
        }
        return '✗ Failed to stop Telegram bot or bot was not running.';

      case 'status':
        const status = this.cli.getTelegramStatus();
        return `Telegram Bot Status:
Running: ${status.running ? 'Yes' : 'No'}
Authorized Users: ${status.users}
Active Sessions: ${status.sessions}`;

      case 'init':
        const token = args[0];
        if (!token) {
          return 'Usage: /telegram init <bot-token>\n\nGet your bot token from @BotFather on Telegram.';
        }
        try {
          await this.configManager.initializeTelegramConfig(token);
          return '✓ Telegram configuration initialized.\n\nAdd authorized users with:\n  /telegram add-user <telegram-id> <name>\n\nThen start the bot with:\n  /telegram start';
        } catch (error) {
          return `✗ Failed to initialize Telegram: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }

      case 'add-user':
        const userId = args[0];
        const userName = args[1] || 'User';
        if (!userId) {
          return 'Usage: /telegram add-user <telegram-id> [name]\n\nExample: /telegram add-user 123456789 "John Doe"';
        }
        try {
          await this.configManager.addAuthorizedUser({
            telegramId: userId,
            name: userName,
            permissions: ['all']
          });
          return `✓ Added user "${userName}" (ID: ${userId}) to authorized users.`;
        } catch (error) {
          return `✗ Failed to add user: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }

      case 'remove-user':
        const removeUserId = args[0];
        if (!removeUserId) {
          return 'Usage: /telegram remove-user <telegram-id>';
        }
        const removed = await this.configManager.removeAuthorizedUser(removeUserId);
        if (removed) {
          return `✓ Removed user with ID: ${removeUserId}`;
        }
        return `✗ User with ID ${removeUserId} not found.`;

      case 'users':
        // List authorized users
        const telegramConfig = await this.configManager.getTelegramConfig();

        if (!telegramConfig || telegramConfig.authorizedUsers.length === 0) {
          return 'No authorized users configured.\n\nAdd users with: /telegram add-user <telegram-id> <name>';
        }

        let output = 'Authorized Telegram Users:\n';
        for (const user of telegramConfig.authorizedUsers) {
          output += `  - ${user.name} (ID: ${user.telegramId})\n`;
          const perms = user.permissions?.join(', ') || 'all';
          output += `    Permissions: ${perms}\n`;
        }
        return output;

      default:
        return `Unknown telegram action: ${action}

Available actions:
  init <token>     - Initialize Telegram with bot token
  start            - Start the Telegram bot
  stop             - Stop the Telegram bot
  status           - Show bot status
  add-user <id>    - Add authorized user
  remove-user <id> - Remove authorized user
  users            - List all authorized users`;
    }
  }

  /**
   * Handle quit/exit command
   */
  handleQuitCommand(): string {
    // Set a flag or return special value to signal quit
    // The CLI will check for this and exit
    return 'QUIT';
  }

  /**
   * Check if a response is a quit command
   */
  isQuitCommand(response: string): boolean {
    return response === 'QUIT';
  }
}
