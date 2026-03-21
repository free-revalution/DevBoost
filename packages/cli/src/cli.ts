import { ScreenManager } from '@devboost/tui';
import { MainLayout } from '@devboost/tui';
import { CatppuccinMocha } from '@devboost/tui';

export class DevBoostCLI {
  readonly version = '0.1.0';

  async run(): Promise<void> {
    const screenManager = new ScreenManager();
    const layout = new MainLayout(screenManager.screen, CatppuccinMocha);
    layout.input.focus();
    layout.render();
  }
}
