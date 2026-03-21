/**
 * Tests for Browser Manager
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { BrowserManager } from '../../src/jlcpcb/manager';

// Mock Playwright
vi.mock('playwright', () => ({
  chromium: {
    launch: vi.fn(),
    launchPersistentContext: vi.fn()
  }
}));

describe('BrowserManager', () => {
  let manager: BrowserManager;
  let mockBrowser: any;
  let mockContext: any;
  let mockPage: any;

  beforeEach(() => {
    mockPage = {
      goto: vi.fn(),
      close: vi.fn(),
      screenshot: vi.fn(() => Promise.resolve(Buffer.from('test'))),
      setDefaultTimeout: vi.fn(),
      locator: vi.fn(() => ({
        click: vi.fn(),
        fill: vi.fn(),
        waitFor: vi.fn(),
        isVisible: vi.fn(),
        inputFiles: vi.fn(),
        getTextContent: vi.fn(),
        textContent: vi.fn(() => Promise.resolve('$10.00')),
        count: vi.fn(() => 0),
        first: vi.fn(),
        nth: vi.fn(() => ({ click: vi.fn() })),
        selectOption: vi.fn(),
        check: vi.fn(),
        uncheck: vi.fn(),
        isChecked: vi.fn(),
        inputValue: vi.fn(),
        allTextContents: vi.fn(() => Promise.resolve([])),
        setInputFiles: vi.fn()
      })),
      waitForLoadState: vi.fn(),
      waitForURL: vi.fn(),
      waitForSelector: vi.fn(),
      on: vi.fn()
    };

    mockContext = {
      newPage: vi.fn(() => Promise.resolve(mockPage)),
      close: vi.fn(),
      pages: vi.fn(() => Promise.resolve([mockPage])),
      addInitScript: vi.fn()
    };

    mockBrowser = {
      newContext: vi.fn(() => Promise.resolve(mockContext)),
      close: vi.fn(),
      contexts: vi.fn(() => [mockContext])
    };

    (chromium.launch as any).mockResolvedValue(mockBrowser);
    (chromium.launchPersistentContext as any).mockResolvedValue(mockContext);

    manager = new BrowserManager({
      headless: true,
      timeout: 30000
    });
  });

  afterEach(async () => {
    vi.clearAllMocks();
  });

  describe('launch', () => {
    it('should launch browser in headless mode', async () => {
      await manager.launch();

      expect(chromium.launch).toHaveBeenCalledWith(
        expect.objectContaining({
          headless: true
        })
      );
    });

    it('should launch browser in headed mode', async () => {
      const headedManager = new BrowserManager({ headless: false });
      await headedManager.launch();

      expect(chromium.launch).toHaveBeenCalledWith(
        expect.objectContaining({
          headless: false
        })
      );
    });

    it('should create new context', async () => {
      await manager.launch();

      expect(mockBrowser.newContext).toHaveBeenCalled();
    });

    it('should create new page', async () => {
      await manager.launch();

      expect(mockContext.newPage).toHaveBeenCalled();
    });

    it('should handle launch errors gracefully', async () => {
      (chromium.launch as any).mockRejectedValue(new Error('Launch failed'));

      await expect(manager.launch()).rejects.toThrow('Launch failed');
    });

    it('should set custom timeout', async () => {
      const customManager = new BrowserManager({ timeout: 60000 });
      await customManager.launch();

      expect(customManager['config'].timeout).toBe(60000);
    });

    it('should support persistent context', async () => {
      const persistentManager = new BrowserManager({
        headless: true,
        userDataDir: '/tmp/user-data'
      });

      await persistentManager.launch();

      expect(chromium.launchPersistentContext).toHaveBeenCalledWith(
        '/tmp/user-data',
        expect.any(Object)
      );
    });
  });

  describe('close', () => {
    it('should close browser', async () => {
      await manager.launch();
      await manager.close();

      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('should close context', async () => {
      await manager.launch();
      await manager.close();

      expect(mockContext.close).toHaveBeenCalled();
    });

    it('should handle close errors gracefully', async () => {
      mockBrowser.close.mockRejectedValue(new Error('Close failed'));

      await manager.launch();
      await expect(manager.close()).rejects.toThrow('Close failed');
    });

    it('should be idempotent', async () => {
      await manager.launch();
      await manager.close();
      await manager.close(); // Should not throw

      expect(mockBrowser.close).toHaveBeenCalledTimes(1);
    });
  });

  describe('screenshot', () => {
    it('should take screenshot', async () => {
      await manager.launch();

      const screenshot = await manager.screenshot('test-screenshot');

      expect(screenshot).toBeInstanceOf(Buffer);
      expect(mockPage.screenshot).toHaveBeenCalledWith(
        expect.objectContaining({
          path: 'test-screenshot.png'
        })
      );
    });

    it('should save screenshot to file', async () => {
      await manager.launch();

      await manager.screenshot('test-screenshot', '/tmp/screenshots');

      expect(mockPage.screenshot).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/tmp/screenshots/test-screenshot.png'
        })
      );
    });

    it('should throw error if page not available', async () => {
      await expect(manager.screenshot('test')).rejects.toThrow();
    });

    it('should handle screenshot errors gracefully', async () => {
      await manager.launch();
      mockPage.screenshot.mockRejectedValue(new Error('Screenshot failed'));

      await expect(manager.screenshot('test')).rejects.toThrow(
        'Screenshot failed'
      );
    });
  });

  describe('getPage', () => {
    it('should return current page', async () => {
      await manager.launch();

      const page = await manager.getPage();

      expect(page).toBeDefined();
      expect(page).toBe(mockPage);
    });

    it('should throw error if no page available', async () => {
      await expect(manager.getPage()).rejects.toThrow();
    });
  });

  describe('getContext', () => {
    it('should return current context', async () => {
      await manager.launch();

      const context = await manager.getContext();

      expect(context).toBeDefined();
      expect(context).toBe(mockContext);
    });

    it('should throw error if no context available', async () => {
      await expect(manager.getContext()).rejects.toThrow();
    });
  });

  describe('getBrowser', () => {
    it('should return current browser', async () => {
      await manager.launch();

      const browser = await manager.getBrowser();

      expect(browser).toBeDefined();
      expect(browser).toBe(mockBrowser);
    });

    it('should throw error if no browser available', async () => {
      await expect(manager.getBrowser()).rejects.toThrow();
    });
  });

  describe('isLaunched', () => {
    it('should return true when browser is launched', async () => {
      await manager.launch();

      expect(manager.isLaunched()).toBe(true);
    });

    it('should return false when browser is not launched', () => {
      expect(manager.isLaunched()).toBe(false);
    });

    it('should return false after browser is closed', async () => {
      await manager.launch();
      await manager.close();

      expect(manager.isLaunched()).toBe(false);
    });
  });

  describe('Error Recovery', () => {
    it('should take screenshot on error', async () => {
      await manager.launch();

      await manager.handleError(new Error('Test error'), 'test-error');

      expect(mockPage.screenshot).toHaveBeenCalled();
    });

    it('should log error details', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await manager.launch();
      await manager.handleError(new Error('Test error'), 'test-error');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Test error')
      );

      consoleSpy.mockRestore();
    });

    it('should handle multiple errors', async () => {
      await manager.launch();

      await manager.handleError(new Error('Error 1'), 'error-1');
      await manager.handleError(new Error('Error 2'), 'error-2');

      expect(mockPage.screenshot).toHaveBeenCalledTimes(2);
    });
  });
});
