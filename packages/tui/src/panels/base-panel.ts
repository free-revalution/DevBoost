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
  position: { top: number; left: number; width: number | string; height: number | string };
  theme: Theme;
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
    this.container = blessed.box({
      parent: screen,
      top: config.position.top,
      left: config.position.left,
      width: config.position.width,
      height: config.position.height,
      hidden: true, // Hidden by default
      style: {
        bg: this.theme.bg,
        fg: this.theme.fg
      }
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
    this.renderContent();
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
   * Cleanup resources
   */
  destroy(): void {
    this.eventManager.off('focus', async () => {});
    this.eventManager.off('blur', async () => {});
  }
}
