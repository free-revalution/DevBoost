/**
 * TUI Integration for DevBoost CLI
 *
 * Connects the agent to the terminal UI, displaying responses,
 * tool execution status, and managing user interaction.
 */

import blessed from 'blessed';
import { ScreenManager, MainLayout } from '@devboost/tui';
import { CatppuccinMocha } from '@devboost/tui';
import { Agent, ProcessResult } from '@devboost/core';

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: string;
  toolName?: string;
  toolStatus?: 'starting' | 'success' | 'error';
}

export interface Task {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  activeForm?: string;
}

export interface Status {
  state: 'idle' | 'processing' | 'error' | 'ready';
  message: string;
}

export type InputHandler = (input: string) => void;

export class TUIManager {
  private screenManager: ScreenManager;
  private agent: Agent;
  private layout: MainLayout | null = null;
  private conversationBox: ReturnType<typeof blessed.box> | null = null;
  private taskList: ReturnType<typeof blessed.list> | null = null;
  private statusBox: ReturnType<typeof blessed.box> | null = null;
  private conversationHistory: ConversationMessage[] = [];
  private currentTasks: Task[] = [];
  private currentStatus: Status = { state: 'idle', message: '' };
  private inputHandler: InputHandler | null = null;
  private initialized: boolean = false;

  constructor(screenManager: ScreenManager, agent: Agent) {
    this.screenManager = screenManager;
    this.agent = agent;
  }

  /**
   * Initialize TUI components
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Create main layout
    this.layout = new MainLayout(this.screenManager.screen, CatppuccinMocha);

    // Create conversation view
    this.createConversationView();

    // Create task list
    this.createTaskListView();

    // Create status bar
    this.createStatusBar();

    // Setup input handler
    this.setupInputHandler();

    this.initialized = true;
  }

  /**
   * Create conversation view component
   */
  private createConversationView(): void {
    if (!this.layout) return;

    this.conversationBox = blessed.box({
      parent: this.layout.main,
      top: 3,
      left: 0,
      width: '70%',
      height: '100%-6',
      scrollable: true,
      alwaysScroll: true,
      mouse: true,
      keys: true,
      vi: true,
      tags: true,
      label: ' Conversation ',
      border: { type: 'line' },
      style: {
        fg: CatppuccinMocha.fg,
        bg: CatppuccinMocha.bg,
        border: { fg: CatppuccinMocha.border },
        label: { fg: CatppuccinMocha.cyan }
      }
    });
  }

  /**
   * Create task list component
   */
  private createTaskListView(): void {
    if (!this.layout) return;

    this.taskList = blessed.list({
      parent: this.layout.main,
      top: 3,
      right: 0,
      width: '30%',
      height: '100%-6',
      scrollable: true,
      tags: true,
      label: ' Tasks ',
      border: { type: 'line' },
      style: {
        fg: CatppuccinMocha.fg,
        bg: CatppuccinMocha.bg,
        border: { fg: CatppuccinMocha.border },
        selected: { bg: CatppuccinMocha.bgLight, fg: CatppuccinMocha.cyan }
      },
      items: []
    });
  }

  /**
   * Create status bar component
   */
  private createStatusBar(): void {
    if (!this.layout) return;

    this.statusBox = blessed.box({
      parent: this.layout.main,
      bottom: 3,
      left: 0,
      width: '100%',
      height: 1,
      tags: true,
      style: {
        fg: CatppuccinMocha.fg,
        bg: CatppuccinMocha.bgDark
      }
    });

    this.updateStatusDisplay();
  }

  /**
   * Setup input handler for user input
   */
  private setupInputHandler(): void {
    if (!this.layout) return;

    // Store reference to input for later use
    // The actual key handler will be set by the MainLoop
    // which has access to the blessed input element
  }

  /**
   * Submit input from the textbox
   */
  async submitInput(): Promise<void> {
    if (!this.layout) return;

    const input = this.layout.input.value;
    if (!input || !input.trim()) {
      this.layout.input.clearValue();
      return;
    }

    this.layout.input.clearValue();
    this.layout.input.focus();

    if (this.inputHandler) {
      await this.inputHandler(input.trim());
    }
  }

  /**
   * Display a message in the conversation view
   */
  displayMessage(role: 'user' | 'assistant' | 'system' | 'tool', content: string, toolName?: string): void {
    const message: ConversationMessage = {
      role,
      content,
      timestamp: new Date().toISOString(),
      toolName
    };

    this.conversationHistory.push(message);

    // Only update UI if initialized
    if (this.conversationBox) {
      // Format message for display
      const formattedMessage = this.formatMessage(message);
      const currentContent = this.conversationBox.getContent() as string || '';
      this.conversationBox.setContent(currentContent + formattedMessage + '\n');

      // Scroll to bottom
      this.conversationBox.setScrollPerc(100);

      this.render();
    }
  }

  /**
   * Format a message for display
   */
  private formatMessage(message: ConversationMessage): string {
    const time = new Date(message.timestamp).toLocaleTimeString();

    switch (message.role) {
      case 'user':
        return `{cyan-fg}[${time}]{/cyan-fg} {bold}{green-fg}>{/green-fg}{/bold} {white-fg}${message.content}{/white-fg}`;
      case 'assistant':
        return `{cyan-fg}[${time}]{/cyan-fg} {bold}{blue-fg}<{/blue-fg}{/bold} {white-fg}${message.content}{/white-fg}`;
      case 'system':
        return `{cyan-fg}[${time}]{/cyan-fg} {bold}{yellow-fg}*{/yellow-fg}{/bold} {gray-fg}${message.content}{/gray-fg}`;
      case 'tool':
        if (message.toolName) {
          return `{cyan-fg}[${time}]{/cyan-fg} {bold}{mauve-fg}@${message.toolName}{/mauve-fg}{/bold} {white-fg}${message.content}{/white-fg}`;
        }
        return `{cyan-fg}[${time}]{/cyan-fg} {bold}{mauve-fg}@tool{/mauve-fg}{/bold} {white-fg}${message.content}{/white-fg}`;
      default:
        return `{cyan-fg}[${time}]{/cyan-fg} ${message.content}`;
    }
  }

  /**
   * Display tool execution status
   */
  displayToolExecution(toolName: string, status: 'starting' | 'success' | 'error', result?: any): void {
    let message = '';

    switch (status) {
      case 'starting':
        message = `Starting tool execution: ${toolName}`;
        break;
      case 'success':
        message = `✓ Tool ${toolName} completed successfully`;
        if (result?.data) {
          message += `\n${JSON.stringify(result.data, null, 2)}`;
        }
        break;
      case 'error':
        message = `✗ Tool ${toolName} failed`;
        if (result instanceof Error) {
          message += `\nError: ${result.message}`;
        } else if (result?.error) {
          message += `\nError: ${result.error}`;
        }
        break;
    }

    this.displayMessage('tool', message, toolName);
  }

  /**
   * Update task list
   */
  updateTaskList(tasks: Task[]): void {
    this.currentTasks = tasks;

    if (this.taskList) {
      this.taskList.clearItems();

      for (const task of tasks) {
        const statusIcon = this.getTaskStatusIcon(task.status);
        const item = `${statusIcon} ${task.content}`;
        (this.taskList as any).pushItem(item);
      }

      this.render();
    }
  }

  /**
   * Get status icon for task
   */
  private getTaskStatusIcon(status: Task['status']): string {
    switch (status) {
      case 'pending':
        return '{gray-fg}○{/gray-fg}';
      case 'in_progress':
        return '{yellow-fg}◉{/yellow-fg}';
      case 'completed':
        return '{green-fg}●{/green-fg}';
      default:
        return '○';
    }
  }

  /**
   * Show status message
   */
  showStatus(state: Status['state'], message: string): void {
    this.currentStatus = { state, message };
    this.updateStatusDisplay();
    this.render();
  }

  /**
   * Update status bar display
   */
  private updateStatusDisplay(): void {
    if (!this.statusBox) return;

    const { state, message } = this.currentStatus;

    let stateText = '';
    let stateColor = '';

    switch (state) {
      case 'idle':
        stateText = 'IDLE';
        stateColor = 'gray';
        break;
      case 'processing':
        stateText = 'PROCESSING';
        stateColor = 'yellow';
        break;
      case 'error':
        stateText = 'ERROR';
        stateColor = 'red';
        break;
      case 'ready':
        stateText = 'READY';
        stateColor = 'green';
        break;
    }

    this.statusBox.setContent(` {bold}{${stateColor}-fg}[${stateText}]{/${stateColor}-fg}{/bold} ${message}`);
  }

  /**
   * Handle agent response
   */
  async handleAgentResponse(response: ProcessResult): Promise<void> {
    // Show tool execution if any
    if (response.toolUsed) {
      this.displayToolExecution(
        response.toolUsed,
        response.toolResult?.success ? 'success' : 'error',
        response.toolResult
      );
    }

    // Display assistant response
    this.displayMessage('assistant', response.response);

    // Update status
    this.showStatus('ready', 'Ready for input');
  }

  /**
   * Set input handler callback
   */
  setInputHandler(handler: InputHandler): void {
    this.inputHandler = handler;

    // Setup key handler on input
    if (this.layout && this.layout.input) {
      this.layout.input.on('submit', async () => {
        await this.submitInput();
      });
    }
  }

  /**
   * Get the layout instance
   */
  getLayout(): MainLayout | null {
    return this.layout;
  }

  /**
   * Get conversation history
   */
  getConversationHistory(): ConversationMessage[] {
    return [...this.conversationHistory];
  }

  /**
   * Clear conversation history
   */
  clearConversation(): void {
    this.conversationHistory = [];
    if (this.conversationBox) {
      this.conversationBox.setContent('');
      this.render();
    }
  }

  /**
   * Get current tasks
   */
  getCurrentTasks(): Task[] {
    return [...this.currentTasks];
  }

  /**
   * Get current status
   */
  getCurrentStatus(): Status {
    return { ...this.currentStatus };
  }

  /**
   * Render the TUI
   */
  render(): void {
    this.screenManager.render();
  }

  /**
   * Check if TUI is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Destroy TUI components
   */
  destroy(): void {
    if (this.layout) {
      this.layout = null;
    }
    if (this.conversationBox) {
      this.conversationBox = null;
    }
    if (this.taskList) {
      this.taskList = null;
    }
    if (this.statusBox) {
      this.statusBox = null;
    }

    this.conversationHistory = [];
    this.currentTasks = [];
    this.currentStatus = { state: 'idle', message: '' };
    this.inputHandler = null;
    this.initialized = false;
  }
}
