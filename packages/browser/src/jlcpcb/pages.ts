/**
 * Page Object Model for JLCPCB website
 */

import { Page } from 'playwright';
import { PCBConfig } from './types';

/**
 * Base page class with common functionality
 */
export abstract class BasePage {
  protected page: Page;
  protected timeout: number;

  constructor(page: Page, timeout: number = 30000) {
    this.page = page;
    this.timeout = timeout;
  }

  /**
   * Take a screenshot for debugging
   */
  async screenshot(name: string): Promise<Buffer> {
    return await this.page.screenshot({ path: `${name}.png` });
  }

  /**
   * Wait for element with timeout
   */
  protected async wait(selector: string, timeout?: number): Promise<void> {
    await this.page.waitForSelector(selector, {
      timeout: timeout || this.timeout
    });
  }

  /**
   * Click element with wait
   */
  protected async click(selector: string): Promise<void> {
    await this.wait(selector);
    await this.page.click(selector);
  }

  /**
   * Fill input with wait
   */
  protected async fill(selector: string, value: string): Promise<void> {
    await this.wait(selector);
    await this.page.fill(selector, value);
  }
}

/**
 * Login page for JLCPCB authentication
 */
export class LoginPage extends BasePage {
  private readonly selectors = {
    emailInput: 'input[type="email"], input[name="email"], #email',
    passwordInput: 'input[type="password"], input[name="password"], #password',
    loginButton: 'button[type="submit"], .login-btn, #loginBtn',
    userMenu: '.user-menu, .avatar, [data-testid="user-menu"]',
    loginPage: '/login, /sign-in'
  };

  constructor(page: Page, timeout: number = 30000) {
    super(page, timeout);
  }

  /**
   * Navigate to login page
   */
  async navigate(): Promise<void> {
    await this.page.goto('https://jlcpcb.com/login');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Fill email and password fields
   */
  async fillCredentials(email: string, password: string): Promise<void> {
    await this.fill(this.selectors.emailInput, email);
    await this.fill(this.selectors.passwordInput, password);
  }

  /**
   * Click login button
   */
  async clickLogin(): Promise<void> {
    await this.click(this.selectors.loginButton);
  }

  /**
   * Check if user is logged in
   */
  async isLoggedIn(): Promise<boolean> {
    try {
      const userMenu = this.page.locator(this.selectors.userMenu);
      return await userMenu.isVisible({ timeout: 5000 });
    } catch {
      return false;
    }
  }

  /**
   * Complete login flow
   */
  async login(email: string, password: string): Promise<void> {
    await this.navigate();
    await this.fillCredentials(email, password);
    await this.clickLogin();
    await this.page.waitForURL(/^(?!.*login).*$/, { timeout: this.timeout });
  }
}

/**
 * Upload page for Gerber files
 */
export class UploadPage extends BasePage {
  private readonly selectors = {
    uploadArea: '.upload-area, input[type="file"], #gerberUpload',
    uploadButton: '.upload-btn, button:has-text("Upload")',
    continueButton: '.continue-btn, button:has-text("Continue")',
    successMessage: '.success-message, .upload-success',
    errorMessage: '.error-message, .upload-error',
    progressBar: '.progress-bar, [role="progressbar"]'
  };

  constructor(page: Page, timeout: number = 30000) {
    super(page, timeout);
  }

  /**
   * Navigate to upload page
   */
  async navigate(): Promise<void> {
    await this.page.goto('https://jlcpcb.com/pcb-prototype/pcb-capabilities');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Upload Gerber file
   */
  async uploadGerber(filePath: string): Promise<void> {
    const uploadInput = this.page.locator(this.selectors.uploadArea);
    await uploadInput.setInputFiles(filePath);
  }

  /**
   * Wait for upload to complete
   */
  async waitForUpload(): Promise<boolean> {
    try {
      await this.page.waitForSelector(this.selectors.successMessage, {
        timeout: this.timeout
      });
      return true;
    } catch {
      // Check for error message
      const errorVisible = await this.page
        .locator(this.selectors.errorMessage)
        .isVisible({ timeout: 1000 })
        .catch(() => false);

      if (errorVisible) {
        throw new Error('Gerber upload failed');
      }
      return false;
    }
  }

  /**
   * Click continue after upload
   */
  async clickContinue(): Promise<void> {
    await this.click(this.selectors.continueButton);
  }

  /**
   * Get upload status
   */
  async getUploadStatus(): Promise<'success' | 'error' | 'uploading'> {
    const successLocator = this.page.locator(this.selectors.successMessage);
    const errorLocator = this.page.locator(this.selectors.errorMessage);
    const progressLocator = this.page.locator(this.selectors.progressBar);

    if (await successLocator.isVisible({ timeout: 1000 }).catch(() => false)) {
      return 'success';
    }

    if (await errorLocator.isVisible({ timeout: 1000 }).catch(() => false)) {
      return 'error';
    }

    if (await progressLocator.isVisible({ timeout: 1000 }).catch(() => false)) {
      return 'uploading';
    }

    return 'error';
  }
}

/**
 * Configuration page for PCB parameters
 */
export class ConfigPage extends BasePage {
  private readonly selectors = {
    widthInput: 'input[name="width"], #pcbWidth',
    heightInput: 'input[name="height"], #pcbHeight',
    layersSelect: 'select[name="layers"], #pcbLayers',
    quantityInput: 'input[name="quantity"], #pcbQuantity',
    thicknessSelect: 'select[name="thickness"], #pcbThickness',
    colorSelect: 'select[name="color"], #pcbColor',
    surfaceFinishSelect: 'select[name="surfaceFinish"], #surfaceFinish',
    addToCartButton: '.add-to-cart, button:has-text("Add to Cart")',
    priceDisplay: '.price, .total-price, [data-testid="price"]'
  };

  constructor(page: Page, timeout: number = 30000) {
    super(page, timeout);
  }

  /**
   * Set PCB dimensions
   */
  async setDimensions(width: number, height: number): Promise<void> {
    await this.fill(this.selectors.widthInput, width.toString());
    await this.fill(this.selectors.heightInput, height.toString());
  }

  /**
   * Set layer count
   */
  async setLayers(layers: number): Promise<void> {
    const layersSelect = this.page.locator(this.selectors.layersSelect);
    await layersSelect.selectOption(layers.toString());
  }

  /**
   * Set quantity
   */
  async setQuantity(quantity: number): Promise<void> {
    await this.fill(this.selectors.quantityInput, quantity.toString());
  }

  /**
   * Set thickness
   */
  async setThickness(thickness: number): Promise<void> {
    const thicknessSelect = this.page.locator(this.selectors.thicknessSelect);
    await thicknessSelect.selectOption(thickness.toString());
  }

  /**
   * Set PCB color
   */
  async setColor(color: string): Promise<void> {
    const colorSelect = this.page.locator(this.selectors.colorSelect);
    await colorSelect.selectOption(color);
  }

  /**
   * Set surface finish
   */
  async setSurfaceFinish(finish: string): Promise<void> {
    const finishSelect = this.page.locator(this.selectors.surfaceFinishSelect);
    await finishSelect.selectOption(finish);
  }

  /**
   * Configure PCB from config object
   */
  async configure(config: PCBConfig): Promise<void> {
    await this.setDimensions(config.width, config.height);
    await this.setLayers(config.layers);
    await this.setQuantity(config.quantity);

    if (config.thickness) {
      await this.setThickness(config.thickness);
    }

    if (config.color) {
      await this.setColor(config.color);
    }

    if (config.surfaceFinish) {
      await this.setSurfaceFinish(config.surfaceFinish);
    }
  }

  /**
   * Get current price
   */
  async getPrice(): Promise<number> {
    const priceText = await this.page
      .locator(this.selectors.priceDisplay)
      .textContent({ timeout: 5000 });

    if (!priceText) {
      throw new Error('Price not found');
    }

    // Extract numeric value from price string (e.g., "$10.00" -> 10.00)
    const match = priceText.match(/[\d.]+/);
    return match ? parseFloat(match[0]) : 0;
  }

  /**
   * Add configured PCB to cart
   */
  async addToCart(): Promise<void> {
    await this.click(this.selectors.addToCartButton);
    await this.page.waitForLoadState('networkidle');
  }
}

/**
 * Cart page for order management
 */
export class CartPage extends BasePage {
  private readonly selectors = {
    cartItems: '.cart-item, [data-testid="cart-item"]',
    itemCount: '.item-count, [data-testid="item-count"]',
    cartTotal: '.cart-total, .total-price, [data-testid="cart-total"]',
    checkoutButton: '.checkout-btn, button:has-text("Checkout")',
    placeOrderButton: '.place-order-btn, button:has-text("Place Order")',
    orderConfirmation: '.order-confirmation, [data-testid="order-confirmation"]',
    orderId: '.order-id, [data-testid="order-id"]'
  };

  constructor(page: Page, timeout: number = 30000) {
    super(page, timeout);
  }

  /**
   * Navigate to cart
   */
  async navigate(): Promise<void> {
    await this.page.goto('https://jlcpcb.com/cart');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Get number of items in cart
   */
  async getItemCount(): Promise<number> {
    const items = this.page.locator(this.selectors.cartItems);
    return await items.count();
  }

  /**
   * Get cart total
   */
  async getTotal(): Promise<number> {
    const totalText = await this.page
      .locator(this.selectors.cartTotal)
      .textContent({ timeout: 5000 });

    if (!totalText) {
      throw new Error('Cart total not found');
    }

    const match = totalText.match(/[\d.]+/);
    return match ? parseFloat(match[0]) : 0;
  }

  /**
   * Proceed to checkout
   */
  async proceedToCheckout(): Promise<void> {
    await this.click(this.selectors.checkoutButton);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Place order
   */
  async placeOrder(): Promise<void> {
    await this.click(this.selectors.placeOrderButton);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Get order confirmation ID
   */
  async getOrderConfirmation(): Promise<string | null> {
    try {
      const orderIdText = await this.page
        .locator(this.selectors.orderId)
        .textContent({ timeout: 10000 });

      return orderIdText || null;
    } catch {
      return null;
    }
  }

  /**
   * Wait for order confirmation
   */
  async waitForOrderConfirmation(): Promise<string | null> {
    await this.page.waitForSelector(this.selectors.orderConfirmation, {
      timeout: this.timeout
    });
    return await this.getOrderConfirmation();
  }
}
