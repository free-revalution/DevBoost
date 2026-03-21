/**
 * Config Tool
 *
 * Manage DevBoost configuration settings.
 */

import { BaseTool } from './base.js';
import { ToolResult } from '../types.js';

export interface ConfigToolParameters {
  action: 'set' | 'get' | 'list' | 'delete';
  key?: string;
  value?: unknown;
}

export class ConfigTool extends BaseTool {
  name = 'config';
  description = 'Manage DevBoost configuration settings';
  parameters = {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['set', 'get', 'list', 'delete'],
        description: 'Action to perform'
      },
      key: {
        type: 'string',
        description: 'Configuration key (required for set, get, and delete actions)'
      },
      value: {
        description: 'Configuration value (required for set action)'
      }
    },
    required: ['action']
  };

  // In-memory configuration store (in production, this would be persisted)
  private static config: Record<string, unknown> = {
    // Default LLM settings
    llm: {
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20241022',
      temperature: 0.7,
      maxTokens: 4096
    },
    // Default build settings
    build: {
      tool: 'make',
      configuration: 'Debug',
      clean: false
    },
    // Default flash settings
    flash: {
      verify: true,
      address: '0x08000000'
    }
  };

  async execute(params: Record<string, unknown>): Promise<ToolResult> {
    // Validate required parameters
    const validation = this.validateRequired(params, ['action']);
    if (validation) {
      return validation;
    }

    const typedParams = params as unknown as ConfigToolParameters;
    const { action, key, value } = typedParams;

    try {
      switch (action) {
        case 'set':
          return await this.setConfig(key, value);

        case 'get':
          return await this.getConfig(key);

        case 'list':
          return await this.listConfig();

        case 'delete':
          return await this.deleteConfig(key);

        default:
          return this.error(`Unknown action: ${action}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return this.error(`Config operation failed: ${errorMessage}`);
    }
  }

  private async setConfig(key: string | undefined, value: unknown): Promise<ToolResult> {
    if (!key) {
      return this.error('Configuration key is required for set action');
    }

    // Support nested keys using dot notation (e.g., "llm.temperature")
    const keys = key.split('.');
    let current: Record<string, unknown> = ConfigTool.config;

    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!(k in current) || typeof current[k] !== 'object') {
        current[k] = {};
      }
      current = current[k] as Record<string, unknown>;
    }

    current[keys[keys.length - 1]] = value;

    return this.success({
      message: `Configuration set: ${key}`,
      key,
      value
    });
  }

  private async getConfig(key: string | undefined): Promise<ToolResult> {
    if (!key) {
      return this.error('Configuration key is required for get action');
    }

    // Support nested keys using dot notation
    const keys = key.split('.');
    let current: unknown = ConfigTool.config;

    for (const k of keys) {
      if (current && typeof current === 'object' && k in current) {
        current = (current as Record<string, unknown>)[k];
      } else {
        return this.error(`Configuration key not found: ${key}`);
      }
    }

    return this.success({
      key,
      value: current
    });
  }

  private async listConfig(): Promise<ToolResult> {
    return this.success({
      message: 'Current configuration',
      config: ConfigTool.config
    });
  }

  private async deleteConfig(key: string | undefined): Promise<ToolResult> {
    if (!key) {
      return this.error('Configuration key is required for delete action');
    }

    // Support nested keys using dot notation
    const keys = key.split('.');
    let current: Record<string, unknown> = ConfigTool.config;

    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!(k in current) || typeof current[k] !== 'object') {
        return this.error(`Configuration key not found: ${key}`);
      }
      current = current[k] as Record<string, unknown>;
    }

    const lastKey = keys[keys.length - 1];
    if (!(lastKey in current)) {
      return this.error(`Configuration key not found: ${key}`);
    }

    delete current[lastKey];

    return this.success({
      message: `Configuration deleted: ${key}`,
      key
    });
  }

  /**
   * Get all configuration (for internal use)
   */
  static getAllConfig(): Record<string, unknown> {
    return { ...ConfigTool.config };
  }

  /**
   * Get a specific configuration value (for internal use)
   */
  static getConfigValue(key: string): unknown {
    const keys = key.split('.');
    let current: unknown = ConfigTool.config;

    for (const k of keys) {
      if (current && typeof current === 'object' && k in current) {
        current = (current as Record<string, unknown>)[k];
      } else {
        return undefined;
      }
    }

    return current;
  }
}
