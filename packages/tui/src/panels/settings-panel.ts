/**
 * Settings Panel
 *
 * Displays application settings and configuration options.
 */

import blessed from 'blessed';
import { BasePanel, PanelConfig } from './base-panel.js';
import { EventManager } from '../core/event-manager.js';
import { Theme } from '../theme.js';

/**
 * Setting item for display
 */
export interface SettingItem {
  key: string;
  label: string;
  value: string;
  type: 'string' | 'boolean' | 'number';
  editable: boolean;
}

/**
 * Settings panel configuration
 */
export interface SettingsPanelConfig extends PanelConfig {
  getSettings: () => SettingItem[] | Promise<SettingItem[]>;
  updateSetting?: (key: string, value: string) => void | Promise<void>;
  onEditConfig?: () => void | Promise<void>;
  onResetConfig?: () => void | Promise<void>;
  onTelegramSettings?: () => void | Promise<void>;
}

/**
 * Settings Panel class
 */
export class SettingsPanel extends BasePanel {
  private getSettings: () => SettingItem[] | Promise<SettingItem[]>;
  private updateSetting?: (key: string, value: string) => void | Promise<void>;
  private onEditConfig?: () => void | Promise<void>;
  private onResetConfig?: () => void | Promise<void>;
  private onTelegramSettings?: () => void | Promise<void>;
  private settingsList: ReturnType<typeof blessed.list>;

  constructor(
    screen: ReturnType<typeof blessed.screen>,
    eventManager: EventManager,
    config: SettingsPanelConfig
  ) {
    super(screen, eventManager, config);
    this.getSettings = config.getSettings;
    this.updateSetting = config.updateSetting;
    this.onEditConfig = config.onEditConfig;
    this.onResetConfig = config.onResetConfig;
    this.onTelegramSettings = config.onTelegramSettings;

    // Create settings list
    this.settingsList = blessed.list({
      parent: this.container,
      top: 2,
      left: 2,
      width: '100%-4',
      height: '100%-12',
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
      ['e'],
      async () => {
        await this.editConfig();
      },
      'Edit config',
      this.id
    );

    this.eventManager.registerKey(
      ['r'],
      async () => {
        await this.resetConfig();
      },
      'Reset to default',
      this.id
    );

    this.eventManager.registerKey(
      ['t'],
      async () => {
        await this.openTelegramSettings();
      },
      'Telegram settings',
      this.id
    );

    this.eventManager.registerKey(
      ['T'],
      async () => {
        await this.toggleTheme();
      },
      'Toggle theme',
      this.id
    );
  }

  /**
   * Render the panel content
   */
  protected renderContent(): void {
    this.renderContentAsync().catch(error => {
      console.error('Error rendering settings panel:', error);
    });
  }

  /**
   * Async render implementation
   */
  private async renderContentAsync(): Promise<void> {
    const settings = await Promise.resolve(this.getSettings());

    // Update header
    const header = `设置 (${settings.length} 项)`;
    this.container.setLabel(header);

    // Format settings list
    const settingItems = settings.map(s => {
      const valueColor = s.type === 'boolean'
        ? (s.value === 'true' ? '{green-fg}' : '{red-fg}')
        : '{cyan-fg}';
      const editable = s.editable ? '' : ' {gray-fg}(只读){/gray-fg}';
      return `  ${s.label}:{valueColor} ${s.value}{/${s.type === 'boolean' ? 'red|green' : 'cyan'}-fg}${editable}`;
    });

    this.settingsList.setItems(settingItems);

    // Add help text at bottom
    const helpText = blessed.text({
      parent: this.container,
      bottom: 1,
      left: 2,
      content: 'e:编辑 | r:重置 | t:Telegram | T:主题'
    });

    this.screen.render();
  }

  /**
   * Edit configuration
   */
  private async editConfig(): Promise<void> {
    if (this.onEditConfig) {
      await this.onEditConfig();
    }
  }

  /**
   * Reset configuration
   */
  private async resetConfig(): Promise<void> {
    if (this.onResetConfig) {
      // Show confirmation dialog
      const confirmBox = blessed.box({
        parent: this.screen,
        top: 'center',
        left: 'center',
        width: 50,
        height: 8,
        border: {
          type: 'line',
          fg: this.theme.red
        },
        style: {
          bg: this.theme.bgDark,
          fg: this.theme.fg
        },
        content: `确认重置配置?\n\n  所有设置将恢复为默认值\n\n  Enter: 确认 | Esc: 取消`
      } as any);

      const closeConfirm = () => {
        confirmBox.destroy();
        this.screen.render();
      };

      const doReset = async () => {
        await this.onResetConfig!();
        this.renderContent();
        closeConfirm();
      };

      this.screen.key(['escape'], closeConfirm);
      this.screen.key(['enter'], doReset);

      this.screen.render();
    }
  }

  /**
   * Open Telegram settings
   */
  private async openTelegramSettings(): Promise<void> {
    if (this.onTelegramSettings) {
      await this.onTelegramSettings();
    }
  }

  /**
   * Toggle theme
   */
  private async toggleTheme(): Promise<void> {
    // Theme toggle would be implemented here
    const notification = blessed.box({
      parent: this.screen,
      top: 1,
      left: 'center',
      width: 30,
      height: 3,
      border: {
        type: 'line',
        fg: this.theme.mauve
      },
      style: {
        bg: this.theme.bgDark,
        fg: this.theme.fg
      },
      content: '主题切换功能即将推出'
    } as any);

    setTimeout(() => {
      notification.destroy();
      this.screen.render();
    }, 2000);

    this.screen.render();
  }

  /**
   * Handle keyboard input
   */
  protected async handleKey(key: string): Promise<void> {
    switch (key) {
      case 'e':
        await this.editConfig();
        break;
      case 'r':
        await this.resetConfig();
        break;
      case 't':
        await this.openTelegramSettings();
        break;
      case 'T':
        await this.toggleTheme();
        break;
    }
  }

  /**
   * Get key bindings for this panel
   */
  getKeyBindings(): Array<{ key: string; description: string }> {
    return [
      { key: 'e', description: '编辑配置' },
      { key: 'r', description: '重置为默认' },
      { key: 't', description: 'Telegram 设置' },
      { key: 'T', description: '切换主题' }
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
