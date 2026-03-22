/**
 * Main Loop for DevBoost CLI
 *
 * Handles the primary event loop, processing user input,
 * managing agent interactions, and coordinating TUI updates.
 */

import { Agent, ProcessResult } from '@devboost/core';
import { TUIManager } from './tui.js';
import { CommandHandler, ParsedCommand } from './commands.js';
import { ConfigManager } from './config.js';

export class MainLoop {
  private agent: Agent;
  private tuiManager: TUIManager;
  private commandHandler: CommandHandler;
  private configManager: ConfigManager;
  private running: boolean = false;

  constructor(
    agent: Agent,
    tuiManager: TUIManager,
    commandHandler: CommandHandler,
    configManager: ConfigManager
  ) {
    this.agent = agent;
    this.tuiManager = tuiManager;
    this.commandHandler = commandHandler;
    this.configManager = configManager;
  }

  /**
   * Start the main loop
   */
  async start(): Promise<void> {
    if (this.running) {
      return;
    }

    // Initialize TUI if not already initialized
    if (!this.tuiManager.isInitialized()) {
      await this.tuiManager.initialize();
    }

    // Set up input handler
    this.tuiManager.setInputHandler(async (input: string) => {
      await this.handleInput(input);
    });

    // Show welcome message
    this.displayWelcome();

    // Show ready status
    this.tuiManager.showStatus('ready', 'Ready for input. Type /help for available commands.');

    this.running = true;
  }

  /**
   * Stop the main loop
   */
  async stop(): Promise<void> {
    if (!this.running) {
      return;
    }

    // Shutdown agent if running
    if (this.commandHandler.isAgentStarted()) {
      try {
        await this.agent.shutdown();
        this.commandHandler.setAgentStarted(false);
      } catch (error) {
        this.handleError(error as Error);
      }
    }

    // Show goodbye message
    this.tuiManager.showStatus('idle', 'DevBoost CLI stopped. Goodbye!');

    this.running = false;
  }

  /**
   * Handle user input
   */
  async handleInput(input: string): Promise<void> {
    // Validate input
    if (!this.validateInput(input)) {
      return;
    }

    try {
      // Check if input is a command
      const parsedCommand = this.commandHandler.parse(input);

      if (parsedCommand) {
        // Handle command
        await this.handleCommand(input, parsedCommand);
      } else {
        // Handle regular message
        await this.handleMessage(input);
      }
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  /**
   * Handle regular message (not a command)
   */
  private async handleMessage(message: string): Promise<void> {
    // Check if agent is started
    if (!this.commandHandler.isAgentStarted()) {
      this.displayResponse(
        'Agent is not started. Use /agent start to start the agent.',
        'error'
      );
      return;
    }

    // Display user message
    this.tuiManager.displayMessage('user', message);

    // Show processing status
    this.tuiManager.showStatus('processing', 'Processing your request...');

    try {
      // Process with agent
      const response = await this.agent.process(message);

      // Handle response
      await this.handleAgentResponse(response);
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  /**
   * Handle command input
   */
  private async handleCommand(input: string, parsedCommand: ParsedCommand): Promise<void> {
    try {
      const result = await this.commandHandler.execute(parsedCommand);

      // Check if this is a quit command
      if (this.commandHandler.isQuitCommand(result)) {
        // Display goodbye and exit
        this.tuiManager.showStatus('idle', 'Goodbye!');
        await this.shutdown();
        process.exit(0);
        return;
      }

      // Display command result as system message
      this.tuiManager.displayMessage('system', result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.tuiManager.displayMessage('system', `Error executing command: ${errorMessage}`);
    }
  }

  /**
   * Handle agent response
   */
  async handleAgentResponse(response: ProcessResult): Promise<void> {
    try {
      // Display response in TUI
      await this.tuiManager.handleAgentResponse(response);
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  /**
   * Display a response to the user
   */
  displayResponse(message: string, type: 'info' | 'error' | 'success' = 'info'): void {
    switch (type) {
      case 'error':
        this.tuiManager.showStatus('error', message);
        break;
      case 'success':
        this.tuiManager.showStatus('ready', message);
        break;
      default:
        this.tuiManager.displayMessage('system', message);
    }
  }

  /**
   * Handle errors
   */
  private handleError(error: Error | string): void {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Display error in TUI
    this.tuiManager.showStatus('error', errorMessage);

    // Log error for debugging
    console.error('Main loop error:', errorMessage);
  }

  /**
   * Validate input
   */
  private validateInput(input: string): boolean {
    if (!input || input.trim().length === 0) {
      return false;
    }
    return true;
  }

  /**
   * Display welcome message
   */
  private displayWelcome(): void {
    const welcome = [
      '{bold}{cyan-fg}Welcome to DevBoost CLI!{/cyan-fg}{/bold}',
      '',
      'Your intelligent assistant for embedded development.',
      '',
      'Getting started:',
      '  1. Type {bold}/agent start{/bold} to start the agent',
      '  2. Type {bold}/help{/bold} to see available commands',
      '  3. Start asking questions or giving commands!',
      ''
    ].join('\n');

    this.tuiManager.displayMessage('system', welcome);
  }

  /**
   * Check if the main loop is running
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Get the agent
   */
  getAgent(): Agent {
    return this.agent;
  }

  /**
   * Get the TUI manager
   */
  getTUIManager(): TUIManager {
    return this.tuiManager;
  }

  /**
   * Get the command handler
   */
  getCommandHandler(): CommandHandler {
    return this.commandHandler;
  }

  /**
   * Get the config manager
   */
  getConfigManager(): ConfigManager {
    return this.configManager;
  }

  /**
   * Shutdown the main loop gracefully
   */
  async shutdown(): Promise<void> {
    if (!this.running) {
      return;
    }

    // Shutdown agent if running
    if (this.commandHandler.isAgentStarted()) {
      try {
        await this.agent.shutdown();
        this.commandHandler.setAgentStarted(false);
      } catch (error) {
        console.error('Error shutting down agent:', error);
      }
    }

    // Destroy TUI
    try {
      this.tuiManager.destroy();
    } catch (error) {
      console.error('Error destroying TUI:', error);
    }

    this.running = false;
  }
}
