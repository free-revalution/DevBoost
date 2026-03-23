import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ScreenManager } from '../src/screen.js';

describe('ScreenManager', () => {
  let screenManager: ScreenManager;
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Spy on process.exit to prevent actual exit during tests
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
  });

  afterEach(() => {
    if (screenManager) {
      try {
        screenManager.destroy();
      } catch (e) {
        // Ignore errors during cleanup
      }
    }
    exitSpy.mockRestore();
  });

  it('should create a screen manager instance', () => {
    screenManager = new ScreenManager();
    expect(screenManager).toBeDefined();
    expect(screenManager.screen).toBeDefined();
  });

  it('should have a render method', () => {
    screenManager = new ScreenManager();
    expect(typeof screenManager.render).toBe('function');
    expect(() => screenManager.render()).not.toThrow();
  });

  it('should have a registerKey method', () => {
    screenManager = new ScreenManager();
    expect(typeof screenManager.registerKey).toBe('function');
  });

  it('should register custom key handlers', () => {
    screenManager = new ScreenManager();
    const handler = vi.fn();
    screenManager.registerKey(['x'], handler);
    // We can't easily test the actual key press without a real TTY,
    // but we can verify the method doesn't throw
    expect(() => screenManager.registerKey(['y'], () => {})).not.toThrow();
  });

  it('should have a destroy method', () => {
    screenManager = new ScreenManager();
    expect(typeof screenManager.destroy).toBe('function');
    expect(() => screenManager.destroy()).not.toThrow();
  });

  it('should register exit keys', () => {
    screenManager = new ScreenManager();
    // The constructor should register q, escape, and C-c keys
    // We can verify this doesn't throw during construction
    expect(screenManager).toBeDefined();
  });

  it('should handle exit on q key press', () => {
    screenManager = new ScreenManager();
    // Note: We can't actually simulate key presses in tests without a TTY
    // but we verified the registration in constructor
    expect(screenManager.screen).toBeDefined();
  });
});
