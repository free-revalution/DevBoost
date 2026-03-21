/**
 * Build status enumeration
 */
export enum BuildStatus {
  /** Build completed successfully */
  Success = 'Success',
  /** Build failed with errors */
  Failed = 'Failed',
  /** Build timed out */
  Timeout = 'Timeout',
  /** Build was cancelled */
  Cancelled = 'Cancelled'
}

/**
 * Build tool types
 */
export type BuildTool = 'make' | 'cmake' | 'ninja' | 'msbuild' | 'xcodebuild' | 'unknown';

/**
 * Build configuration type
 */
export type BuildConfig = 'Debug' | 'Release' | 'RelWithDebInfo' | 'MinSizeRel';

/**
 * Build output information
 */
export interface BuildOutput {
  /** Standard output from build command */
  stdout: string;
  /** Standard error from build command */
  stderr: string;
  /** Combined output */
  combined?: string;
}

/**
 * Build result
 */
export interface BuildResult {
  /** Build status */
  status: BuildStatus;
  /** Success flag */
  success: boolean;
  /** Exit code from build command */
  exitCode: number;
  /** Build duration in milliseconds */
  duration: number;
  /** Build output */
  output: BuildOutput;
  /** Number of warnings */
  warnings?: number;
  /** Number of errors */
  errors?: number;
  /** Build artifacts created */
  artifacts?: string[];
  /** Error message if failed */
  errorMessage?: string;
}

/**
 * Build options
 */
export interface BuildOptions {
  /** Build directory */
  buildDir?: string;
  /** Build configuration */
  config?: BuildConfig;
  /** Target to build */
  target?: string;
  /** Number of parallel jobs */
  jobs?: number;
  /** Build timeout in milliseconds */
  timeout?: number;
  /** Verbose output */
  verbose?: boolean;
  /** Clean before build */
  clean?: boolean;
  /** Environment variables */
  env?: Record<string, string>;
  /** Additional arguments */
  args?: string[];
}

/**
 * Clean options
 */
export interface CleanOptions {
  /** Build directory */
  buildDir?: string;
  /** Clean all (including dependencies) */
  all?: boolean;
  /** Verbose output */
  verbose?: boolean;
}
