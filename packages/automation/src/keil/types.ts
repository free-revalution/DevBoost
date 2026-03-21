/**
 * Target device information extracted from Keil project
 */
export interface TargetInfo {
  /** Device name (e.g., STM32F407VGT6) */
  deviceName: string;
  /** Vendor name (e.g., STMicroelectronics) */
  vendor: string;
  /** CPU type (e.g., Cortex-M4) */
  cpuType: string;
  /** IRAM start address */
  iramStart: string;
  /** IRAM size */
  iramSize: string;
  /** IROM (flash) start address */
  iromStart: string;
  /** IROM (flash) size */
  iromSize: string;
  /** Whether the device has FPU */
  hasFPU: boolean;
  /** FPU type if present (e.g., FPU2, FPU5) */
  fpuType?: string;
  /** Clock frequency */
  clock?: string;
}

/**
 * Source file information
 */
export interface SourceFile {
  /** File name */
  name: string;
  /** Relative or absolute file path */
  path: string;
  /** File type (C Source, Header, Assembler, etc.) */
  type: string;
  /** Group name the file belongs to */
  group: string;
  /** File type code from Keil */
  fileTypeCode?: number;
}

/**
 * Compiler settings
 */
export interface CompilerSettings {
  /** Optimization level */
  optimization?: string;
  /** C standard */
  cStandard?: string;
  /** Debug information */
  debugInfo?: boolean;
  /** Include paths */
  includePaths?: string[];
  /** Preprocessor definitions */
  defines?: string[];
}

/**
 * Keil project information
 */
export interface KeilProject {
  /** Project file path */
  filePath: string;
  /** Target information */
  targetInfo: TargetInfo;
  /** Source files */
  sources: SourceFile[];
  /** Compiler settings */
  compilerSettings: CompilerSettings;
  /** Toolset name */
  toolsetName?: string;
  /** Schema version */
  schemaVersion?: string;
}
