import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DevBoostCLI } from './cli.js';

// Mock the TUI modules
vi.mock('@devboost/tui', () => ({
  ScreenManager: vi.fn().mockImplementation(() => ({
    screen: {
      destroy: vi.fn()
    }
  })),
  MainLayout: vi.fn().mockImplementation(() => ({
    input: {
      focus: vi.fn()
    },
    render: vi.fn()
  })),
  CatppuccinMocha: {}
}));

describe('DevBoostCLI', () => {
  let cli: DevBoostCLI;

  beforeEach(() => {
    cli = new DevBoostCLI();
  });

  describe('constructor', () => {
    it('should create instance with version', () => {
      expect(cli.version).toBe('0.1.0');
    });
  });

  describe('run', () => {
    it('should initialize screen manager and layout', async () => {
      const { ScreenManager, MainLayout, CatppuccinMocha } = await import('@devboost/tui');

      await cli.run();

      expect(ScreenManager).toHaveBeenCalledOnce();
      expect(MainLayout).toHaveBeenCalledWith(
        expect.anything(),
        CatppuccinMocha
      );
    });

    it('should focus input and render layout', async () => {
      const { MainLayout } = await import('@devboost/tui');
      const mockLayout = {
        input: { focus: vi.fn() },
        render: vi.fn()
      };
      MainLayout.mockImplementationOnce(() => mockLayout);

      await cli.run();

      expect(mockLayout.input.focus).toHaveBeenCalledOnce();
      expect(mockLayout.render).toHaveBeenCalledOnce();
    });

    it('should handle errors gracefully', async () => {
      const { ScreenManager } = await import('@devboost/tui');
      ScreenManager.mockImplementationOnce(() => {
        throw new Error('Screen init failed');
      });

      await expect(cli.run()).rejects.toThrow('Screen init failed');
    });
  });
});
