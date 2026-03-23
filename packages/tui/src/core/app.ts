/**
 * TUI Application Controller
 *
 * Main application class that manages panels, navigation, and overall TUI lifecycle.
 * Inspired by lazydocker's panel-driven architecture.
 */

import blessed from 'blessed';
import { EventManager, KeyBinding } from './event-manager.js';
import { BasePanel, PanelConfig } from '../panels/base-panel.js';
import { Theme, CatppuccinMocha } from '../theme.js';

/**
 * Panel configuration for registration
 */
export interface PanelRegistration {
  id: string;
  title: string;
  index: number; // 1-5 for keyboard shortcuts
  factory: () => BasePanel;
}

/**
 * App configuration
 */
export interface AppConfig {
  theme?: Theme;
  panels?: PanelRegistration[];
  onQuit?: () => void | Promise<void>;
}

/**
 * Main TUI Application class
 */
export class App {
  readonly screen: ReturnType<typeof blessed.screen>;
  readonly eventManager: EventManager;
  readonly theme: Theme;
  private panels: Map<number, BasePanel>;
  private currentPanel: number | null;
  private sidebar!: ReturnType<typeof blessed.box>;
  private mainArea!: ReturnType<typeof blessed.box>;
  private statusBar!: ReturnType<typeof blessed.box>;
  private inputBox!: ReturnType<typeof blessed.textbox>;
  private onQuitCallback?: () => void | Promise<void>;

  constructor(config: AppConfig = {}) {
    this.theme = config.theme || CatppuccinMocha;
    this.panels = new Map();
    this.currentPanel = null;
    this.onQuitCallback = config.onQuit;

    // Create blessed screen
    this.screen = blessed.screen({
      smartCSR: true,
      fullUnicode: false
    });

    // Create event manager
    this.eventManager = new EventManager(this.screen);

    // Setup UI
    this.setupUI();

    // Register default panels
    if (config.panels) {
      for (const panel of config.panels) {
        this.registerPanel(panel);
      }
    }

    // Setup event handlers
    this.setupEventHandlers();

    // Register default key bindings
    this.setupDefaultKeyBindings();
  }

  /**
   * Setup the main UI layout
   */
  private setupUI(): void {
    // Sidebar for panel navigation
    this.sidebar = blessed.box({
      parent: this.screen,
      left: 0,
      top: 0,
      width: 20,
      height: '100%-3',
      style: {
        bg: this.theme.bgDark,
        fg: this.theme.fg
      },
      border: {
        type: 'line',
        fg: this.theme.border as any
      }
    });

    // Main content area
    this.mainArea = blessed.box({
      parent: this.screen,
      left: 20,
      top: 0,
      width: '100%-20',
      height: '100%-3',
      style: {
        bg: this.theme.bg,
        fg: this.theme.fg
      }
    });

    // Status bar at bottom
    this.statusBar = blessed.box({
      parent: this.screen,
      left: 0,
      bottom: 3,
      width: '100%',
      height: 1,
      style: {
        bg: this.theme.bgLight,
        fg: this.theme.fg
      }
    });

    // Input box at bottom
    this.inputBox = blessed.textbox({
      parent: this.screen,
      left: 0,
      bottom: 0,
      width: '100%',
      height: 3,
      inputOnFocus: true,
      prompt: '> ',
      style: {
        fg: this.theme.fg,
        bg: this.theme.bg,
        focus: {
          bg: this.theme.bgLight
        }
      },
      border: {
        type: 'line'
      }
    });
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    // Panel switching
    this.eventManager.on('panel:switch', async (data) => {
      const panelData = data.data as { panel: number };
      if (panelData.panel) {
        this.switchPanel(panelData.panel);
      }
    });

    // Quit event
    this.eventManager.on('quit', async () => {
      await this.quit();
    });

    // Panel action (show options menu)
    this.eventManager.on('panel:action', async (data) => {
      const actionData = data.data as { action: string };
      if (actionData.action === 'show-options') {
        this.showOptionsMenu();
      }
    });
  }

  /**
   * Setup default key bindings
   */
  private setupDefaultKeyBindings(): void {
    // vim-style navigation
    this.eventManager.registerKey(
      ['h'],
      async () => {
        // Left navigation - could be used for sub-panels
      },
      'Navigate left'
    );

    this.eventManager.registerKey(
      ['l'],
      async () => {
        // Right navigation - could be used for sub-panels
      },
      'Navigate right'
    );

    // Enter key for confirm
    this.eventManager.registerKey(
      ['enter'],
      async () => {
        const panel = this.getCurrentPanel();
        if (panel && typeof panel['handleKey'] === 'function') {
          await panel['handleKey']('enter');
        }
      },
      'Confirm selection'
    );

    // Escape to go back
    this.eventManager.registerKey(
      ['escape'],
      async () => {
        const panel = this.getCurrentPanel();
        if (panel && typeof panel['handleKey'] === 'function') {
          await panel['handleKey']('escape');
        }
      },
      'Go back'
    );
  }

  /**
   * Register a panel
   */
  registerPanel(registration: PanelRegistration): void {
    const panel = registration.factory();
    this.panels.set(registration.index, panel);

    // Add to sidebar
    const sidebarItem = blessed.box({
      parent: this.sidebar,
      top: 2 + (registration.index - 1) * 2,
      left: 1,
      width: '100%-2',
      height: 1,
      content: `${registration.index}. ${registration.title}`,
      style: {
        fg: this.theme.fg
      }
    } as any);

    this.screen.render();
  }

  /**
   * Switch to a panel by index
   */
  switchPanel(index: number): void {
    const panel = this.panels.get(index);
    if (!panel) {
      return;
    }

    // Hide current panel
    if (this.currentPanel !== null) {
      const current = this.panels.get(this.currentPanel);
      if (current) {
        current.hide();
        current.blur();
      }
    }

    // Show new panel
    panel.show();
    panel.focus();
    this.currentPanel = index;

    // Update sidebar highlight
    this.updateSidebar();
    this.updateStatusBar();

    // Emit focus event
    this.eventManager.emit({
      type: 'focus',
      source: panel.id
    });
  }

  /**
   * Get the current active panel
   */
  getCurrentPanel(): BasePanel | null {
    if (this.currentPanel === null) {
      return null;
    }
    return this.panels.get(this.currentPanel) || null;
  }

  /**
   * Update sidebar highlighting
   */
  private updateSidebar(): void {
    // Rebuild sidebar content with current panel highlighted
    this.sidebar.setContent('');
    let y = 1;
    for (const [index, panel] of this.panels) {
      const isCurrent = index === this.currentPanel;
      const prefix = isCurrent ? '→' : ' ';
      const highlight = isCurrent ? `{${this.theme.mauve}-fg}{bold}` : '';
      const reset = isCurrent ? '{' + '/}' : '';

      const item = blessed.box({
        parent: this.sidebar,
        top: y,
        left: 1,
        width: '100%-2',
        height: 1,
        content: `${highlight}${prefix} ${panel.title}${reset}`,
        tags: true
      });

      y += 2;
    }
  }

  /**
   * Update status bar content
   */
  private updateStatusBar(): void {
    const panel = this.getCurrentPanel();
    if (!panel) {
      this.statusBar.setContent('Press ? for help, q to quit');
      return;
    }

    const bindings = panel.getKeyBindings();
    const keyHints = bindings.slice(0, 3).map(b => `${b.key}:${b.description}`).join(' | ');
    this.statusBar.setContent(`${keyHints} | ?:help | q:quit`);
  }

  /**
   * Show options menu
   */
  private showOptionsMenu(): void {
    const panel = this.getCurrentPanel();
    if (!panel) {
      return;
    }

    const bindings = panel.getKeyBindings();
    if (bindings.length === 0) {
      return;
    }

    // Create overlay menu
    const menu = blessed.box({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: 40,
      height: bindings.length + 4,
      border: {
        type: 'line',
        fg: this.theme.mauve
      },
      style: {
        bg: this.theme.bgDark,
        fg: this.theme.fg
      },
      content: '可用操作\n' + '-'.repeat(38) + '\n' +
        bindings.map(b => `  ${b.key.padEnd(8)} ${b.description}`).join('\n') +
        '\n' + '-'.repeat(38) + '\n'  +
        '  按 Esc 或 q 关闭'
    } as any);

    // Close menu on keypress
    const closeMenu = async () => {
      menu.destroy();
      this.screen.render();
    };

    this.screen.key(['escape'], closeMenu);
    this.screen.key(['q'], closeMenu);
    this.screen.render();
  }

  /**
   * Start the application
   */
  start(): void {
    // Switch to first panel by default
    if (this.panels.has(1)) {
      this.switchPanel(1);
    } else {
      // If no panels registered, show welcome message
      (this.mainArea as any).setContent('{center}欢迎使用 DevBoost\n\n按 ? 查看帮助，按 q 退出{/center}');
      (this.mainArea as any).tags = true;
    }

    // Focus input box
    this.inputBox.focus();

    this.screen.render();
  }

  /**
   * Quit the application
   */
  async quit(): Promise<void> {
    // Destroy all panels
    for (const panel of this.panels.values()) {
      panel.destroy();
    }

    // Call quit callback
    if (this.onQuitCallback) {
      await this.onQuitCallback();
    }

    // Destroy screen
    this.screen.destroy();
  }

  /**
   * Get the blessed screen instance
   */
  getScreen(): ReturnType<typeof blessed.screen> {
    return this.screen;
  }

  /**
   * Get the event manager
   */
  getEventManager(): EventManager {
    return this.eventManager;
  }
}
