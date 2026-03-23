/**
 * New TUI Integration for DevBoost CLI
 *
 * Uses the new panel-driven architecture with App class.
 * This replaces the old MainLayout-based system.
 */

import { App, AgentPanel, ChatPanel, ModelPanel, ToolsPanel, SettingsPanel, ThemeManager, type ModelConfig, type Theme } from '@devboost/tui';
import { Agent, Role } from '@devboost/core';
import { ConfigManager } from './config.js';

/**
 * New TUI Manager using panel-driven architecture
 */
export class NewTUIManager {
  private app: App;
  private agent: Agent;
  private configManager: ConfigManager;
  private themeManager: ThemeManager;
  private initialized: boolean = false;
  private cli: any; // Reference to CLI for input handling

  constructor(agent: Agent, configManager: ConfigManager, cli?: any) {
    this.agent = agent;
    this.configManager = configManager;
    this.cli = cli;

    // Create theme manager
    this.themeManager = new ThemeManager();

    // Create the App first (without panels)
    this.app = new App({
      themeManager: this.themeManager,
      onQuit: async () => {
        await this.cleanup();
      },
      onInput: async (input: string) => {
        await this.handleInput(input);
      }
    });

    // Now register panels (app is fully constructed)
    this.registerPanels();
  }

  /**
   * Register all panels
   */
  private registerPanels(): void {
    const screen = this.app.getScreen();
    const eventManager = this.app.getEventManager();
    const theme = this.app.theme;

    // Register Chat Panel
    this.app.registerPanel({
      id: 'chat',
      title: '对话',
      index: 1,
      factory: (parent) => new ChatPanel(screen, eventManager, {
        id: 'chat',
        title: '对话',
        parent: parent,
        theme: theme,
        getMessages: () => {
          const context = this.agent.getContext();
          return context.getMessages().map(m => ({
            role: m.role,
            content: m.content,
            timestamp: new Date().toISOString()
          }));
        },
        onClear: async () => {
          const context = this.agent.getContext();
          context.clear();
        }
      })
    });

    // Register Agent Panel
    this.app.registerPanel({
      id: 'agent',
      title: 'Agent',
      index: 2,
      factory: (parent) => new AgentPanel(screen, eventManager, {
        id: 'agent',
        title: 'Agent',
        parent: parent,
        theme: theme,
        agent: this.agent
      })
    });

    // Register Model Panel
    this.app.registerPanel({
      id: 'model',
      title: '模型',
      index: 3,
      factory: (parent) => new ModelPanel(screen, eventManager, {
        id: 'model',
        title: '模型',
        parent: parent,
        theme: theme,
        getModels: async () => await this.configManager.getAllModels(),
        getCurrentModelId: async () => {
          const config = await this.configManager.load();
          return config.currentModelId;
        },
        switchModel: async (modelId: string) => {
          await this.configManager.switchModel(modelId);
        },
        addModel: async () => {
          // Trigger model add wizard (would use existing ModelMenu)
        },
        removeModel: async (modelId: string) => {
          await this.configManager.removeModel(modelId);
        }
      })
    });

    // Register Tools Panel
    this.app.registerPanel({
      id: 'tools',
      title: '工具',
      index: 4,
      factory: (parent) => new ToolsPanel(screen, eventManager, {
        id: 'tools',
        title: '工具',
        parent: parent,
        theme: theme,
        getTools: () => {
          const registry = this.agent.getToolRegistry();
          const tools = registry.list();
          return tools.map(t => ({
            name: t.name,
            description: t.description || '',
            enabled: true,
            category: 'builtin' as const
          }));
        }
      })
    });

    // Register Settings Panel
    this.app.registerPanel({
      id: 'settings',
      title: '设置',
      index: 5,
      factory: (parent) => new SettingsPanel(screen, eventManager, {
        id: 'settings',
        title: '设置',
        parent: parent,
        theme: theme,
        getSettings: () => {
          const config = this.configManager as any;
          return [
            {
              key: 'version',
              label: '版本',
              value: config.version || '0.2.0',
              type: 'string' as const,
              editable: false
            },
            {
              key: 'projectPath',
              label: '项目路径',
              value: config.projectPath || '',
              type: 'string' as const,
              editable: false
            },
            {
              key: 'theme',
              label: '当前主题',
              value: this.themeManager.getCurrentTheme().name,
              type: 'string' as const,
              editable: false
            }
          ];
        },
        onResetConfig: async () => {
          await this.configManager.reset();
        },
        onSwitchTheme: async (direction: 'next' | 'previous' | 'select') => {
          if (direction === 'next') {
            this.app.nextTheme();
          } else if (direction === 'previous') {
            this.app.previousTheme();
          }
        },
        getCurrentTheme: () => {
          const theme = this.themeManager.getCurrentTheme();
          return {
            name: theme.name,
            index: this.themeManager.getCurrentThemeIndex()
          };
        },
        getAllThemes: () => {
          return this.themeManager.getAllThemes().map((t, i) => ({
            name: t.name,
            index: i
          }));
        }
      })
    });
  }

  /**
   * Initialize the TUI
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.app.start();
    this.initialized = true;
  }

  /**
   * Handle user input from the input box
   */
  private async handleInput(input: string): Promise<void> {
    const trimmed = input.trim();

    if (!trimmed) {
      return;
    }

    // Check if this is a command
    if (trimmed.startsWith('/')) {
      await this.handleCommand(trimmed);
    } else {
      // Regular message - send to agent
      await this.handleMessage(trimmed);
    }
  }

  /**
   * Handle command input
   */
  private async handleCommand(input: string): Promise<void> {
    const parts = input.slice(1).split(/\s+/);
    const command = parts[0];
    const action = parts[1];
    const args = parts.slice(2);

    switch (command) {
      case 'quit':
      case 'exit':
      case 'q':
        await this.app.quit();
        break;

      case 'help':
      case '?':
        this.showHelp();
        break;

      case 'agent':
        await this.handleAgentCommand(action, args);
        break;

      case 'model':
        await this.handleModelCommand(action);
        break;

      case 'clear':
        this.clearConversation();
        break;

      default:
        this.app.getNotificationManager().warning(`未知命令: ${command}`);
    }
  }

  /**
   * Handle agent commands
   */
  private async handleAgentCommand(action: string | undefined, args: string[]): Promise<void> {
    switch (action) {
      case 'start':
        this.app.getNotificationManager().info('Agent 启动中...');
        // Agent start logic would go here
        break;

      case 'stop':
        this.app.getNotificationManager().info('Agent 已停止');
        // Agent stop logic would go here
        break;

      case 'status':
        const status = 'stopped'; // Would get actual status
        this.app.getNotificationManager().info(`Agent 状态: ${status}`);
        break;

      default:
        this.app.getNotificationManager().warning('用法: /agent start|stop|status');
    }
  }

  /**
   * Handle model commands
   */
  private async handleModelCommand(action: string | undefined): Promise<void> {
    if (action === 'list') {
      const models = await this.configManager.getAllModels();
      this.app.getNotificationManager().info(`可用模型: ${models.length} 个`);
    } else {
      this.app.getNotificationManager().info('使用 /model 命令管理模型');
    }
  }

  /**
   * Handle regular message
   */
  private async handleMessage(message: string): Promise<void> {
    try {
      // Add user message to context
      const context = this.agent.getContext();
      await context.addMessage({ role: Role.User, content: message });

      // Process with agent
      const result = await this.agent.process(message);

      // Display response
      this.app.getNotificationManager().success('处理完成');
      // In a full implementation, would update the chat panel with response
    } catch (error) {
      this.app.getNotificationManager().error(`处理失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Show help
   */
  private showHelp(): void {
    const helpText = `
可用命令:
  /help, /?     显示此帮助
  /agent start  启动 Agent
  /agent stop   停止 Agent
  /model list   查看模型列表
  /clear        清空对话
  /quit, /q     退出

快捷键:
  1-5          切换面板
  h/j/k/l       vim 风格导航
  T            切换主题
  x/?          显示选项菜单
`;
    this.app.getNotificationManager().info(helpText);
  }

  /**
   * Clear conversation
   */
  private clearConversation(): void {
    const context = this.agent.getContext();
    context.clear();
    this.app.getNotificationManager().info('对话已清空');
  }

  /**
   * Display a message in the chat
   */
  displayMessage(role: 'user' | 'assistant' | 'system', content: string): void {
    const context = this.agent.getContext();
    context.addMessage({ role: role === 'system' ? Role.System : role === 'user' ? Role.User : Role.Assistant, content });
  }

  /**
   * Show status message
   */
  showStatus(message: string): void {
    // Update status bar or show notification
    this.app.getNotificationManager().info(message);
  }

  /**
   * Get conversation history
   */
  getConversationHistory(): Array<{ role: string; content: string }> {
    const context = this.agent.getContext();
    return context.getMessages().map(m => ({
      role: m.role,
      content: m.content
    }));
  }

  /**
   * Render the TUI
   */
  render(): void {
    if (!this.initialized) {
      return;
    }
    this.app.getScreen().render();
  }

  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Destroy the TUI
   */
  destroy(): void {
    // Cleanup handled by app's onQuit
  }

  /**
   * Set input handler
   */
  setInputHandler(handler: (input: string) => void): void {
    // Would connect to input box
  }

  /**
   * Handle agent response
   */
  async handleAgentResponse(response: string): Promise<void> {
    this.displayMessage('assistant', response);
    this.render();
  }

  /**
   * Get layout (for compatibility)
   */
  getLayout(): any {
    return null;
  }

  /**
   * Cleanup resources
   */
  private async cleanup(): Promise<void> {
    this.initialized = false;
  }
}
