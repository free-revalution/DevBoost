import blessed from 'blessed';

export class ScreenManager {
  readonly screen: ReturnType<typeof blessed.screen>;

  constructor() {
    this.screen = blessed.screen({
      smartCSR: true,
      fullUnicode: false
    });
    this.screen.key(['q', 'escape', 'C-c'], () => process.exit(0));
  }

  render(): void {
    this.screen.render();
  }

  registerKey(keys: string[], handler: () => void): void {
    this.screen.key(keys, handler);
  }

  destroy(): void {
    this.screen.destroy();
  }
}
