import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import blessed from 'blessed';
import { ScreenManager } from '../src/screen.js';
import { MainLayout } from '../src/layout.js';
import { CatppuccinMocha } from '../src/theme.js';

describe('MainLayout', () => {
  let screenManager: ScreenManager;
  let layout: MainLayout;

  beforeEach(() => {
    vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
    screenManager = new ScreenManager();
  });

  afterEach(() => {
    if (layout) {
      // Layout is managed by blessed, no explicit destroy needed
    }
    if (screenManager) {
      try {
        screenManager.destroy();
      } catch (e) {
        // Ignore errors during cleanup
      }
    }
  });

  it('should create a main layout instance', () => {
    layout = new MainLayout(screenManager.screen, CatppuccinMocha);
    expect(layout).toBeDefined();
    expect(layout.screen).toBeDefined();
    expect(layout.main).toBeDefined();
    expect(layout.header).toBeDefined();
    expect(layout.input).toBeDefined();
  });

  it('should have a main box', () => {
    layout = new MainLayout(screenManager.screen, CatppuccinMocha);
    expect(layout.main).toBeDefined();
    expect(layout.main.type).toBe('box');
  });

  it('should have a header box', () => {
    layout = new MainLayout(screenManager.screen, CatppuccinMocha);
    expect(layout.header).toBeDefined();
    expect(layout.header.type).toBe('box');
  });

  it('should have an input textbox', () => {
    layout = new MainLayout(screenManager.screen, CatppuccinMocha);
    expect(layout.input).toBeDefined();
    expect(layout.input.type).toBe('textbox');
  });

  it('should have a render method', () => {
    layout = new MainLayout(screenManager.screen, CatppuccinMocha);
    expect(typeof layout.render).toBe('function');
    expect(() => layout.render()).not.toThrow();
  });

  it('should apply theme colors to main box', () => {
    layout = new MainLayout(screenManager.screen, CatppuccinMocha);
    // The main box should have the theme background color
    expect(layout.main.options.style?.bg).toBe(CatppuccinMocha.bg);
  });

  it('should apply theme colors to header', () => {
    layout = new MainLayout(screenManager.screen, CatppuccinMocha);
    expect(layout.header.options.style?.bg).toBe(CatppuccinMocha.bgDark);
    expect(layout.header.options.style?.fg).toBe(CatppuccinMocha.fg);
  });

  it('should apply theme colors to input', () => {
    layout = new MainLayout(screenManager.screen, CatppuccinMocha);
    expect(layout.input.options.style?.fg).toBe(CatppuccinMocha.fg);
    expect(layout.input.options.style?.bg).toBe(CatppuccinMocha.bg);
  });

  it('should have correct header content with tags', () => {
    layout = new MainLayout(screenManager.screen, CatppuccinMocha);
    expect(layout.header.options.content).toContain('DevBoost');
    expect(layout.header.options.content).toContain('v0.1.0');
    expect(layout.header.options.tags).toBe(false);
  });

  it('should position header at top', () => {
    layout = new MainLayout(screenManager.screen, CatppuccinMocha);
    expect(layout.header.options.top).toBe(0);
    expect(layout.header.options.left).toBe(0);
    expect(layout.header.options.width).toBe('100%');
    expect(layout.header.options.height).toBe(3);
  });

  it('should position input at bottom', () => {
    layout = new MainLayout(screenManager.screen, CatppuccinMocha);
    expect(layout.input.options.bottom).toBe(0);
    expect(layout.input.options.left).toBe(0);
    expect(layout.input.options.width).toBe('100%');
    expect(layout.input.options.height).toBe(3);
  });

  it('should have input with prompt', () => {
    layout = new MainLayout(screenManager.screen, CatppuccinMocha);
    expect(layout.input.options.prompt).toBe('> ');
    expect(layout.input.options.inputOnFocus).toBe(true);
  });

  it('should have borders on header and input', () => {
    layout = new MainLayout(screenManager.screen, CatppuccinMocha);
    expect(layout.input.options.border).toBeDefined();
    expect(layout.header.options.style?.border).toBeDefined();
  });
});
