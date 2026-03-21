/**
 * Tests for JLCPCB Page Object Model
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Page, BrowserContext } from 'playwright';
import {
  LoginPage,
  UploadPage,
  ConfigPage,
  CartPage
} from '../../src/jlcpcb/pages';

// Mock Playwright Page
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
    screenshot: vi.fn(),
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

describe('LoginPage', () => {
  let loginPage: LoginPage;
  let mockPage: Page;

  beforeEach(() => {
    mockPage = createMockPage();
    loginPage = new LoginPage(mockPage);
  });

  it('should navigate to login page', async () => {
    await loginPage.navigate();
    expect(mockPage.goto).toHaveBeenCalledWith(
      expect.stringContaining('login')
    );
  });

  it('should fill email and password', async () => {
    await loginPage.fillCredentials('test@example.com', 'password123');
    expect(mockPage.locator).toHaveBeenCalledWith(expect.anything());
  });

  it('should click login button', async () => {
    await loginPage.clickLogin();
    expect(mockPage.locator).toHaveBeenCalledWith(expect.anything());
  });

  it('should check if logged in', async () => {
    const locator = {
      isVisible: vi.fn(() => Promise.resolve(true)),
      click: vi.fn(),
      fill: vi.fn(),
      waitFor: vi.fn(),
      inputFiles: vi.fn(),
      getTextContent: vi.fn(),
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
    mockPage.locator = vi.fn(() => locator) as any;
    const isLoggedIn = await loginPage.isLoggedIn();
    expect(locator.isVisible).toHaveBeenCalled();
  });

  it('should login with credentials', async () => {
    const locator = {
      isVisible: vi.fn(() => Promise.resolve(false)),
      click: vi.fn(),
      fill: vi.fn(),
      waitFor: vi.fn(),
      inputFiles: vi.fn(),
      getTextContent: vi.fn(),
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
    mockPage.locator = vi.fn(() => locator) as any;

    await loginPage.login('test@example.com', 'password123');
    expect(mockPage.locator).toHaveBeenCalled();
  });
});

describe('UploadPage', () => {
  let uploadPage: UploadPage;
  let mockPage: Page;

  beforeEach(() => {
    mockPage = createMockPage();
    uploadPage = new UploadPage(mockPage);
  });

  it('should navigate to upload page', async () => {
    await uploadPage.navigate();
    expect(mockPage.goto).toHaveBeenCalled();
  });

  it('should upload Gerber file', async () => {
    await uploadPage.uploadGerber('/path/to/file.gbr');
    expect(mockPage.locator).toHaveBeenCalled();
  });

  it('should wait for upload completion', async () => {
    const locator = {
      isVisible: vi.fn(() => Promise.resolve(true)),
      click: vi.fn(),
      fill: vi.fn(),
      waitFor: vi.fn(),
      inputFiles: vi.fn(),
      getTextContent: vi.fn(),
      count: vi.fn(() => 1),
      first: vi.fn(),
      nth: vi.fn(() => ({ click: vi.fn() })),
      selectOption: vi.fn(),
      check: vi.fn(),
      uncheck: vi.fn(),
      isChecked: vi.fn(),
      inputValue: vi.fn(),
      allTextContents: vi.fn(() => Promise.resolve([]))
    };
    mockPage.locator = vi.fn(() => locator) as any;

    const isUploaded = await uploadPage.waitForUpload();
    expect(locator.isVisible).toHaveBeenCalled();
  });

  it('should click continue after upload', async () => {
    await uploadPage.clickContinue();
    expect(mockPage.locator).toHaveBeenCalled();
  });

  it('should get upload status', async () => {
    const locator = {
      isVisible: vi.fn(() => Promise.resolve(true)),
      click: vi.fn(),
      fill: vi.fn(),
      waitFor: vi.fn(),
      inputFiles: vi.fn(),
      getTextContent: vi.fn(() => Promise.resolve('Success')),
      count: vi.fn(() => 1),
      first: vi.fn(),
      nth: vi.fn(() => ({ click: vi.fn() })),
      selectOption: vi.fn(),
      check: vi.fn(),
      uncheck: vi.fn(),
      isChecked: vi.fn(),
      inputValue: vi.fn(),
      allTextContents: vi.fn(() => Promise.resolve(['Success']))
    };
    mockPage.locator = vi.fn(() => locator) as any;

    const status = await uploadPage.getUploadStatus();
    expect(status).toBe('success');
  });
});

describe('ConfigPage', () => {
  let configPage: ConfigPage;
  let mockPage: Page;

  beforeEach(() => {
    mockPage = createMockPage();
    configPage = new ConfigPage(mockPage);
  });

  it('should set PCB dimensions', async () => {
    await configPage.setDimensions(100, 50);
    expect(mockPage.locator).toHaveBeenCalled();
  });

  it('should set layer count', async () => {
    await configPage.setLayers(4);
    expect(mockPage.locator).toHaveBeenCalled();
  });

  it('should set quantity', async () => {
    await configPage.setQuantity(10);
    expect(mockPage.locator).toHaveBeenCalled();
  });

  it('should set thickness', async () => {
    await configPage.setThickness(1.6);
    expect(mockPage.locator).toHaveBeenCalled();
  });

  it('should set color', async () => {
    await configPage.setColor('red');
    expect(mockPage.locator).toHaveBeenCalled();
  });

  it('should set surface finish', async () => {
    await configPage.setSurfaceFinish('enig');
    expect(mockPage.locator).toHaveBeenCalled();
  });

  it('should calculate price', async () => {
    const locator = {
      isVisible: vi.fn(() => Promise.resolve(true)),
      click: vi.fn(),
      fill: vi.fn(),
      waitFor: vi.fn(),
      inputFiles: vi.fn(),
      getTextContent: vi.fn(() => Promise.resolve('$10.00')),
      count: vi.fn(() => 1),
      first: vi.fn(),
      nth: vi.fn(() => ({ click: vi.fn() })),
      selectOption: vi.fn(),
      check: vi.fn(),
      uncheck: vi.fn(),
      isChecked: vi.fn(),
      inputValue: vi.fn(),
      allTextContents: vi.fn(() => Promise.resolve(['$10.00']))
    };
    mockPage.locator = vi.fn(() => locator) as any;

    const price = await configPage.getPrice();
    expect(price).toBeGreaterThan(0);
  });

  it('should add to cart', async () => {
    await configPage.addToCart();
    expect(mockPage.locator).toHaveBeenCalled();
  });
});

describe('CartPage', () => {
  let cartPage: CartPage;
  let mockPage: Page;

  beforeEach(() => {
    mockPage = createMockPage();
    cartPage = new CartPage(mockPage);
  });

  it('should navigate to cart', async () => {
    await cartPage.navigate();
    expect(mockPage.goto).toHaveBeenCalled();
  });

  it('should get item count', async () => {
    const locator = {
      isVisible: vi.fn(() => Promise.resolve(true)),
      click: vi.fn(),
      fill: vi.fn(),
      waitFor: vi.fn(),
      inputFiles: vi.fn(),
      getTextContent: vi.fn(),
      count: vi.fn(() => 5),
      first: vi.fn(),
      nth: vi.fn(() => ({ click: vi.fn() })),
      selectOption: vi.fn(),
      check: vi.fn(),
      uncheck: vi.fn(),
      isChecked: vi.fn(),
      inputValue: vi.fn(),
      allTextContents: vi.fn(() => Promise.resolve([]))
    };
    mockPage.locator = vi.fn(() => locator) as any;

    const count = await cartPage.getItemCount();
    expect(count).toBe(5);
  });

  it('should get cart total', async () => {
    const locator = {
      isVisible: vi.fn(() => Promise.resolve(true)),
      click: vi.fn(),
      fill: vi.fn(),
      waitFor: vi.fn(),
      inputFiles: vi.fn(),
      getTextContent: vi.fn(() => Promise.resolve('$50.00')),
      count: vi.fn(() => 1),
      first: vi.fn(),
      nth: vi.fn(() => ({ click: vi.fn() })),
      selectOption: vi.fn(),
      check: vi.fn(),
      uncheck: vi.fn(),
      isChecked: vi.fn(),
      inputValue: vi.fn(),
      allTextContents: vi.fn(() => Promise.resolve(['$50.00']))
    };
    mockPage.locator = vi.fn(() => locator) as any;

    const total = await cartPage.getTotal();
    expect(total).toBeGreaterThan(0);
  });

  it('should proceed to checkout', async () => {
    await cartPage.proceedToCheckout();
    expect(mockPage.locator).toHaveBeenCalled();
  });

  it('should place order', async () => {
    await cartPage.placeOrder();
    expect(mockPage.locator).toHaveBeenCalled();
  });

  it('should get order confirmation', async () => {
    const locator = {
      isVisible: vi.fn(() => Promise.resolve(true)),
      click: vi.fn(),
      fill: vi.fn(),
      waitFor: vi.fn(),
      inputFiles: vi.fn(),
      getTextContent: vi.fn(() => Promise.resolve('Order #12345')),
      count: vi.fn(() => 1),
      first: vi.fn(),
      nth: vi.fn(() => ({ click: vi.fn() })),
      selectOption: vi.fn(),
      check: vi.fn(),
      uncheck: vi.fn(),
      isChecked: vi.fn(),
      inputValue: vi.fn(),
      allTextContents: vi.fn(() => Promise.resolve(['Order #12345']))
    };
    mockPage.locator = vi.fn(() => locator) as any;

    const orderId = await cartPage.getOrderConfirmation();
    expect(orderId).toBeTruthy();
  });
});
