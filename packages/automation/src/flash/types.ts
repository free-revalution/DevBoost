/**
 * Flash programming status
 */
export enum FlashStatus {
  /** Programming completed successfully */
  Success = 'Success',
  /** Programming failed */
  Failed = 'Failed',
  /** Operation timed out */
  Timeout = 'Timeout',
  /** Verification failed after programming */
  VerificationError = 'VerificationError'
}

/**
 * Flash programming result
 */
export interface FlashResult {
  /** Overall status */
  status: FlashStatus;
  /** Success flag */
  success: boolean;
  /** Error message if failed */
  errorMessage?: string;
  /** Execution time in milliseconds */
  executionTime: number;
  /** Bytes programmed */
  bytesProgrammed?: number;
  /** Start address */
  startAddress?: string;
}

/**
 * Flash programming options
 */
export interface FlashOptions {
  /** Path to firmware file (.hex, .bin, .elf) */
  filePath: string;
  /** Connection type: 'swd' or 'jtag' */
  connection: 'swd' | 'jtag';
  /** Start address for programming */
  startAddress: string;
  /** Reset after programming */
  resetAfter?: boolean;
  /** Verify after programming */
  verify?: boolean;
  /** Timeout in milliseconds */
  timeout?: number;
  /** Skip erase */
  skipErase?: boolean;
}
