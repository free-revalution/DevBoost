/**
 * Screen coordinates point
 */
export interface Point {
  /** X coordinate */
  x: number;
  /** Y coordinate */
  y: number;
}

/**
 * Screen region/bounds
 */
export interface Region {
  /** X coordinate */
  x: number;
  /** Y coordinate */
  y: number;
  /** Width */
  width: number;
  /** Height */
  height: number;
}

/**
 * Window information
 */
export interface WindowInfo {
  /** Window title */
  title: string;
  /** Window bounds */
  bounds: Region;
  /** Whether window is visible */
  isVisible: boolean;
  /** Whether window is active/foreground */
  isActive: boolean;
  /** Window handle/ID */
  handle?: number;
}

/**
 * Click type
 */
export type ClickType = 'single' | 'double' | 'right';

/**
 * Mouse button
 */
export type MouseButton = 'left' | 'right' | 'middle';

/**
 * Keyboard modifier keys
 */
export type KeyModifier = 'Ctrl' | 'Alt' | 'Shift' | 'Command' | 'Win';

/**
 * GUI automation options
 */
export interface GUIOptions {
  /** Delay between actions in milliseconds */
  actionDelay?: number;
  /** Timeout for waiting operations in milliseconds */
  timeout?: number;
  /** Whether to take screenshots on errors */
  screenshotOnError?: boolean;
  /** Screenshot save directory */
  screenshotDir?: string;
}

/**
 * Element match criteria
 */
export interface ElementMatch {
  /** Text to match */
  text?: string;
  /** Text pattern (regex) */
  textPattern?: RegExp;
  /** Position hint */
  position?: Point;
  /** Size hint */
  size?: { width: number; height: number };
  /** Search region */
  searchRegion?: Region;
}

/**
 * Menu path item
 */
export type MenuItem = string | RegExp;

/**
 * Click options
 */
export interface ClickOptions {
  /** Click type */
  type?: ClickType;
  /** Mouse button */
  button?: MouseButton;
  /** Delay before click in milliseconds */
  delay?: number;
  /** Hold duration in milliseconds */
  holdDuration?: number;
}

/**
 * Wait options
 */
export interface WaitOptions {
  /** Timeout in milliseconds */
  timeout?: number;
  /** Poll interval in milliseconds */
  interval?: number;
  /** Whether to throw error on timeout */
  throwOnTimeout?: boolean;
}
