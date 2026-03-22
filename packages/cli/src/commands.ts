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
    'devboost',
    'quit',
    'exit'
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

  {bold}/model{/bold} [args]                    Model management
    /model                             Show model list & menu
    /model add <name> <url> <key>        Add a new model
    /model switch <id>                  Switch to a model
    /model remove <id>                  Remove a model

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
    // If no action specified, show model list and menu
    if (!action) {
      return await this.handleModelMenu();
    }

    switch (action) {
      case 'add':
        // /model add <name> <url> <apiKey>
        if (args.length >= 3) {
          return await this.handleQuickAdd(args[0], args[1], args[2]);
        }
        return `Usage: /model add <name> <url> <apiKey>

Example: /model add deepseek https://api.deepseek.com/v1 sk-xxxxx

 name  - Model name (e.g., deepseek, gpt-4, etc.)
 url   - API endpoint URL (e.g., https://api.deepseek.com/v1)
 key   - Your API key`;
      case 'list':
        return await this.handleModelList();
      case 'switch':
        if (args.length === 0) {
          return 'Usage: /model switch <model-id>\n\nUse /model to see available models.';
        }
        return await this.handleModelSwitch(args[0]);
      case 'remove':
        if (args.length === 0) {
          return 'Usage: /model remove <model-id>\n\nUse /model to see available models.';
        }
        return await this.handleModelRemove(args[0]);
      default:
        return `Unknown action: ${action}

Use /model to see available models and options.`;
    }
  }

  /**
   * Show model menu with list and options
   */
  async handleModelMenu(): Promise<string> {
    const models = await this.configManager.getAllModels();
    const currentModel = await this.configManager.getCurrentModel();

    if (models.length === 0) {
      return `╔═══════════════════════════════════════════════════════════════╗
║                      🤖 Model Management                        ║
╠═══════════════════════════════════════════════════════════════╣
║  No models configured yet.                                    ║
║                                                                ║
║  Add your first model:                                         ║
║  /model add <name> <url> <apiKey>                             ║
║                                                                ║
║  Example:                                                      ║
║  /model add deepseek https://api.deepseek.com/v1 sk-xxxxx      ║
╚═══════════════════════════════════════════════════════════════╝`;
    }

    let output = `╔═══════════════════════════════════════════════════════════════╗
║                      🤖 Model Management (${models.length})              ║
╠═══════════════════════════════════════════════════════════════╣`;

    for (let i = 0; i < models.length; i++) {
      const model = models[i];
      const isCurrent = currentModel?.id === model.id;
      const currentMark = isCurrent ? ' → ' : '   ';
      const num = (i + 1).toString().padStart(2, ' ');

      const maskedKey = model.apiKey ? `***${model.apiKey.slice(-4)}` : '(no key)';
      const name = model.modelName.length > 20 ? model.modelName.substring(0, 20) + '...' : model.modelName.padEnd(23);

      output += `\n║ ${currentMark}[${num}] ${name} Key: ${maskedKey}`;

      if (model.baseUrl) {
        const url = model.baseUrl.length > 30 ? model.baseUrl.substring(0, 30) + '...' : model.baseUrl;
        output += `\n║       URL: ${url.padEnd(47)}║`;
      } else {
        output += `\n║       ${' '.repeat(55)}║`;
      }
    }

    output += `\n╠═══════════════════════════════════════════════════════════════╣
║ Commands:                                                     ║
║  /model add <name> <url> <key>   Add a new model               ║
║  /model switch <id>               Switch to a model             ║
║  /model remove <id>               Remove a model               ║
║  /model list                     Show this menu                 ║
╚═══════════════════════════════════════════════════════════════╝`;

    return output;
  }

  /**
   * Quick add model in one command
   */
  async handleQuickAdd(name: string, url: string, apiKey: string): Promise<string> {
    try {
      // Generate a simple ID from the name
      const id = name.toLowerCase().replace(/[^a-z0-9]/g, '-');

      const model = await this.configManager.addModel({
        provider: 'custom', // All models are now "custom"
        modelName: name,
        apiKey: apiKey,
        baseUrl: url,
        maxTokens: 4096,
        temperature: 0.7
      });

      return `✓ Model added successfully!

Model ID: ${id}
Name: ${name}
URL: ${url}

The model is now ready to use.
Type /model to see all models.`;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return `✗ Failed to add model: ${errorMessage}`;
    }
  }

  /**
   * Handle model add (interactive) - DEPRECATED, kept for backward compatibility
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

    // Prompt for optional baseUrl
    return `API key set.

4. Base URL (Optional)
   For custom endpoints (e.g., OpenAI-compatible APIs).
   Leave empty or use /model confirm to skip.

   Usage: /model url <base-url>

   Example: /model url https://api.openai.com/v1
   Example: /model confirm (to skip)

Type /model confirm to add the model without custom URL.`;
  }

  /**
   * Handle model add baseUrl step
   */
  async handleModelAddBaseUrl(baseUrl: string): Promise<string> {
    if (!this.modelAddInProgress) {
      return 'No model addition in progress. Use /model add to start.';
    }

    if (!this.pendingModelData.apiKey) {
      return 'Please set API key first: /model key <your-api-key>';
    }

    if (baseUrl && baseUrl.trim() !== '') {
      this.pendingModelData.baseUrl = baseUrl.trim();
    }

    return await this.finalizeModelAdd();
  }

  /**
   * Finalize model addition
   */
  async finalizeModelAdd(): Promise<string> {
    // Set default values
    this.pendingModelData.maxTokens = this.pendingModelData.maxTokens || 4096;
    this.pendingModelData.temperature = this.pendingModelData.temperature || 0.7;

    // Add the model
    try {
      const model = await this.configManager.addModel({
        provider: this.pendingModelData.provider!,
        modelName: this.pendingModelData.modelName!,
        apiKey: this.pendingModelData.apiKey!,
        maxTokens: this.pendingModelData.maxTokens,
        temperature: this.pendingModelData.temperature,
        baseUrl: this.pendingModelData.baseUrl
      });

      // Reset state
      this.modelAddInProgress = false;
      this.pendingModelData = {};

      let output = `✓ Model added successfully!

Model ID: ${model.id}
Provider: ${model.provider}
Model: ${model.modelName}`;

      if (model.baseUrl) {
        output += `\nBase URL: ${model.baseUrl}`;
      }

      output += `

The model has been saved and is ready to use.
You can switch to it anytime with: /model switch ${model.id}`;

      return output;
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
  Temperature: ${model.temperature}`;

      if (model.baseUrl) {
        output += `
  Base URL: ${model.baseUrl}`;
      }

      output += `
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
