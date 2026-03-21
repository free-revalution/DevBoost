/**
 * Enhanced DevBoost CLI
 *
 * Main CLI class that connects TUI, Core Agent, and all components
 * to provide a complete user experience.
 */

import { Agent, AgentConfig } from '@devboost/core';
import { ScreenManager } from '@devboost/tui';
import { CatppuccinMocha } from '@devboost/tui';
import { TUIManager } from './tui.js';
import { ProjectManager } from './project.js';
import { CommandHandler } from './commands.js';
import { ConfigManager } from './config.js';
import { MainLoop } from './loop.js';

export class DevBoostCLI {
  readonly version = '0.1.0';

  private agent: Agent | null = null;
  private configManager: ConfigManager;
  private projectManager: ProjectManager;
  private screenManager: ScreenManager | null = null;
  private tuiManager: TUIManager | null = null;
  private commandHandler: CommandHandler | null = null;
  private mainLoop: MainLoop | null = null;
  private initialized: boolean = false;
  private agentConfig: AgentConfig;

  constructor(
    agent?: Agent,
    configManager?: ConfigManager,
    projectManager?: ProjectManager
  ) {
    // Initialize components with defaults or provided instances
    this.agent = agent || null;
    this.configManager = configManager || new ConfigManager();
    this.projectManager = projectManager || new ProjectManager();
    this.agentConfig = {
      llmProvider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
      maxTokens: 4096,
      temperature: 0.7
    };
  }

  /**
   * Initialize the CLI
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Load configuration
      await this.configManager.load();

      // Initialize project if needed
      if (!this.projectManager.isInitialized()) {
        await this.projectManager.init();
      }

      // Create agent if not provided
      if (!this.agent) {
        const { Agent: AgentClass } = await import('@devboost/core');
        this.agent = new AgentClass({
          config: this.agentConfig
        });
      }

      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize CLI: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Run the CLI
   */
  async run(): Promise<void> {
    try {
      // Initialize first
      await this.initialize();

      // Create TUI components
      this.createTUIComponents();

      // Start main loop
      await this.startMainLoop();

    } catch (error) {
      // Handle initialization errors
      console.error('Failed to start CLI:', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  /**
   * Create TUI components
   */
  private createTUIComponents(): void {
    if (!this.agent) {
      throw new Error('Agent not initialized. Call initialize() first.');
    }

    // Create screen manager
    this.screenManager = new ScreenManager();

    // Create TUI manager
    this.tuiManager = new TUIManager(this.screenManager, this.agent);

    // Create command handler
    this.commandHandler = new CommandHandler(
      this.configManager,
      this.agent,
      this.tuiManager
    );

    // Create main loop
    this.mainLoop = new MainLoop(
      this.agent,
      this.tuiManager,
      this.commandHandler,
      this.configManager
    );

    // Setup signal handlers for graceful shutdown
    this.setupSignalHandlers();
  }

  /**
   * Start the main loop
   */
  async startMainLoop(): Promise<void> {
    if (!this.mainLoop) {
      throw new Error('Main loop not initialized');
    }

    await this.mainLoop.start();
  }

  /**
   * Setup signal handlers for graceful shutdown
   */
  private setupSignalHandlers(): void {
    // Handle Ctrl+C
    process.on('SIGINT', async () => {
      await this.handleSignal('SIGINT');
    });

    // Handle termination signal
    process.on('SIGTERM', async () => {
      await this.handleSignal('SIGTERM');
    });
  }

  /**
   * Handle system signals
   */
  private async handleSignal(signal: string): Promise<void> {
    console.log(`\nReceived ${signal}, shutting down gracefully...`);

    try {
      await this.shutdown();
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  }

  /**
   * Shutdown the CLI
   */
  async shutdown(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    try {
      // Stop main loop
      if (this.mainLoop) {
        await this.mainLoop.stop();
      }

      // Shutdown agent
      if (this.agent && this.commandHandler?.isAgentStarted()) {
        await this.agent.shutdown();
      }

      // Destroy TUI
      if (this.tuiManager) {
        this.tuiManager.destroy();
      }

      // Destroy screen manager
      if (this.screenManager) {
        this.screenManager.destroy();
      }

      this.initialized = false;
    } catch (error) {
      console.error('Error during shutdown:', error);
      throw error;
    }
  }

  /**
   * Get the agent instance
   */
  getAgent(): Agent | null {
    return this.agent;
  }

  /**
   * Get the config manager instance
   */
  getConfigManager(): ConfigManager {
    return this.configManager;
  }

  /**
   * Get the project manager instance
   */
  getProjectManager(): ProjectManager {
    return this.projectManager;
  }

  /**
   * Get the TUI manager instance
   */
  getTUIManager(): TUIManager | null {
    return this.tuiManager;
  }

  /**
   * Get the command handler instance
   */
  getCommandHandler(): CommandHandler | null {
    return this.commandHandler;
  }

  /**
   * Get the main loop instance
   */
  getMainLoop(): MainLoop | null {
    return this.mainLoop;
  }

  /**
   * Check if CLI is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get CLI version
   */
  getVersion(): string {
    return this.version;
  }

  /**
   * Initialize components for simple mode (no TUI)
   */
  initializeForSimpleMode(): void {
    if (this.commandHandler) {
      return; // Already initialized
    }

    if (!this.agent) {
      throw new Error('Agent not initialized. Call initialize() first.');
    }

    // Create a minimal TUI manager for command handling (no actual TUI)
    const minimalTUIManager = {
      displayMessage: () => {},
      showStatus: () => {},
      clearConversation: () => {},
      getConversationHistory: () => [],
      render: () => {},
      isInitialized: () => false,
      destroy: () => {},
      setInputHandler: () => {},
      handleAgentResponse: async () => {},
      getLayout: () => null
    };

    // Create command handler
    this.commandHandler = new CommandHandler(
      this.configManager,
      this.agent,
      minimalTUIManager as any
    );
  }
}
