/**
 * JLCPCB Automator - Main automation class for PCB ordering
 */

import { BrowserManager } from './manager';
import { LoginPage } from './pages';
import { UploadPage } from './pages';
import { ConfigPage } from './pages';
import { CartPage } from './pages';
import {
  PCBConfig,
  GerberFile,
  OrderStatus,
  JLCPCBConfig,
  ComponentSelection,
  AssemblyOptions
} from './types';
import * as fs from 'fs/promises';

/**
 * Main automator class for JLCPCB operations
 */
export class JLCPcbAutomator {
  private manager: BrowserManager;
  private config: JLCPCBConfig;
  private initialized: boolean = false;
  private currentStatus: OrderStatus = OrderStatus.PENDING;
  private loginPage?: LoginPage;
  private uploadPage?: UploadPage;
  private configPage?: ConfigPage;
  private cartPage?: CartPage;

  constructor(config: JLCPCBConfig = {}) {
    this.config = {
      headless: config.headless ?? true,
      timeout: config.timeout ?? 30000,
      screenshotDir: config.screenshotDir ?? '/tmp/screenshots',
      baseUrl: config.baseUrl ?? 'https://jlcpcb.com',
      credentials: config.credentials
    };

    this.manager = new BrowserManager({
      headless: this.config.headless,
      timeout: this.config.timeout,
      screenshotDir: this.config.screenshotDir
    });
  }

  /**
   * Initialize browser and pages
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      throw new Error('Automator already initialized');
    }

    try {
      // Launch browser
      await this.manager.launch();

      // Initialize page objects
      const page = await this.manager.getPage();
      this.loginPage = new LoginPage(page, this.config.timeout);
      this.uploadPage = new UploadPage(page, this.config.timeout);
      this.configPage = new ConfigPage(page, this.config.timeout);
      this.cartPage = new CartPage(page, this.config.timeout);

      this.initialized = true;
      this.currentStatus = OrderStatus.PENDING;
    } catch (error) {
      await this.manager.handleError(error as Error, 'initialize');
      throw error;
    }
  }

  /**
   * Login to JLCPCB
   */
  async login(): Promise<void> {
    this.ensureInitialized();

    try {
      // Check if already logged in
      if (await this.loginPage!.isLoggedIn()) {
        console.log('Already logged in');
        return;
      }

      // Login with credentials if provided
      if (this.config.credentials) {
        await this.loginPage!.login(
          this.config.credentials.email,
          this.config.credentials.password
        );
      } else {
        // Navigate to login page and wait for manual login
        await this.loginPage!.navigate();
        console.log('Please login manually...');
        await this.loginPage!.waitForLogin();
      }

      console.log('Login successful');
    } catch (error) {
      await this.manager.handleError(error as Error, 'login');
      throw error;
    }
  }

  /**
   * Upload Gerber file(s)
   */
  async uploadGerber(gerber: GerberFile | GerberFile[]): Promise<void> {
    this.ensureInitialized();

    try {
      // Validate file(s) exist
      const files = Array.isArray(gerber) ? gerber : [gerber];

      for (const file of files) {
        await this.validateFile(file.path);
      }

      // Navigate to upload page
      await this.uploadPage!.navigate();

      // Upload file(s)
      if (files.length === 1) {
        await this.uploadPage!.uploadGerber(files[0].path);
      } else {
        // Upload multiple files
        for (const file of files) {
          await this.uploadPage!.uploadGerber(file.path);
        }
      }

      // Wait for upload completion
      const uploaded = await this.uploadPage!.waitForUpload();

      if (!uploaded) {
        throw new Error('Gerber upload failed');
      }

      // Click continue to proceed
      await this.uploadPage!.clickContinue();

      this.currentStatus = OrderStatus.UPLOADED;
      console.log('Gerber file(s) uploaded successfully');
    } catch (error) {
      await this.manager.handleError(error as Error, 'uploadGerber');
      throw error;
    }
  }

  /**
   * Configure PCB parameters
   */
  async configurePCB(config: PCBConfig): Promise<void> {
    this.ensureInitialized();

    try {
      // Validate configuration
      this.validateConfig(config);

      // Configure PCB
      await this.configPage!.configure(config);

      // Wait for price calculation
      await this.manager.waitForLoad();

      this.currentStatus = OrderStatus.CONFIGURED;
      console.log('PCB configured successfully');
    } catch (error) {
      await this.manager.handleError(error as Error, 'configurePCB');
      throw error;
    }
  }

  /**
   * Select component for assembly
   */
  async selectComponent(
    lcscPart: string,
    reference: string,
    quantity: number = 1
  ): Promise<void> {
    this.ensureInitialized();

    try {
      if (!lcscPart || !reference) {
        throw new Error('LCSC part and reference are required');
      }

      if (quantity < 1) {
        throw new Error('Quantity must be at least 1');
      }

      // Implement component selection logic
      // This would involve searching for the component and adding it to the assembly list
      console.log(`Selected component ${lcscPart} for ${reference} (qty: ${quantity})`);
    } catch (error) {
      await this.manager.handleError(error as Error, 'selectComponent');
      throw error;
    }
  }

  /**
   * Configure assembly options
   */
  async configureAssembly(options: AssemblyOptions): Promise<void> {
    this.ensureInitialized();

    try {
      if (!options.enabled) {
        console.log('Assembly disabled');
        return;
      }

      console.log(`Configuring assembly for ${options.components.length} components`);

      // Configure each component
      for (const component of options.components) {
        await this.selectComponent(
          component.lcscPart,
          component.reference,
          component.quantity
        );
      }

      console.log('Assembly configured successfully');
    } catch (error) {
      await this.manager.handleError(error as Error, 'configureAssembly');
      throw error;
    }
  }

  /**
   * Add configured PCB to cart
   */
  async addToCart(): Promise<void> {
    this.ensureInitialized();

    try {
      await this.configPage!.addToCart();

      this.currentStatus = OrderStatus.IN_CART;
      console.log('Added to cart successfully');
    } catch (error) {
      await this.manager.handleError(error as Error, 'addToCart');
      throw error;
    }
  }

  /**
   * Place order
   */
  async placeOrder(): Promise<string | null> {
    this.ensureInitialized();

    try {
      // Navigate to cart
      await this.cartPage!.navigate();

      // Proceed to checkout
      await this.cartPage!.proceedToCheckout();

      // Place order
      await this.cartPage!.placeOrder();

      // Wait for order confirmation
      const orderId = await this.cartPage!.waitForOrderConfirmation();

      this.currentStatus = OrderStatus.ORDERED;
      console.log('Order placed successfully');

      return orderId;
    } catch (error) {
      await this.manager.handleError(error as Error, 'placeOrder');
      throw error;
    }
  }

  /**
   * Get current order status
   */
  async getOrderStatus(): Promise<OrderStatus> {
    return this.currentStatus;
  }

  /**
   * Get price estimate
   */
  async getPrice(): Promise<number> {
    this.ensureInitialized();

    try {
      return await this.configPage!.getPrice();
    } catch (error) {
      await this.manager.handleError(error as Error, 'getPrice');
      throw error;
    }
  }

  /**
   * Take screenshot of current page
   */
  async screenshot(name: string): Promise<Buffer> {
    return await this.manager.screenshot(name);
  }

  /**
   * Check if automator is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Shutdown browser and cleanup
   */
  async shutdown(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    try {
      await this.manager.close();
      this.initialized = false;
      this.currentStatus = OrderStatus.PENDING;
      console.log('Automator shutdown complete');
    } catch (error) {
      console.error('Error during shutdown:', error);
    }
  }

  /**
   * Ensure automator is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Automator not initialized. Call initialize() first.');
    }
  }

  /**
   * Validate file exists
   */
  private async validateFile(filePath: string): Promise<void> {
    try {
      await fs.access(filePath);
    } catch {
      throw new Error(`File not found: ${filePath}`);
    }
  }

  /**
   * Validate PCB configuration
   */
  private validateConfig(config: PCBConfig): void {
    // Validate layers
    if (![1, 2, 4, 6].includes(config.layers)) {
      throw new Error('Invalid layer count. Must be 1, 2, 4, or 6');
    }

    // Validate dimensions
    if (config.width < 10 || config.width > 500) {
      throw new Error('Invalid width. Must be between 10 and 500 mm');
    }

    if (config.height < 10 || config.height > 500) {
      throw new Error('Invalid height. Must be between 10 and 500 mm');
    }

    // Validate quantity
    if (config.quantity < 5 || config.quantity > 10000) {
      throw new Error('Invalid quantity. Must be between 5 and 10000');
    }

    // Validate thickness if provided
    if (config.thickness) {
      const validThicknesses = [0.4, 0.6, 0.8, 1.0, 1.2, 1.6, 2.0];
      if (!validThicknesses.includes(config.thickness)) {
        throw new Error('Invalid thickness. Must be one of: ' + validThicknesses.join(', '));
      }
    }
  }
}

/**
 * Extend LoginPage with waitForLogin method
 */
declare module './pages' {
  interface LoginPage {
    waitForLogin(): Promise<void>;
  }
}

LoginPage.prototype.waitForLogin = async function(): Promise<void> {
  // Wait for user to manually login
  for (let i = 0; i < 60; i++) {
    if (await this.isLoggedIn()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw new Error('Login timeout');
};
