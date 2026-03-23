/**
 * Chat Panel
 *
 * Displays conversation history and allows searching.
 */

import blessed from 'blessed';
import { BasePanel, PanelConfig } from './base-panel.js';
import { EventManager } from '../core/event-manager.js';
import { Theme } from '../theme.js';
import { Role } from '@devboost/core';

/**
 * Message format for display
 */
interface DisplayMessage {
  role: string;
  content: string;
  timestamp?: string;
}

/**
 * Chat panel configuration
 */
export interface ChatPanelConfig extends PanelConfig {
  getMessages: () => Array<{ role: Role; content: string; timestamp?: string }>;
  onClear?: () => void | Promise<void>;
}

/**
 * Chat Panel class
 */
export class ChatPanel extends BasePanel {
  private getMessages: () => Array<{ role: Role; content: string; timestamp?: string }>;
  private onClear?: () => void | Promise<void>;
  private messageList: ReturnType<typeof blessed.list>;
  private searchQuery: string = '';

  constructor(
    screen: ReturnType<typeof blessed.screen>,
    eventManager: EventManager,
    config: ChatPanelConfig
  ) {
    super(screen, eventManager, config);
    this.getMessages = config.getMessages;
    this.onClear = config.onClear;

    // Create message list
    this.messageList = blessed.list({
      parent: this.container,
      top: 2,
      left: 2,
      width: '100%-4',
      height: '100%-8',
      tags: true,
      style: {
        bg: this.theme.bg,
        fg: this.theme.fg,
        selected: {
          bg: this.theme.bgLight,
          fg: this.theme.mauve
        }
      },
      border: {
        type: 'line',
        fg: this.theme.border as any
      },
      scrollable: true,
      alwaysScroll: true,
      keys: true,
      vi: true,
      mouse: true
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
      ['c'],
      async () => {
        await this.clearMessages();
      },
      'Clear conversation',
      this.id
    );

    this.eventManager.registerKey(
      ['/'],
      async () => {
        await this.showSearch();
      },
      'Search messages',
      this.id
    );
  }

  /**
   * Render the panel content
   */
  protected renderContent(): void {
    const messages = this.getMessages();
    const displayMessages = this.formatMessages(messages);

    // Update header
    const header = `对话历史 (${messages.length} 条消息)`;
    this.container.setLabel(header);

    // Update message list
    this.messageList.setItems(displayMessages);

    // Scroll to bottom
    this.messageList.select(displayMessages.length - 1);
  }

  /**
   * Format messages for display
   */
  private formatMessages(messages: Array<{ role: Role; content: string; timestamp?: string }>): string[] {
    return messages.map((msg, index) => {
      const roleLabel = msg.role === Role.User ? '用户' : '助手';
      const contentPreview = msg.content.length > 60
        ? msg.content.substring(0, 60) + '...'
        : msg.content;
      return `${index + 1}. [{roleLabel}] ${contentPreview}`;
    });
  }

  /**
   * Clear all messages
   */
  private async clearMessages(): Promise<void> {
    if (this.onClear) {
      await this.onClear();
    }
    this.renderContent();
    this.screen.render();
  }

  /**
   * Show search dialog
   */
  private async showSearch(): Promise<void> {
    const searchBox = blessed.form({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: 50,
      height: 8,
      border: {
        type: 'line',
        fg: this.theme.mauve
      },
      style: {
        bg: this.theme.bgDark,
        fg: this.theme.fg
      }
    } as any);

    const prompt = blessed.text({
      parent: searchBox,
      top: 1,
      left: 2,
      content: '搜索消息:'
    });

    const input = blessed.textbox({
      parent: searchBox,
      top: 3,
      left: 2,
      width: '100%-4',
      height: 1,
      inputOnFocus: true,
      style: {
        fg: this.theme.fg,
        bg: this.theme.bg,
        focus: {
          bg: this.theme.bgLight
        }
      }
    } as any);

    const help = blessed.text({
      parent: searchBox,
      bottom: 1,
      left: 2,
      content: 'Enter: 搜索 | Esc: 取消'
    });

    input.focus();

    const closeSearch = async () => {
      searchBox.destroy();
      this.screen.render();
    };

    const doSearch = async () => {
      const query = input.getValue();
      this.searchQuery = query;
      if (query) {
        const messages = this.getMessages();
        const filtered = messages.filter(m =>
          m.content.toLowerCase().includes(query.toLowerCase())
        );
        const displayMessages = this.formatMessages(filtered);
        this.messageList.setItems(displayMessages);
        this.screen.render();
      }
      await closeSearch();
    };

    this.screen.key(['escape'], closeSearch);
    this.screen.key(['enter'], doSearch);

    this.screen.render();
  }

  /**
   * Handle keyboard input
   */
  protected async handleKey(key: string): Promise<void> {
    switch (key) {
      case 'c':
        await this.clearMessages();
        break;
      case '/':
        await this.showSearch();
        break;
    }
  }

  /**
   * Get key bindings for this panel
   */
  getKeyBindings(): Array<{ key: string; description: string }> {
    return [
      { key: 'c', description: '清空对话' },
      { key: '/', description: '搜索消息' }
    ];
  }

  /**
   * Refresh the panel content
   */
  refresh(): void {
    super.refresh();
    this.renderContent();
  }
}
