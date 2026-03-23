/**
 * Agent Panel
 *
 * Displays Agent status and controls for starting/stopping/restarting.
 */

import blessed from 'blessed';
import { BasePanel, PanelConfig, PanelState } from './base-panel.js';
import { EventManager } from '../core/event-manager.js';
import { Theme } from '../theme.js';
import { Agent } from '@devboost/core';

/**
 * Agent status display
 */
export type AgentStatus = 'running' | 'stopped' | 'error' | 'starting';

/**
 * Agent panel configuration
 */
export interface AgentPanelConfig extends PanelConfig {
  agent: Agent;
}

/**
 * Agent Panel class
 */
export class AgentPanel extends BasePanel {
  private agent: Agent;
  private statusBox: ReturnType<typeof blessed.box>;
  private controlsBox: ReturnType<typeof blessed.box>;
  private currentStatus: AgentStatus = 'stopped';
  private statusMessage: string = '';

  constructor(
    screen: ReturnType<typeof blessed.screen>,
    eventManager: EventManager,
    config: AgentPanelConfig
  ) {
    super(screen, eventManager, config);
    this.agent = config.agent;

    // Create status box
    this.statusBox = blessed.box({
      parent: this.container,
      top: 2,
      left: 2,
      width: '100%-4',
      height: 8,
      style: {
        bg: this.theme.bgDark,
        fg: this.theme.fg
      },
      border: {
        type: 'line',
        fg: this.theme.border as any
      }
    });

    // Create controls box
    this.controlsBox = blessed.box({
      parent: this.container,
      top: 12,
      left: 2,
      width: '100%-4',
      height: 10,
      style: {
        bg: this.theme.bgDark,
        fg: this.theme.fg
      },
      border: {
        type: 'line',
        fg: this.theme.border as any
      }
    });

    // Setup key bindings
    this.setupKeyBindings();

    // Initial render
    this.renderContent();
  }

  /**
   * Setup key bindings for this panel
   */
  private setupKeyBindings(): void {
    this.eventManager.registerKey(
      ['enter'],
      async () => {
        await this.toggleAgent();
      },
      'Start/Stop Agent',
      this.id
    );

    this.eventManager.registerKey(
      ['r'],
      async () => {
        await this.restartAgent();
      },
      'Restart Agent',
      this.id
    );

    this.eventManager.registerKey(
      ['i'],
      async () => {
        await this.showInfo();
      },
      'Show Info',
      this.id
    );

    this.eventManager.registerKey(
      ['l'],
      async () => {
        await this.showLogs();
      },
      'Show Logs',
      this.id
    );
  }

  /**
   * Render the panel content
   */
  protected renderContent(): void {
    const statusIcon = this.getStatusIcon();
    const statusText = this.getStatusText();

    // Update status box
    this.statusBox.setContent(
      `Agent 状态\n\n` +
      `  ${statusIcon} ${statusText}\n` +
      `  ${this.statusMessage ? '\n  ' + this.statusMessage : ''}`
    );

    // Update controls box
    const controls = [
      '快捷键操作:',
      '  Enter  启动/停止 Agent',
      '  r      重启 Agent',
      '  i      查看详细信息',
      '  l      查看日志'
    ].join('\n');

    this.controlsBox.setContent(controls);
  }

  /**
   * Get status icon based on current status
   */
  private getStatusIcon(): string {
    switch (this.currentStatus) {
      case 'running':
        return '{green-fg}●{/green-fg}';
      case 'stopped':
        return '{gray-fg}○{/gray-fg}';
      case 'error':
        return '{red-fg}⚠{/red-fg}';
      case 'starting':
        return '{yellow-fg}⏳{/yellow-fg}';
      default:
        return '?';
    }
  }

  /**
   * Get status text
   */
  private getStatusText(): string {
    switch (this.currentStatus) {
      case 'running':
        return '运行中';
      case 'stopped':
        return '已停止';
      case 'error':
        return '错误';
      case 'starting':
        return '启动中';
      default:
        return '未知';
    }
  }

  /**
   * Toggle agent start/stop
   */
  private async toggleAgent(): Promise<void> {
    if (this.currentStatus === 'running') {
      await this.stopAgent();
    } else {
      await this.startAgent();
    }
  }

  /**
   * Start the agent
   */
  private async startAgent(): Promise<void> {
    this.currentStatus = 'starting';
    this.statusMessage = '正在启动...';
    this.renderContent();
    this.screen.render();

    try {
      // The agent is already initialized in CLI
      // Just mark as running for now
      this.currentStatus = 'running';
      this.statusMessage = '';
      this.setState('active');
    } catch (error) {
      this.currentStatus = 'error';
      this.statusMessage = error instanceof Error ? error.message : '启动失败';
      this.setState('error');
    }

    this.renderContent();
    this.screen.render();
  }

  /**
   * Stop the agent
   */
  private async stopAgent(): Promise<void> {
    this.currentStatus = 'starting';
    this.statusMessage = '正在停止...';
    this.renderContent();
    this.screen.render();

    try {
      await this.agent.shutdown();
      this.currentStatus = 'stopped';
      this.statusMessage = '';
      this.setState('idle');
    } catch (error) {
      this.currentStatus = 'error';
      this.statusMessage = error instanceof Error ? error.message : '停止失败';
      this.setState('error');
    }

    this.renderContent();
    this.screen.render();
  }

  /**
   * Restart the agent
   */
  private async restartAgent(): Promise<void> {
    this.statusMessage = '正在重启...';
    this.renderContent();
    this.screen.render();

    try {
      if (this.currentStatus === 'running') {
        await this.agent.shutdown();
      }

      // Restart would go here
      this.currentStatus = 'running';
      this.statusMessage = '';
      this.setState('active');
    } catch (error) {
      this.currentStatus = 'error';
      this.statusMessage = error instanceof Error ? error.message : '重启失败';
      this.setState('error');
    }

    this.renderContent();
    this.screen.render();
  }

  /**
   * Show agent info
   */
  private async showInfo(): Promise<void> {
    const context = this.agent.getContext();
    const messages = context.getMessages();
    const messageCount = messages.length;

    const infoBox = blessed.box({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: 50,
      height: 15,
      border: {
        type: 'line',
        fg: this.theme.mauve
      },
      style: {
        bg: this.theme.bgDark,
        fg: this.theme.fg
      },
      content: `Agent 信息\n\n` +
        `  状态: ${this.getStatusText()}\n` +
        `  上下文消息数: ${messageCount}\n\n` +
        `  按 Esc 或 q 关闭`
    } as any);

    const closeInfo = () => {
      infoBox.destroy();
      this.screen.render();
    };

    this.screen.key(['escape', 'q'], closeInfo);
    this.screen.render();
  }

  /**
   * Show agent logs
   */
  private async showLogs(): Promise<void> {
    const logsBox = blessed.box({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: 80,
      height: 20,
      border: {
        type: 'line',
        fg: this.theme.mauve
      },
      style: {
        bg: this.theme.bgDark,
        fg: this.theme.fg
      },
      content: `Agent 日志\n\n` +
        `  暂无日志\n\n` +
        `  按 Esc 或 q 关闭`
    } as any);

    const closeLogs = () => {
      logsBox.destroy();
      this.screen.render();
    };

    this.screen.key(['escape', 'q'], closeLogs);
    this.screen.render();
  }

  /**
   * Handle keyboard input
   */
  protected async handleKey(key: string): Promise<void> {
    switch (key) {
      case 'enter':
        await this.toggleAgent();
        break;
      case 'r':
        await this.restartAgent();
        break;
      case 'i':
        await this.showInfo();
        break;
      case 'l':
        await this.showLogs();
        break;
    }
  }

  /**
   * Get key bindings for this panel
   */
  getKeyBindings(): Array<{ key: string; description: string }> {
    return [
      { key: 'Enter', description: '启动/停止 Agent' },
      { key: 'r', description: '重启 Agent' },
      { key: 'i', description: '查看详细信息' },
      { key: 'l', description: '查看日志' }
    ];
  }

  /**
   * Set the agent status externally
   */
  setAgentStatus(status: AgentStatus, message?: string): void {
    this.currentStatus = status;
    if (message !== undefined) {
      this.statusMessage = message;
    }
    this.renderContent();
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    super.destroy();
    // Additional cleanup if needed
  }
}
