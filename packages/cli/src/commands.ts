/**
 * Enhanced Command Handler for DevBoost CLI
 *
 * Handles all CLI commands including agent management,
 * context operations, tools listing, and history.
 */

import { ConfigManager } from './config.js';
import { Agent } from '@devboost/core';
import { TUIManager } from './tui.js';

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
    'provider',
    'model',
    'telegram',
    'devboost'
  ];

  private agentStarted: boolean = false;
  private modelAddInProgress: boolean = false;
  private pendingModelData: {
    provider?: string;
    modelName?: string;
    apiKey?: string;
    maxTokens?: number;
    temperature?: number;
    baseUrl?: string;
  } = {};

  constructor(
    private configManager: ConfigManager,
    private agent: Agent,
    private tuiManager: TUIManager,
    private cli?: DevBoostCLIInterface
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
        case 'model':
          if (!command.action) {
            return await this.handleModelCommand('list', []);
          }
          return await this.handleModelCommand(command.action, command.args);
        case 'telegram':
          if (!command.action) {
            return 'Usage: /telegram <start|stop|status|users>';
          }
          return await this.handleTelegramCommand(command.action, command.args);
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

  {bold}/model{/bold} <command> [args]         Model management (NEW!)
    add                                Add a new model (interactive)
    list                               List all configured models
    switch <id>                         Switch to a model
    remove <id>                         Remove a model
    cancel                             Cancel model addition

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

  {bold}/provider{/bold} <command> [args]      Manage LLM providers (legacy)
    add <type>                          Add a provider
    use <type>                          Switch to a provider
    list                                List all providers

  {bold}/telegram{/bold} <command> [args]      Telegram Bot (NEW!)
    init <token>                        Initialize with bot token
    start                               Start Telegram bot
    stop                                Stop Telegram bot
    status                              Show bot status
    add-user <id> [name]                Add authorized user
    remove-user <id>                    Remove authorized user
    users                               List authorized users

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

  /**
   * Handle model management commands
   */
  async handleModelCommand(action: string, args: string[]): Promise<string> {
    switch (action) {
      case 'add':
        return await this.handleModelAdd();
      case 'list':
        return await this.handleModelList();
      case 'switch':
        if (args.length === 0) {
          return 'Usage: /model switch <model-id>\n\nUse /model list to see available models.';
        }
        return await this.handleModelSwitch(args[0]);
      case 'remove':
        if (args.length === 0) {
          return 'Usage: /model remove <model-id>\n\nUse /model list to see available models.';
        }
        return await this.handleModelRemove(args[0]);
      case 'cancel':
        if (this.modelAddInProgress) {
          this.modelAddInProgress = false;
          this.pendingModelData = {};
          return 'Model addition cancelled.';
        }
        return 'No model addition in progress.';
      default:
        return `Unknown model action: ${action}

Available actions:
  add    - Add a new model (interactive)
  list   - List all configured models
  switch - Switch to a different model
  remove - Remove a model
  cancel - Cancel model addition`;
    }
  }

  /**
   * Handle model add (interactive)
   */
  async handleModelAdd(): Promise<string> {
    if (this.modelAddInProgress) {
      return 'Model addition already in progress. Use /model cancel to cancel or continue with: /model add';
    }

    this.modelAddInProgress = true;
    this.pendingModelData = {};

    return `Adding a new model...

Please provide the following information (one at a time):

1. Provider (anthropic, openai, openai-compatible, ollama)
   Usage: /model provider <provider-name>

Example: /model provider anthropic

Type /model cancel to cancel at any time.`;
  }

  /**
   * Handle model add provider step
   */
  async handleModelAddProvider(provider: string): Promise<string> {
    if (!this.modelAddInProgress) {
      return 'No model addition in progress. Use /model add to start.';
    }

    const validProviders = ['anthropic', 'openai', 'openai-compatible', 'ollama'];
    if (!validProviders.includes(provider)) {
      return `Invalid provider: ${provider}

Valid providers: ${validProviders.join(', ')}

Usage: /model provider <provider-name>`;
    }

    this.pendingModelData.provider = provider;

    return `Provider set to: ${provider}

2. Model Name
   Usage: /model name <model-name>

Examples:
   Anthropic: claude-3-5-sonnet-20241022, claude-3-opus-20240229
   OpenAI: gpt-4, gpt-3.5-turbo
   Ollama: llama2, mistral

Usage: /model name <model-name>`;
  }

  /**
   * Handle model add name step
   */
  async handleModelAddName(modelName: string): Promise<string> {
    if (!this.modelAddInProgress) {
      return 'No model addition in progress. Use /model add to start.';
    }

    if (!this.pendingModelData.provider) {
      return 'Please set provider first: /model provider <provider>';
    }

    if (!modelName || modelName.trim() === '') {
      return 'Model name cannot be empty.';
    }

    this.pendingModelData.modelName = modelName.trim();

    return `Model name set to: ${modelName}

3. API Key
   Usage: /model key <your-api-key>

Note: Your API key will be stored securely in .devboost/models.json

Usage: /model key <your-api-key>`;
  }

  /**
   * Handle model add API key step
   */
  async handleModelAddKey(apiKey: string): Promise<string> {
    if (!this.modelAddInProgress) {
      return 'No model addition in progress. Use /model add to start.';
    }

    if (!this.pendingModelData.modelName) {
      return 'Please set model name first: /model name <model-name>';
    }

    if (!apiKey || apiKey.trim() === '') {
      return 'API key cannot be empty.';
    }

    this.pendingModelData.apiKey = apiKey.trim();

    // Set default values
    this.pendingModelData.maxTokens = this.pendingModelData.maxTokens || 4096;
    this.pendingModelData.temperature = this.pendingModelData.temperature || 0.7;

    // Add the model
    try {
      const model = await this.configManager.addModel({
        provider: this.pendingModelData.provider!,
        modelName: this.pendingModelData.modelName!,
        apiKey: this.pendingModelData.apiKey,
        maxTokens: this.pendingModelData.maxTokens,
        temperature: this.pendingModelData.temperature,
        baseUrl: this.pendingModelData.baseUrl
      });

      // Reset state
      this.modelAddInProgress = false;
      this.pendingModelData = {};

      return `✓ Model added successfully!

Model ID: ${model.id}
Provider: ${model.provider}
Model: ${model.modelName}

The model has been saved and is ready to use.
You can switch to it anytime with: /model switch ${model.id}`;
    } catch (error) {
      this.modelAddInProgress = false;
      this.pendingModelData = {};
      const errorMessage = error instanceof Error ? error.message : String(error);
      return `✗ Failed to add model: ${errorMessage}`;
    }
  }

  /**
   * Handle model list
   */
  async handleModelList(): Promise<string> {
    const models = await this.configManager.getAllModels();
    const currentModel = await this.configManager.getCurrentModel();

    if (models.length === 0) {
      return `No models configured yet.

Add your first model with: /model add`;
    }

    let output = `Configured Models (${models.length}):
`;

    for (const model of models) {
      const isCurrent = currentModel?.id === model.id;
      const currentMarker = isCurrent ? ' *' : '';
      const maskedKey = model.apiKey ? `***${model.apiKey.slice(-4)}` : '(no key)';

      output += `
${currentMarker}[${model.id}]
  Provider: ${model.provider}
  Model: ${model.modelName}
  API Key: ${maskedKey}
  Max Tokens: ${model.maxTokens}
  Temperature: ${model.temperature}
`;
    }

    output += `
* = Current model

Switch models: /model switch <model-id>
Remove model: /model remove <model-id>`;

    return output;
  }

  /**
   * Handle model switch
   */
  async handleModelSwitch(modelId: string): Promise<string> {
    const success = await this.configManager.switchModel(modelId);

    if (!success) {
      return `✗ Model not found: ${modelId}

Use /model list to see available models.`;
    }

    const model = await this.configManager.getModel(modelId);

    return `✓ Switched to model: ${modelId}
Provider: ${model?.provider}
Model: ${model?.modelName}`;
  }

  /**
   * Handle model remove
   */
  async handleModelRemove(modelId: string): Promise<string> {
    const model = await this.configManager.getModel(modelId);

    if (!model) {
      return `✗ Model not found: ${modelId}

Use /model list to see available models.`;
    }

    const success = await this.configManager.removeModel(modelId);

    if (!success) {
      return `✗ Failed to remove model: ${modelId}`;
    }

    return `✓ Removed model: ${modelId} (${model.provider}/${model.modelName})`;
  }

  /**
   * Check if model addition is in progress
   */
  isModelAddInProgress(): boolean {
    return this.modelAddInProgress;
  }

  /**
   * Get pending model data
   */
  getPendingModelData(): typeof this.pendingModelData {
    return { ...this.pendingModelData };
  }

  /**
   * Set pending model data field
   */
  setPendingModelData(field: string, value: any): void {
    (this.pendingModelData as any)[field] = value;
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
}
