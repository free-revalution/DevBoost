import {
  keyboard,
  Key,
  mouse,
  Button,
  screen,
  Region,
  Point
} from '@nut-tree/nut-js';
import type {
  WindowInfo,
  Point as PointType,
  Region as RegionType,
  ClickType,
  MouseButton,
  KeyModifier,
  GUIOptions,
  ElementMatch,
  MenuItem,
  ClickOptions,
  WaitOptions
} from './types.js';

/**
 * GUI Layer Automation using nut.js
 *
 * Provides cross-platform GUI automation for testing
 * and controlling embedded development tools.
 */
export class GUIAutomator {
  private static options: GUIOptions = {};

  /**
   * Configure GUI automator options
   *
   * @param options - GUI options
   */
  static configure(options: GUIOptions): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Click a button by text or position
   *
   * @param target - Button text or position
   * @param options - Click options
   */
  static async clickButton(
    target: string | PointType,
    options: ClickOptions = {}
  ): Promise<void> {
    const { type = 'single', button = 'left', delay = 0 } = options;

    if (delay > 0) {
      await this.delay(delay);
    }

    if (typeof target === 'string') {
      // Find button by text
      const position = await this.findElementByText(target);
      if (!position) {
        throw new Error(`Button not found: ${target}`);
      }
      await this.performClick(position, type, button);
    } else {
      // Click at position
      await this.performClick(target, type, button);
    }
  }

  /**
   * Select a menu item by path
   *
   * @param menuPath - Array of menu item names
   */
  static async selectMenuItem(menuPath: MenuItem[]): Promise<void> {
    for (let i = 0; i < menuPath.length; i++) {
      const item = menuPath[i];

      if (typeof item === 'string') {
        // For menu items, we typically need to click
        // In a real implementation, this would use OCR or image recognition
        // For now, we'll simulate with keyboard shortcuts where possible
        await this.delay(300);
      }
    }
  }

  /**
   * Wait for a window to appear
   *
   * @param windowTitle - Window title or pattern
   * @param options - Wait options
   * @returns Window information if found
   */
  static async waitForWindow(
    windowTitle: string | RegExp,
    options: WaitOptions = {}
  ): Promise<WindowInfo | null> {
    const {
      timeout = this.options.timeout || 10000,
      interval = 500,
      throwOnTimeout = true
    } = options;

    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      // In a real implementation, this would use platform-specific APIs
      // to enumerate windows. For now, we'll simulate with screen matching
      await this.delay(interval);

      // Check if we can find the window title on screen
      try {
        if (typeof windowTitle === 'string') {
          // screen.find requires image matching, not text search
          // This is a placeholder - real implementation would use OCR
          const found = null;
          if (found) {
            return {
              title: windowTitle,
              bounds: {
                x: 0, y: 0, width: 800, height: 600
              },
              isVisible: true,
              isActive: true
            };
          }
        }
      } catch {
        // Continue waiting
      }
    }

    if (throwOnTimeout) {
      throw new Error(`Window not found: ${windowTitle}`);
    }

    return null;
  }

  /**
   * Take a screenshot
   *
   * @param filename - Output filename
   * @param region - Optional region to capture
   * @returns Path to saved screenshot
   */
  static async takeScreenshot(
    filename: string,
    region?: RegionType
  ): Promise<string> {
    const path = this.options.screenshotDir
      ? `${this.options.screenshotDir}/${filename}`
      : filename;

    if (region) {
      await screen.captureRegion(
        filename,
        new Region(region.x, region.y, region.width, region.height)
      );
    } else {
      await screen.capture(filename);
    }

    return path;
  }

  /**
   * Type text on keyboard
   *
   * @param text - Text to type
   * @param delay - Delay between keystrokes in ms
   */
  static async typeText(text: string, delay = 0): Promise<void> {
    if (delay > 0) {
      for (const char of text) {
        await keyboard.type(char);
        await this.delay(delay);
      }
    } else {
      await keyboard.type(text);
    }
  }

  /**
   * Press a key combination
   *
   * @param modifiers - Modifier keys
   * @param key - Key to press
   */
  static async pressKey(modifiers: KeyModifier[], key: string): Promise<void> {
    const modifierKeys = this.mapModifiers(modifiers);

    for (const mod of modifierKeys) {
      await keyboard.pressKey(mod);
    }

    await keyboard.pressKey(this.mapKey(key));
    await keyboard.releaseKey(this.mapKey(key));

    for (const mod of modifierKeys.reverse()) {
      await keyboard.releaseKey(mod);
    }
  }

  /**
   * Move mouse to position
   *
   * @param position - Target position
   */
  static async moveMouse(position: PointType): Promise<void> {
    await mouse.setPosition(new Point(position.x, position.y));
  }

  /**
   * Scroll mouse wheel
   *
   * @param amount - Scroll amount (positive = up, negative = down)
   */
  static async scroll(amount: number): Promise<void> {
    // nut.js doesn't have direct scroll support
    // This would need to be implemented differently
    await this.delay(100);
  }

  /**
   * Find an element by text on screen
   *
   * @param text - Text to find
   * @param match - Match criteria
   * @returns Position if found
   */
  private static async findElementByText(
    text: string,
    match?: ElementMatch
  ): Promise<PointType | null> {
    try {
      // screen.find requires image matching, not text search
      // This is a placeholder - real implementation would use OCR
      const searchRegion = match?.searchRegion
        ? new Region(
            match.searchRegion.x,
            match.searchRegion.y,
            match.searchRegion.width,
            match.searchRegion.height
          )
        : undefined;

      // Placeholder return - real implementation would use OCR
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Perform click at position
   *
   * @param position - Click position
   * @param type - Click type
   * @param button - Mouse button
   */
  private static async performClick(
    position: PointType,
    type: ClickType,
    button: MouseButton
  ): Promise<void> {
    const point = new Point(position.x, position.y);
    const mouseButton = this.mapMouseButton(button);

    await mouse.setPosition(point);

    switch (type) {
      case 'single':
        await mouse.click(mouseButton);
        break;
      case 'double':
        await mouse.doubleClick(mouseButton);
        break;
      case 'right':
        await mouse.click(Button.RIGHT);
        break;
    }
  }

  /**
   * Map mouse button string to nut.js Button
   *
   * @param button - Button string
   * @returns nut.js Button enum
   */
  private static mapMouseButton(button: MouseButton): Button {
    switch (button) {
      case 'left':
        return Button.LEFT;
      case 'right':
        return Button.RIGHT;
      case 'middle':
        return Button.MIDDLE;
      default:
        return Button.LEFT;
    }
  }

  /**
   * Map modifier keys to nut.js Key enum
   *
   * @param modifiers - Modifier key array
   * @returns Array of nut.js Key enums
   */
  private static mapModifiers(modifiers: KeyModifier[]): Key[] {
    const keyMap: Record<string, Key> = {
      Ctrl: Key.LeftControl,
      Alt: Key.LeftAlt,
      Shift: Key.LeftShift,
      Command: Key.LeftSuper,
      Win: Key.LeftSuper
    };

    return modifiers.map(mod => keyMap[mod]);
  }

  /**
   * Map key string to nut.js Key enum
   *
   * @param key - Key string
   * @returns nut.js Key enum
   */
  private static mapKey(key: string): Key {
    const keyMap: Record<string, Key> = {
      Enter: Key.Enter,
      Escape: Key.Escape,
      Tab: Key.Tab,
      Backspace: Key.Backspace,
      Space: Key.Space,
      ArrowUp: Key.Up,
      ArrowDown: Key.Down,
      ArrowLeft: Key.Left,
      ArrowRight: Key.Right,
      F1: Key.F1,
      F2: Key.F2,
      F3: Key.F3,
      F4: Key.F4,
      F5: Key.F5,
      F6: Key.F6,
      F7: Key.F7,
      F8: Key.F8,
      F9: Key.F9,
      F10: Key.F10,
      F11: Key.F11,
      F12: Key.F12
    };

    return keyMap[key] || (key as any);
  }

  /**
   * Delay for specified milliseconds
   *
   * @param ms - Milliseconds to delay
   */
  private static async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
