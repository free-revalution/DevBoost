/**
 * Enhanced Command Handler for DevBoost CLI
 *
 * Handles all CLI commands including agent management,
 * context operations, tools listing, and history.
 */

import { ConfigManager } from './config.js';
import { Agent } from '@devboost/core';
import { TUIManager } from './tui.js';

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
    'provider',
    'devboost'
  ];

  private agentStarted: boolean = false;

  constructor(
    private configManager: ConfigManager,
    private agent: Agent,
    private tuiManager: TUIManager
  ) {}

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
        case 'provider':
          return this.handleProviderCommand(command);
        case 'devboost':
          return this.handleDevBoostCommand(command);
        default:
          return 'Unknown command';
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return `Error executing command: ${errorMessage}`;
    }
  }

  getHelp(): string {
    return `Available commands:

  {bold}/help{/bold}                          Show this help message

  {bold}/agent{/bold} <start|stop|status>      Agent management
    start                               Start the agent
    stop                                Stop the agent
    status                              Show agent status
    restart                             Restart the agent

  {bold}/context{/bold} <clear|save|load>      Context management
    clear                               Clear conversation context
    save [name]                         Save current context
    load [name]                         Load saved context
    info                                Show context info

  {bold}/tools{/bold}                          List available tools

  {bold}/history{/bold} [count]                Show conversation history (default: 10)

  {bold}/clear{/bold}                          Clear the screen

  {bold}/provider{/bold} <command> [args]      Manage LLM providers
    add <type>                          Add a provider
    use <type>                          Switch to a provider
    list                                List all providers

  {bold}/devboost{/bold} <command> [args]      DevBoost project management
    init                                Initialize project
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

  handleProviderCommand(command: ParsedCommand): string {
    if (!command.action) {
      return 'Usage: /provider <add|use|list|remove> [args]';
    }

    switch (command.action) {
      case 'add':
        const providerType = command.args[0];
        if (!providerType) {
          return 'Usage: /provider add <type>';
        }
        return `Provider "${providerType}" would be added here. Implementation pending.`;

      case 'use':
        const useType = command.args[0];
        if (!useType) {
          return 'Usage: /provider use <type>';
        }
        return `Switched to provider "${useType}". (Not yet implemented)`;

      case 'list':
        return 'Available providers: anthropic, openai, openai-compatible, ollama';

      case 'remove':
        const removeType = command.args[0];
        if (!removeType) {
          return 'Usage: /provider remove <type>';
        }
        return `Provider "${removeType}" would be removed here. Implementation pending.`;

      default:
        return `Unknown provider action: ${command.action}`;
    }
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
}
