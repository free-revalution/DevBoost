import { execaCommand } from 'execa';
import { FlashStatus, type FlashResult, type FlashOptions } from './types.js';

/**
 * STM32CubeProgrammer CLI interface
 *
 * Provides functionality to flash STM32 microcontrollers
 * using the STM32CubeProgrammer command-line tool.
 */
export class STM32CubeProgrammer {
  private static readonly CLI_COMMAND = 'STM32_Programmer_CLI';

  /**
   * Detect if STM32CubeProgrammer CLI is installed
   *
   * @returns Promise that resolves to true if installed, false otherwise
   */
  static async detect(): Promise<boolean> {
    try {
      const result = await execaCommand(`${this.CLI_COMMAND} --version`, {
        timeout: 5000,
        reject: false
      });

      // Check if command executed successfully
      return result.exitCode === 0 || result.stdout.includes('STM32CubeProgrammer');
    } catch (error) {
      // Command not found or other error
      return false;
    }
  }

  /**
   * Flash firmware to an STM32 device
   *
   * @param options - Flash programming options
   * @returns Promise that resolves to the flash result
   */
  static async flash(options: FlashOptions): Promise<FlashResult> {
    const startTime = Date.now();

    try {
      const args = this.buildCommandArgs(options);

      const result = await execaCommand(`${this.CLI_COMMAND} ${args.join(' ')}`, {
        timeout: options.timeout || 60000,
        reject: false
      });

      const executionTime = Date.now() - startTime;

      // Check for timeout
      if ((result as any).timedOut) {
        return {
          status: FlashStatus.Timeout,
          success: false,
          errorMessage: 'Flash operation timed out',
          executionTime
        };
      }

      // Check exit code
      if (result.exitCode !== 0) {
        return this.parseErrorResult(result.stdout, result.stderr, executionTime, options.startAddress);
      }

      // Parse success output
      return this.parseSuccessResult(result.stdout, executionTime, options.startAddress);
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Check for timeout
      if (errorMessage.includes('timeout') || errorMessage.includes('TIMEDOUT')) {
        return {
          status: FlashStatus.Timeout,
          success: false,
          errorMessage: `Flash operation timed out: ${errorMessage}`,
          executionTime
        };
      }

      return {
        status: FlashStatus.Failed,
        success: false,
        errorMessage: `Flash operation failed: ${errorMessage}`,
        executionTime
      };
    }
  }

  /**
   * Build command arguments for STM32CubeProgrammer CLI
   *
   * @param options - Flash options
   * @returns Array of command arguments
   */
  private static buildCommandArgs(options: FlashOptions): string[] {
    const args: string[] = [];

    // Connection settings
    const port = options.connection === 'jtag' ? 'port=jtag' : 'port=swd';
    args.push('-c', port);

    // Write command
    args.push('-w', options.filePath, options.startAddress);

    // Verification (enabled by default)
    if (options.verify !== false) {
      args.push('-v');
    }

    // Reset after programming
    if (options.resetAfter) {
      args.push('-rst');
    }

    // Skip erase
    if (options.skipErase) {
      args.push('-e', 'none');
    } else {
      // Erase all sectors by default
      args.push('-e', 'all');
    }

    // Start address for execution
    if (options.startAddress) {
      args.push('-s', options.startAddress);
    }

    return args;
  }

  /**
   * Parse error output from STM32CubeProgrammer
   *
   * @param stdout - Standard output
   * @param stderr - Standard error
   * @param executionTime - Execution time in ms
   * @param startAddress - Start address
   * @returns Flash result with error status
   */
  private static parseErrorResult(
    stdout: string,
    stderr: string,
    executionTime: number,
    startAddress?: string
  ): FlashResult {
    const output = stdout + stderr;

    // Check for verification errors
    if (
      output.toLowerCase().includes('verification') &&
      (output.toLowerCase().includes('failed') ||
        output.toLowerCase().includes('error') ||
        output.toLowerCase().includes('mismatch'))
    ) {
      return {
        status: FlashStatus.VerificationError,
        success: false,
        errorMessage: this.extractErrorMessage(output) || 'Verification failed',
        executionTime,
        startAddress
      };
    }

    // General failure
    return {
      status: FlashStatus.Failed,
      success: false,
      errorMessage: this.extractErrorMessage(output) || 'Flash programming failed',
      executionTime,
      startAddress
    };
  }

  /**
   * Parse success output from STM32CubeProgrammer
   *
   * @param stdout - Standard output
   * @param executionTime - Execution time in ms
   * @param startAddress - Start address
   * @returns Flash result with success status
   */
  private static parseSuccessResult(
    stdout: string,
    executionTime: number,
    startAddress?: string
  ): FlashResult {
    const bytesProgrammed = this.extractBytesProgrammed(stdout);

    return {
      status: FlashStatus.Success,
      success: true,
      executionTime,
      bytesProgrammed,
      startAddress
    };
  }

  /**
   * Extract error message from output
   *
   * @param output - Command output
   * @returns Extracted error message or null
   */
  private static extractErrorMessage(output: string): string | null {
    // Look for error patterns
    const errorPatterns = [
      /error:\s*(.+)/i,
      /failed:\s*(.+)/i,
      /verification\s+(failed|error):\s*(.+)/i
    ];

    for (const pattern of errorPatterns) {
      const match = output.match(pattern);
      if (match) {
        return match[1] || match[0];
      }
    }

    // Return first line that contains error/failed
    const lines = output.split('\n');
    for (const line of lines) {
      if (line.toLowerCase().includes('error') || line.toLowerCase().includes('failed')) {
        return line.trim();
      }
    }

    return null;
  }

  /**
   * Extract bytes programmed from output
   *
   * @param output - Command output
   * @returns Number of bytes programmed or undefined
   */
  private static extractBytesProgrammed(output: string): number | undefined {
    // Look for patterns like "12345 bytes programmed" or "Size: 12345"
    const patterns = [
      /(\d+)\s+bytes?\s+programmed/i,
      /size:\s*(\d+)/i,
      /writing\s+.*?\s+(\d+)\s+bytes/i
    ];

    for (const pattern of patterns) {
      const match = output.match(pattern);
      if (match) {
        return parseInt(match[1], 10);
      }
    }

    return undefined;
  }

  /**
   * Erase flash memory without programming
   *
   * @param connection - Connection type ('swd' or 'jtag')
   * @param sectors - Sectors to erase ('all' or specific sectors)
   * @returns Promise that resolves to true if successful
   */
  static async erase(
    connection: 'swd' | 'jtag' = 'swd',
    sectors: string = 'all'
  ): Promise<boolean> {
    try {
      const port = connection === 'jtag' ? 'port=jtag' : 'port=swd';
      const result = await execaCommand(
        `${this.CLI_COMMAND} -c ${port} -e ${sectors}`,
        { timeout: 30000, reject: false }
      );

      return result.exitCode === 0;
    } catch {
      return false;
    }
  }

  /**
   * Read memory from device
   *
   * @param options - Read options
   * @returns Promise that resolves to the read data as hex string
   */
  static async read(options: {
    connection: 'swd' | 'jtag';
    address: string;
    length: number;
    outputFile?: string;
  }): Promise<string | null> {
    try {
      const port = options.connection === 'jtag' ? 'port=jtag' : 'port=swd';
      const args = ['-c', port, '-d', options.address, options.length.toString()];

      if (options.outputFile) {
        args.push(options.outputFile);
      }

      const result = await execaCommand(`${this.CLI_COMMAND} ${args.join(' ')}`, {
        timeout: 30000,
        reject: false
      });

      if (result.exitCode === 0) {
        return result.stdout;
      }

      return null;
    } catch {
      return null;
    }
  }
}
