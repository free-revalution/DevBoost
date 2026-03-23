/**
 * Event Manager for TUI
 *
 * Centralized event handling system for the TUI application.
 * Manages keyboard events, panel focus, and event propagation.
 */

import blessed from 'blessed';

/**
 * Event types in the TUI system
 */
export type EventType =
  | 'key'
  | 'focus'
  | 'blur'
  | 'render'
  | 'quit'
  | 'panel:switch'
  | 'panel:action';

/**
 * Event data structure
 */
export interface EventData {
  type: EventType;
  source: string;
  data?: unknown;
}

/**
 * Event handler function type
 */
export type EventHandler = (data: EventData) => void | Promise<void>;

/**
 * Key binding configuration
 */
export interface KeyBinding {
  key: string | string[];
  handler: EventHandler;
  description?: string;
  context?: string; // Panel ID where this binding is active
}

/**
 * Event Manager class
 */
export class EventManager {
  private screen: ReturnType<typeof blessed.screen>;
  private handlers: Map<EventType, Set<EventHandler>>;
  private keyBindings: KeyBinding[];
  private currentContext: string | null = null;
  private globalKeys: Set<string>;

  constructor(screen: ReturnType<typeof blessed.screen>) {
    this.screen = screen;
    this.handlers = new Map();
    this.keyBindings = [];
    this.globalKeys = new Set();

    // Initialize handler sets for all event types
    for (const type of ['key', 'focus', 'blur', 'render', 'quit', 'panel:switch', 'panel:action'] as EventType[]) {
      this.handlers.set(type, new Set());
    }

    this.setupGlobalKeys();
  }

  /**
   * Setup global key bindings
   */
  private setupGlobalKeys(): void {
    // Global quit keys
    this.registerKey(
      ['q', 'escape', 'C-c'],
      async () => {
        await this.emit({ type: 'quit', source: 'global' });
      },
      'Quit application'
    );

    // Help key
    this.registerKey(
      ['?', 'x'],
      async () => {
        await this.emit({ type: 'panel:action', source: 'global', data: { action: 'show-options' } });
      },
      'Show options menu'
    );

    // Panel switching keys
    for (let i = 1; i <= 5; i++) {
      this.registerKey(
        [String(i)],
        async () => {
          await this.emit({ type: 'panel:switch', source: 'global', data: { panel: i } });
        },
        `Switch to panel ${i}`
      );
    }
  }

  /**
   * Register a key binding
   */
  registerKey(
    keys: string | string[],
    handler: EventHandler,
    description?: string,
    context?: string
  ): void {
    const keyArray = Array.isArray(keys) ? keys : [keys];

    this.keyBindings.push({
      key: keyArray,
      handler,
      description,
      context
    });

    // Register with blessed screen
    this.screen.key(keyArray, async () => {
      // Check context
      if (context && context !== this.currentContext) {
        return;
      }

      await handler({ type: 'key', source: context || 'global' });
    });
  }

  /**
   * Register an event handler
   */
  on(event: EventType, handler: EventHandler): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.add(handler);
    }
  }

  /**
   * Unregister an event handler
   */
  off(event: EventType, handler: EventHandler): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * Emit an event
   */
  async emit(data: EventData): Promise<void> {
    const handlers = this.handlers.get(data.type);
    if (handlers) {
      for (const handler of handlers) {
        try {
          await handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${data.type}:`, error);
        }
      }
    }
  }

  /**
   * Set the current context (active panel)
   */
  setContext(context: string | null): void {
    this.currentContext = context;
  }

  /**
   * Get the current context
   */
  getContext(): string | null {
    return this.currentContext;
  }

  /**
   * Get all key bindings for a specific context
   */
  getKeyBindings(context?: string): KeyBinding[] {
    return this.keyBindings.filter(
      binding => !binding.context || binding.context === context || !context
    );
  }

  /**
   * Remove all key bindings for a context
   */
  clearContextBindings(context: string): void {
    this.keyBindings = this.keyBindings.filter(binding => binding.context !== context);
  }

  /**
   * Cleanup event handlers
   */
  destroy(): void {
    this.handlers.clear();
    this.keyBindings = [];
    this.currentContext = null;
  }
}
