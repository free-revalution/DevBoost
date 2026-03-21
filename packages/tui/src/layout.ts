import blessed from 'blessed';
import { Theme } from './theme.js';

export class MainLayout {
  readonly screen: ReturnType<typeof blessed.screen>;
  readonly main: ReturnType<typeof blessed.box>;
  readonly header: ReturnType<typeof blessed.box>;
  readonly input: ReturnType<typeof blessed.textbox>;

  constructor(screen: ReturnType<typeof blessed.screen>, theme: Theme) {
    this.screen = screen;

    this.main = blessed.box({
      parent: screen,
      top: 0, left: 0, width: '100%', height: '100%',
      style: { bg: theme.bg }
    });

    this.header = blessed.box({
      parent: this.main,
      top: 0, left: 0, width: '100%', height: 3,
      content: ' {bold}{cyan-fg}DevBoost{/cyan-fg}{/bold} {gray-fg}v0.1.0{/gray-fg}',
      tags: true,
      style: { bg: theme.bgDark, fg: theme.fg, border: { fg: theme.border } }
    });

    this.input = blessed.textbox({
      parent: this.main,
      bottom: 0, left: 0, width: '100%', height: 3,
      inputOnFocus: true, prompt: '> ',
      style: {
        fg: theme.fg,
        bg: theme.bg,
        focus: { bg: theme.bgLight }
      },
      border: { type: 'line' }
    });
  }

  render(): void {
    this.screen.render();
  }
}
