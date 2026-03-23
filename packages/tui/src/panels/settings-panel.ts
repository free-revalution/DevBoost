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
  onSwitchTheme?: (direction: 'next' | 'previous' | 'select') => void | Promise<void>;
  getCurrentTheme?: () => { name: string; index: number };
  getAllThemes?: () => Array<{ name: string; index: number }>;
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
  private onSwitchTheme?: (direction: 'next' | 'previous' | 'select') => void | Promise<void>;
  private getCurrentTheme?: () => { name: string; index: number };
  private getAllThemes?: () => Array<{ name: string; index: number }>;
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
    this.onSwitchTheme = config.onSwitchTheme;
    this.getCurrentTheme = config.getCurrentTheme;
    this.getAllThemes = config.getAllThemes;

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
        await this.showThemeMenu();
      },
      'Theme menu',
      this.id
    );

    // Bracket keys for quick theme switching
    this.eventManager.registerKey(
      ['['],
      async () => {
        await this.switchTheme('previous');
      },
      'Previous theme',
      this.id
    );

    this.eventManager.registerKey(
      [']'],
      async () => {
        await this.switchTheme('next');
      },
      'Next theme',
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
      content: 'e:编辑 | r:重置 | t:Telegram | T:主题 | [/:上一个主题 | ]/:下一个主题'
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
   * Show theme selection menu
   */
  private async showThemeMenu(): Promise<void> {
    const allThemes = this.getAllThemes ? this.getAllThemes() : [];
    const currentTheme = this.getCurrentTheme ? this.getCurrentTheme() : { name: 'Unknown', index: 0 };

    const menuItems = allThemes.map((t, i) => {
      const isCurrent = t.index === currentTheme.index;
      const prefix = isCurrent ? '→ ' : '  ';
      const highlight = isCurrent ? '{mauve-fg}{bold}' : '';
      const reset = isCurrent ? '{/mauve-fg}{/bold}' : '';
      return `${prefix}${highlight}${t.name}${reset}`;
    });

    const themeMenu = blessed.list({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: 35,
      height: allThemes.length + 4,
      label: '选择主题',
      tags: true,
      style: {
        bg: this.theme.bgDark,
        fg: this.theme.fg,
        border: { fg: this.theme.mauve },
        selected: {
          bg: this.theme.bgLight,
          fg: this.theme.mauve
        }
      },
      border: {
        type: 'line',
        fg: this.theme.mauve
      },
      items: menuItems,
      keys: true,
      vi: true,
      mouse: true
    } as any);

    // Select current theme
    themeMenu.select(currentTheme.index);
    themeMenu.focus();

    const closeMenu = async () => {
      themeMenu.destroy();
      this.screen.render();
    };

    const selectTheme = async () => {
      const selected = (themeMenu as any).selected;
      if (selected !== undefined && this.onSwitchTheme) {
        // Switch to selected theme
        for (let i = 0; i <= selected; i++) {
          await this.onSwitchTheme('next');
        }
      }
      await closeMenu();
    };

    this.screen.key(['escape', 'q'], async () => await closeMenu());
    this.screen.key(['enter'], selectTheme);

    themeMenu.key(['escape'], async () => await closeMenu());
    themeMenu.key(['enter'], selectTheme);

    this.screen.render();
  }

  /**
   * Switch theme
   */
  private async switchTheme(direction: 'next' | 'previous'): Promise<void> {
    if (this.onSwitchTheme) {
      await this.onSwitchTheme(direction);
      // Show notification
      const currentTheme = this.getCurrentTheme ? this.getCurrentTheme() : { name: 'Unknown', index: 0 };
      this.showNotification(`主题: ${currentTheme.name}`);
    }
  }

  /**
   * Toggle theme (legacy method - redirects to next theme)
   */
  private async toggleTheme(): Promise<void> {
    await this.switchTheme('next');
  }

  /**
   * Show a temporary notification
   */
  private showNotification(message: string, duration: number = 2000): void {
    const notification = blessed.box({
      parent: this.screen,
      top: 1,
      left: 'center',
      width: message.length + 4,
      height: 3,
      border: {
        type: 'line',
        fg: this.theme.mauve
      },
      style: {
        bg: this.theme.bgDark,
        fg: this.theme.fg
      },
      content: ` ${message} `,
      tags: true
    } as any);

    setTimeout(() => {
      notification.destroy();
      this.screen.render();
    }, duration);

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
        await this.showThemeMenu();
        break;
      case '[':
        await this.switchTheme('previous');
        break;
      case ']':
        await this.switchTheme('next');
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
      { key: 'T', description: '主题菜单' },
      { key: '[', description: '上一个主题' },
      { key: ']', description: '下一个主题' }
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
