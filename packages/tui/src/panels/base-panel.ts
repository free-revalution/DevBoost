/**
 * Base Panel Class
 *
 * Abstract base class for all TUI panels.
 * Provides common functionality for rendering, input handling, and lifecycle management.
 */

import blessed from 'blessed';
import { EventManager, EventHandler } from '../core/event-manager.js';
import { Theme } from '../theme.js';

/**
 * Panel state
 */
export type PanelState = 'idle' | 'active' | 'loading' | 'error';

/**
 * Panel configuration
 */
export interface PanelConfig {
  id: string;
  title: string;
  position?: { top: number; left: number; width: number | string; height: number | string };
  theme: Theme;
  parent?: ReturnType<typeof blessed.box>; // Optional parent element
}

/**
 * Abstract base class for all panels
 */
export abstract class BasePanel {
  readonly id: string;
  readonly title: string;
  protected screen: ReturnType<typeof blessed.screen>;
  protected eventManager: EventManager;
  protected theme: Theme;
  protected container: ReturnType<typeof blessed.box>;
  protected state: PanelState;
  protected focused: boolean;

  constructor(
    screen: ReturnType<typeof blessed.screen>,
    eventManager: EventManager,
    config: PanelConfig
  ) {
    this.id = config.id;
    this.title = config.title;
    this.screen = screen;
    this.eventManager = eventManager;
    this.theme = config.theme;
    this.state = 'idle';
    this.focused = false;

    // Create container for this panel
    // Use parent if provided, otherwise use screen with position
    const parent = config.parent || screen;
    const position = config.position || { top: 0, left: 0, width: '100%', height: '100%' };

    this.container = blessed.box({
      parent: parent,
      top: position.top,
      left: position.left,
      width: position.width,
      height: position.height,
      hidden: true, // Hidden by default
      style: {
        bg: this.theme.bg,
        fg: this.theme.fg
      },
      tags: true
    });

    this.setupEventHandlers();
  }

  /**
   * Setup event handlers for this panel
   */
  protected setupEventHandlers(): void {
    // Focus event
    this.eventManager.on('focus', async (data) => {
      if (data.source === this.id) {
        this.onFocus();
      }
    });

    // Blur event
    this.eventManager.on('blur', async (data) => {
      if (data.source === this.id) {
        this.onBlur();
      }
    });
  }

  /**
   * Render the panel content
   * Must be implemented by subclasses
   */
  protected abstract renderContent(): void;

  /**
   * Handle keyboard input
   * Must be implemented by subclasses
   */
  protected abstract handleKey(key: string): void | Promise<void>;

  /**
   * Get key bindings for this panel
   * Returns array of { key, description } objects
   */
  abstract getKeyBindings(): Array<{ key: string; description: string }>;

  /**
   * Show the panel
   */
  show(): void {
    this.container.show();
    // Re-render content to ensure it's displayed correctly
    this.renderContent();
    // Ensure all child elements are visible
    if ((this.container as any).children) {
      for (const child of (this.container as any).children) {
        if (child.hide) {
          child.show();
        }
      }
    }
    this.screen.render();
  }

  /**
   * Hide the panel
   */
  hide(): void {
    this.container.hide();
    this.screen.render();
  }

  /**
   * Focus the panel
   */
  focus(): void {
    this.focused = true;
    this.container.style.border = { fg: this.theme.mauve };
    this.renderContent();
    this.eventManager.setContext(this.id);
  }

  /**
   * Unfocus the panel
   */
  blur(): void {
    this.focused = false;
    this.container.style.border = {};
    this.renderContent();
  }

  /**
   * Called when panel receives focus
   */
  onFocus(): void {
    this.focused = true;
    this.container.style.border = { fg: this.theme.mauve };
    this.renderContent();
  }

  /**
   * Called when panel loses focus
   */
  onBlur(): void {
    this.focused = false;
    this.container.style.border = {};
    this.renderContent();
  }

  /**
   * Refresh the panel content
   */
  refresh(): void {
    this.renderContent();
    this.screen.render();
  }

  /**
   * Set the panel state
   */
  setState(state: PanelState): void {
    this.state = state;
    this.renderContent();
  }

  /**
   * Get the panel state
   */
  getState(): PanelState {
    return this.state;
  }

  /**
   * Check if panel is focused
   */
  isFocused(): boolean {
    return this.focused;
  }

  /**
   * Get the container element
   */
  getContainer(): ReturnType<typeof blessed.box> {
    return this.container;
  }

  /**
   * Update theme for this panel
   * Called when the global theme changes
   */
  updateTheme(theme: Theme): void {
    this.theme = theme;

    // Update container styles
    this.container.style.bg = theme.bg;
    this.container.style.fg = theme.fg;

    // Update border if focused
    if (this.focused) {
      this.container.style.border = { fg: theme.mauve };
    }

    // Re-render content with new theme
    this.renderContent();
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.eventManager.off('focus', async () => {});
    this.eventManager.off('blur', async () => {});
  }
}
