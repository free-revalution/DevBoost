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

  constructor(agent: Agent, configManager: ConfigManager) {
    this.agent = agent;
    this.configManager = configManager;

    // Create theme manager
    this.themeManager = new ThemeManager();

    // Create the App first (without panels)
    this.app = new App({
      themeManager: this.themeManager,
      onQuit: async () => {
        await this.cleanup();
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
      factory: () => new ChatPanel(screen, eventManager, {
        id: 'chat',
        title: '对话',
        position: { top: 0, left: 0, width: '100%', height: '100%' },
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
      factory: () => new AgentPanel(screen, eventManager, {
        id: 'agent',
        title: 'Agent',
        position: { top: 0, left: 0, width: '100%', height: '100%' },
        theme: theme,
        agent: this.agent
      })
    });

    // Register Model Panel
    this.app.registerPanel({
      id: 'model',
      title: '模型',
      index: 3,
      factory: () => new ModelPanel(screen, eventManager, {
        id: 'model',
        title: '模型',
        position: { top: 0, left: 0, width: '100%', height: '100%' },
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
      factory: () => new ToolsPanel(screen, eventManager, {
        id: 'tools',
        title: '工具',
        position: { top: 0, left: 0, width: '100%', height: '100%' },
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
      factory: () => new SettingsPanel(screen, eventManager, {
        id: 'settings',
        title: '设置',
        position: { top: 0, left: 0, width: '100%', height: '100%' },
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
    // For now, this is a placeholder
  }

  /**
   * Clear conversation
   */
  clearConversation(): void {
    const context = this.agent.getContext();
    context.clear();
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
