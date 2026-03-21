/**
 * Flash Tool
 *
 * Flash firmware to embedded devices.
 */

import { BaseTool } from './base.js';
import { ToolResult } from '../types.js';
import { STM32CubeProgrammer } from '@devboost/automation';

export interface FlashToolParameters {
  filePath: string;
  device?: string;
  address?: string;
  verify?: boolean;
  options?: {
    startAddress?: string;
    noReset?: boolean;
  };
}

export class FlashToolClass extends BaseTool {
  name = 'flash';
  description = 'Flash firmware to embedded devices using STM32CubeProgrammer or compatible tools';
  parameters = {
    type: 'object',
    properties: {
      filePath: {
        type: 'string',
        description: 'Path to the firmware file (.hex, .bin, .elf)'
      },
      device: {
        type: 'string',
        description: 'Device identifier (e.g., /dev/ttyUSB0, COM3, or leave empty for auto-detect)'
      },
      address: {
        type: 'string',
        description: 'Flash address (e.g., 0x08000000)'
      },
      verify: {
        type: 'boolean',
        description: 'Verify after flashing (default: true)'
      },
      options: {
        type: 'object',
        description: 'Additional flash options'
      }
    },
    required: ['filePath']
  };

  async execute(params: Record<string, unknown>): Promise<ToolResult> {
    // Validate required parameters
    const validation = this.validateRequired(params, ['filePath']);
    if (validation) {
      return validation;
    }

    try {
      const typedParams = params as unknown as FlashToolParameters;
      const { filePath, device, address, verify = true, options = {} } = typedParams;

      // Check if file exists
      const { promises: fs } = await import('fs');
      try {
        await fs.access(filePath);
      } catch {
        return this.error(`Firmware file not found: ${filePath}`);
      }

      // Prepare flash options
      const flashOptions = {
        filePath,
        connection: 'swd' as const,
        startAddress: address || options.startAddress || '0x08000000',
        verify,
        resetAfter: !options.noReset
      };

      // Execute flash
      const result = await STM32CubeProgrammer.flash(flashOptions);

      if (result.success) {
        return this.success({
          message: 'Firmware flashed successfully',
          device: device || 'auto-detected',
          bytesWritten: result.bytesProgrammed,
          timeTaken: result.executionTime
        });
      } else {
        return this.error(result.errorMessage || 'Flash operation failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return this.error(`Flash operation failed: ${errorMessage}`);
    }
  }
}

// Export as FlashTool for compatibility
export const FlashTool = FlashToolClass;
