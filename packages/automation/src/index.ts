/**
 * DevBoost Embedded Tool Automation
 *
 * Phase 2: Embedded Automation Layer
 *
 * Provides comprehensive automation for embedded development tools including:
 * - USB device detection
 * - Flash programming (STM32CubeProgrammer)
 * - Project parsing (Keil µVision, CubeMX)
 * - File editing with backup
 * - CLI build automation
 * - GUI automation with nut.js
 */

// USB Device Detection
export { USBDetector, DeviceType } from './usb/index.js';
export type { USBDevice, DeviceDetectionResult } from './usb/index.js';

// Flash Programming
export { STM32CubeProgrammer, FlashStatus } from './flash/index.js';
export type { FlashResult, FlashOptions } from './flash/index.js';

// Keil Project Parser
export { KeilProjectParser } from './keil/index.js';
export type { TargetInfo, SourceFile, CompilerSettings, KeilProject } from './keil/index.js';

// CubeMX Parser
export { CubeMXParser } from './cubemx/index.js';
export type { PinConfig, PeripheralConfig, MCUInfo, IocFile } from './cubemx/index.js';

// File Editor
export { FileEditor } from './file/index.js';
export type {
  FileOperation,
  EditMode,
  FileChange,
  EditOptions,
  ProjectConfigOptions,
  SourceUpdateOptions,
  BackupInfo
} from './file/index.js';

// CLI Builder
export { CLIBuilder, BuildStatus } from './cli/index.js';
export type { BuildTool, BuildConfig, BuildOutput, BuildResult, BuildOptions, CleanOptions } from './cli/index.js';

// GUI Automator
export { GUIAutomator } from './gui/index.js';
export type {
  Point,
  Region,
  WindowInfo,
  ClickType,
  MouseButton,
  KeyModifier,
  GUIOptions,
  ElementMatch,
  MenuItem,
  ClickOptions,
  WaitOptions
} from './gui/index.js';
