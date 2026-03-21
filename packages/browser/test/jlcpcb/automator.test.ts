/**
 * Tests for JLCPCB Automator
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Page } from 'playwright';
import { JLCPcbAutomator } from '../../src/jlcpcb/automator';
import { BrowserManager } from '../../src/jlcpcb/manager';
import { PCBConfig, GerberFile, OrderStatus } from '../../src/jlcpcb/types';
import {
  LoginPage,
  UploadPage,
  ConfigPage,
  CartPage
} from '../../src/jlcpcb/pages';
import * as fs from 'fs/promises';

// Mock fs module
vi.mock('fs/promises', () => ({
  access: vi.fn(() => Promise.resolve())
}));

// Mock BrowserManager
const createMockPage = () => {
  const page = {
    goto: vi.fn(),
    waitForSelector: vi.fn(),
    waitForURL: vi.fn(),
    click: vi.fn(),
    fill: vi.fn(),
    inputFiles: vi.fn(),
    waitForLoadState: vi.fn(),
    url: vi.fn(() => 'https://jlcpcb.com'),
    screenshot: vi.fn(() => Promise.resolve(Buffer.from('test'))),
    setDefaultTimeout: vi.fn(),
    locator: vi.fn(() => {
      const mockLocator = {
        click: vi.fn(),
        fill: vi.fn(),
        inputFiles: vi.fn(),
        setInputFiles: vi.fn(),
        waitFor: vi.fn(),
        isVisible: vi.fn(() => Promise.resolve(false)),
        getTextContent: vi.fn(() => Promise.resolve('test')),
        textContent: vi.fn(() => Promise.resolve('$10.00')),
        count: vi.fn(() => 0),
        first: vi.fn(),
        nth: vi.fn(() => ({ click: vi.fn() })),
        selectOption: vi.fn(),
        check: vi.fn(),
        uncheck: vi.fn(),
        isChecked: vi.fn(),
        inputValue: vi.fn(),
        allTextContents: vi.fn(() => Promise.resolve([]))
      };
      return mockLocator;
    }),
    waitForTimeout: vi.fn(),
    close: vi.fn(),
    on: vi.fn()
  } as unknown as Page;

  return page;
};

const createMockManager = () => {
  const mockPage = createMockPage();

  const manager = {
    launch: vi.fn(),
    close: vi.fn(),
    navigate: vi.fn(),
    screenshot: vi.fn(() => Promise.resolve(Buffer.from('test'))),
    getPage: vi.fn(() => Promise.resolve(mockPage)),
    getContext: vi.fn(),
    getBrowser: vi.fn(),
    isLaunched: vi.fn(() => true),
    handleError: vi.fn(),
    waitForLoad: vi.fn(),
    evaluate: vi.fn()
  };

  return manager;
};

describe('JLCPcbAutomator', () => {
  let automator: JLCPcbAutomator;
  let mockManager: any;

  beforeEach(() => {
    mockManager = createMockManager();
    automator = new JLCPcbAutomator({
      headless: true,
      timeout: 30000,
      credentials: {
        email: 'test@example.com',
        password: 'password123'
      }
    });

    // Replace private manager with mock
    (automator as any).manager = mockManager;

    // Mock fs.access to succeed by default
    vi.mocked(fs.access).mockResolvedValue(undefined as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialize', () => {
    it('should launch browser', async () => {
      await automator.initialize();

      expect(mockManager.launch).toHaveBeenCalled();
    });

    it('should set initialized status', async () => {
      await automator.initialize();

      expect(automator.isInitialized()).toBe(true);
    });

    it('should throw error if already initialized', async () => {
      await automator.initialize();

      await expect(automator.initialize()).rejects.toThrow();
    });
  });

  describe('login', () => {
    it('should login with credentials', async () => {
      await automator.initialize();
      await automator.login();

      // Verify login page was used
      expect(mockManager.getPage).toHaveBeenCalled();
    });

    it('should check if already logged in', async () => {
      await automator.initialize();
      await automator.login();

      // Should skip login if already logged in
      expect(mockManager.getPage).toHaveBeenCalled();
    });

    it('should handle login errors gracefully', async () => {
      mockManager.getPage.mockRejectedValue(new Error('Login failed'));

      await automator.initialize();
      await expect(automator.login()).rejects.toThrow();
    });
  });

  describe('uploadGerber', () => {
    it('should upload single Gerber file', async () => {
      await automator.initialize();

      const gerber: GerberFile = {
        path: '/tmp/test-board.gbr',
        filename: 'board.gbr'
      };

      await automator.uploadGerber(gerber);

      expect(mockManager.getPage).toHaveBeenCalled();
    });

    it('should upload multiple Gerber files', async () => {
      await automator.initialize();

      const gerbers: GerberFile[] = [
        { path: '/tmp/test-board.gbr', filename: 'board.gbr' },
        { path: '/tmp/test-drill.txt', filename: 'drill.txt' }
      ];

      await automator.uploadGerber(gerbers);

      expect(mockManager.getPage).toHaveBeenCalled();
    });

    it('should wait for upload completion', async () => {
      await automator.initialize();

      const gerber: GerberFile = {
        path: '/tmp/test-board.gbr',
        filename: 'board.gbr'
      };

      await automator.uploadGerber(gerber);

      expect(mockManager.waitForLoad).toHaveBeenCalled();
    });

    it('should throw error if file not found', async () => {
      // Mock fs.access to reject
      vi.mocked(fs.access).mockRejectedValue(new Error('File not found'));

      await automator.initialize();

      const gerber: GerberFile = {
        path: '/nonexistent/file.gbr',
        filename: 'file.gbr'
      };

      await expect(automator.uploadGerber(gerber)).rejects.toThrow();

      // Reset mock
      vi.mocked(fs.access).mockResolvedValue(undefined as any);
    });
  });

  describe('configurePCB', () => {
    it('should configure PCB with basic parameters', async () => {
      await automator.initialize();

      const config: PCBConfig = {
        layers: 2,
        width: 100,
        height: 50,
        quantity: 10
      };

      await automator.configurePCB(config);

      expect(mockManager.getPage).toHaveBeenCalled();
    });

    it('should configure PCB with all parameters', async () => {
      await automator.initialize();

      const config: PCBConfig = {
        layers: 4,
        width: 100,
        height: 100,
        quantity: 5,
        thickness: 1.6,
        color: 'red',
        finish: 'enig',
        surfaceFinish: 'enig'
      };

      await automator.configurePCB(config);

      expect(mockManager.getPage).toHaveBeenCalled();
    });

    it('should validate PCB dimensions', async () => {
      await automator.initialize();

      const invalidConfig: PCBConfig = {
        layers: 2,
        width: 10,
        height: 1000, // Invalid height
        quantity: 5
      };

      await expect(automator.configurePCB(invalidConfig)).rejects.toThrow();
    });

    it('should validate layer count', async () => {
      await automator.initialize();

      const invalidConfig: PCBConfig = {
        layers: 8, // Invalid layer count
        width: 100,
        height: 100,
        quantity: 5
      } as any;

      await expect(automator.configurePCB(invalidConfig)).rejects.toThrow();
    });
  });

  describe('selectComponent', () => {
    it('should select component by LCSC part number', async () => {
      await automator.initialize();

      await automator.selectComponent('C1234', 'R1', 10);

      expect(mockManager.getPage).toHaveBeenCalled();
    });

    it('should select multiple components', async () => {
      await automator.initialize();

      await automator.selectComponent('C1234', 'R1', 10);
      await automator.selectComponent('C5678', 'C1', 5);

      expect(mockManager.getPage).toHaveBeenCalled();
    });

    it('should validate component reference', async () => {
      await automator.initialize();

      await expect(automator.selectComponent('C1234', '', 10)).rejects.toThrow();
    });
  });

  describe('addToCart', () => {
    it('should add configured PCB to cart', async () => {
      await automator.initialize();
      await automator.addToCart();

      expect(mockManager.getPage).toHaveBeenCalled();
    });

    it('should wait for cart confirmation', async () => {
      await automator.initialize();
      await automator.addToCart();

      expect(mockManager.waitForLoad).toHaveBeenCalled();
    });
  });

  describe('placeOrder', () => {
    it('should place order and return confirmation', async () => {
      await automator.initialize();

      const orderId = await automator.placeOrder();

      expect(orderId).toBeTruthy();
      expect(mockManager.getPage).toHaveBeenCalled();
    });

    it('should handle order errors gracefully', async () => {
      mockManager.getPage.mockRejectedValue(new Error('Order failed'));

      await automator.initialize();

      await expect(automator.placeOrder()).rejects.toThrow();
    });
  });

  describe('getOrderStatus', () => {
    it('should return current order status', async () => {
      await automator.initialize();

      const status = await automator.getOrderStatus();

      expect(status).toBeDefined();
    });

    it('should return uploaded status after file upload', async () => {
      await automator.initialize();

      const gerber: GerberFile = {
        path: '/tmp/test-board.gbr',
        filename: 'board.gbr'
      };

      await automator.uploadGerber(gerber);
      const status = await automator.getOrderStatus();

      expect(status).toBe(OrderStatus.UPLOADED);
    });
  });

  describe('shutdown', () => {
    it('should close browser manager', async () => {
      await automator.initialize();
      await automator.shutdown();

      expect(mockManager.close).toHaveBeenCalled();
    });

    it('should reset initialized status', async () => {
      await automator.initialize();
      await automator.shutdown();

      expect(automator.isInitialized()).toBe(false);
    });

    it('should be idempotent', async () => {
      await automator.initialize();
      await automator.shutdown();
      await automator.shutdown(); // Should not throw

      expect(mockManager.close).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Recovery', () => {
    it('should take screenshot on error', async () => {
      mockManager.getPage.mockRejectedValue(new Error('Test error'));

      await automator.initialize();

      try {
        await automator.login();
      } catch (error) {
        // Expected to throw
      }

      expect(mockManager.screenshot).toHaveBeenCalled();
    });

    it('should log errors properly', async () => {
      mockManager.getPage.mockRejectedValue(new Error('Test error'));

      await automator.initialize();

      try {
        await automator.login();
      } catch (error) {
        // Expected to throw
      }

      expect(mockManager.handleError).toHaveBeenCalled();
    });
  });

  describe('Integration Tests', () => {
    it('should complete full order flow', async () => {
      await automator.initialize();

      // Login
      await automator.login();

      // Upload Gerber
      const gerber: GerberFile = {
        path: '/tmp/test-board.gbr',
        filename: 'board.gbr'
      };
      await automator.uploadGerber(gerber);

      // Configure PCB
      const config: PCBConfig = {
        layers: 2,
        width: 100,
        height: 50,
        quantity: 10
      };
      await automator.configurePCB(config);

      // Add to cart
      await automator.addToCart();

      // Place order
      const orderId = await automator.placeOrder();

      expect(orderId).toBeTruthy();
    });
  });
});
