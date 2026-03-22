import blessed from 'blessed';

export class ScreenManager {
  readonly screen: ReturnType<typeof blessed.screen>;
  private quitHandler?: () => void;

  constructor() {
    this.screen = blessed.screen({
      smartCSR: true,
      fullUnicode: false
    });
    // Don't auto-register quit keys - let the CLI handle them
    // This allows proper cleanup before exit
  }

  /**
   * Register a quit handler that will be called on q/escape/C-c
   */
  onQuit(handler: () => void): void {
    this.quitHandler = handler;
    this.screen.key(['q', 'escape', 'C-c'], () => {
      // First destroy the screen to restore terminal
      this.destroy();
      // Then call the quit handler
      if (this.quitHandler) {
        this.quitHandler();
      }
    });
  }

  render(): void {
    this.screen.render();
  }

  registerKey(keys: string[], handler: () => void): void {
    this.screen.key(keys, handler);
  }

  destroy(): void {
    try {
      this.screen.destroy();
    } catch (e) {
      // Ignore errors during destroy
    }
  }
}
