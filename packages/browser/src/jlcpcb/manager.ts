/**
 * Browser Manager for JLCPCB automation
 */

import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { JLCPCBConfig } from './types';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Browser Manager configuration
 */
export interface BrowserManagerConfig {
  /** Headless mode (default: true) */
  headless?: boolean;

  /** Timeout for operations in ms (default: 30000) */
  timeout?: number;

  /** User data directory for persistent context */
  userDataDir?: string;

  /** Screenshot directory for error recovery */
  screenshotDir?: string;

  /** Browser viewport size */
  viewport?: { width: number; height: number };

  /** Slow down operations by specified ms */
  slowMo?: number;

  /** Download directory */
  downloadDir?: string;
}

/**
 * Manages browser lifecycle and operations
 */
export class BrowserManager {
  private config: Required<BrowserManagerConfig>;
  private browser?: Browser;
  private context?: BrowserContext;
  private page?: Page;

  constructor(config: BrowserManagerConfig = {}) {
    this.config = {
      headless: config.headless ?? true,
      timeout: config.timeout ?? 30000,
      userDataDir: config.userDataDir ?? '/tmp/playwright-user-data',
      screenshotDir: config.screenshotDir ?? '/tmp/screenshots',
      viewport: config.viewport ?? { width: 1920, height: 1080 },
      slowMo: config.slowMo ?? 0,
      downloadDir: config.downloadDir ?? '/tmp/downloads'
    };
  }

  /**
   * Launch browser and create context/page
   */
  async launch(): Promise<void> {
    try {
      // Create directories
      await this.ensureDirectories();

      // Launch browser
      if (this.config.userDataDir) {
        // Use persistent context for maintaining session
        this.context = await chromium.launchPersistentContext(
          this.config.userDataDir,
          {
            headless: this.config.headless,
            viewport: this.config.viewport,
            slowMo: this.config.slowMo,
            acceptDownloads: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
          }
        );
      } else {
        // Use non-persistent context
        this.browser = await chromium.launch({
          headless: this.config.headless,
          slowMo: this.config.slowMo
        });

        this.context = await this.browser.newContext({
          viewport: this.config.viewport,
          acceptDownloads: true
        });
      }

      // Create new page
      this.page = await this.context.newPage();

      // Set default timeout
      this.page.setDefaultTimeout(this.config.timeout);

      // Setup error handlers
      this.setupErrorHandlers();
    } catch (error) {
      await this.handleError(error as Error, 'launch');
      throw error;
    }
  }

  /**
   * Close browser and cleanup resources
   */
  async close(): Promise<void> {
    try {
      if (this.page) {
        await this.page.close();
        this.page = undefined;
      }

      if (this.context && !this.config.userDataDir) {
        await this.context.close();
        this.context = undefined;
      }

      if (this.browser) {
        await this.browser.close();
        this.browser = undefined;
      }
    } catch (error) {
      console.error('Error closing browser:', error);
    }
  }

  /**
   * Take screenshot of current page
   */
  async screenshot(
    name: string,
    directory?: string
  ): Promise<Buffer> {
    if (!this.page) {
      throw new Error('Browser not launched. Call launch() first.');
    }

    const screenshotDir = directory ?? this.config.screenshotDir;
    const filename = path.join(screenshotDir, `${name}.png`);

    try {
      const buffer = await this.page.screenshot({
        path: filename,
        fullPage: true
      });

      return buffer;
    } catch (error) {
      console.error('Failed to take screenshot:', error);
      throw error;
    }
  }

  /**
   * Get current page
   */
  async getPage(): Promise<Page> {
    if (!this.page) {
      throw new Error('Browser not launched. Call launch() first.');
    }
    return this.page;
  }

  /**
   * Get current context
   */
  async getContext(): Promise<BrowserContext> {
    if (!this.context) {
      throw new Error('Browser not launched. Call launch() first.');
    }
    return this.context;
  }

  /**
   * Get current browser
   */
  async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      throw new Error('Browser not launched. Call launch() first.');
    }
    return this.browser;
  }

  /**
   * Check if browser is launched
   */
  isLaunched(): boolean {
    return !!this.page;
  }

  /**
   * Navigate to URL
   */
  async navigate(url: string): Promise<void> {
    const page = await this.getPage();
    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: this.config.timeout
    });
  }

  /**
   * Wait for page to load
   */
  async waitForLoad(): Promise<void> {
    const page = await this.getPage();
    await page.waitForLoadState('networkidle');
  }

  /**
   * Execute JavaScript in page
   */
  async evaluate<T>(script: string): Promise<T> {
    const page = await this.getPage();
    return await page.evaluate(script) as T;
  }

  /**
   * Handle errors with screenshot and logging
   */
  async handleError(error: Error, context: string): Promise<void> {
    console.error(`Error in ${context}:`, error.message);

    // Take screenshot for debugging
    if (this.page) {
      try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const screenshotName = `error-${context}-${timestamp}`;
        await this.screenshot(screenshotName);
        console.log(`Screenshot saved: ${screenshotName}.png`);
      } catch (screenshotError) {
        console.error('Failed to take error screenshot:', screenshotError);
      }
    }
  }

  /**
   * Setup error handlers for page
   */
  private setupErrorHandlers(): void {
    if (!this.page) return;

    this.page.on('pageerror', (error) => {
      console.error('Page error:', error);
    });

    this.page.on('requestfailed', (request) => {
      console.error('Request failed:', request.url());
    });

    this.page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error('Console error:', msg.text());
      }
    });
  }

  /**
   * Ensure required directories exist
   */
  private async ensureDirectories(): Promise<void> {
    const directories = [
      this.config.screenshotDir,
      this.config.downloadDir
    ];

    for (const dir of directories) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        console.error(`Failed to create directory ${dir}:`, error);
      }
    }
  }

  /**
   * Get browser configuration
   */
  getConfig(): Required<BrowserManagerConfig> {
    return this.config;
  }
}
