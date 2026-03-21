/**
 * Base Tool implementation
 */

import { Tool, ToolResult } from '../types.js';

export abstract class BaseTool implements Tool {
  abstract name: string;
  abstract description: string;
  abstract parameters: Record<string, unknown>;

  abstract execute(params: Record<string, unknown>): Promise<ToolResult>;

  protected success(data?: unknown): ToolResult {
    return {
      success: true,
      data
    };
  }

  protected error(message: string): ToolResult {
    return {
      success: false,
      error: message
    };
  }

  protected validateRequired(params: Record<string, unknown>, required: string[]): ToolResult | null {
    for (const key of required) {
      if (!(key in params) || params[key] === undefined || params[key] === null) {
        return this.error(`Missing required parameter: ${key}`);
      }
    }
    return null;
  }
}
