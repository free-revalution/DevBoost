/**
 * Configuration Management for DevBoost CLI
 *
 * Handles loading, saving, and validating configuration.
 * Manages LLM provider settings and environment variables.
 */

import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

export interface DevBoostConfig {
  version: string;
  llmProvider: string;
  llmModel: string;
  maxTokens: number;
  temperature: number;
  projectPath: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderConfig {
  type: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const DEFAULT_CONFIG: Omit<DevBoostConfig, 'projectPath' | 'createdAt' | 'updatedAt'> = {
  version: '0.1.0',
  llmProvider: 'anthropic',
  llmModel: 'claude-sonnet-4-20250514',
  maxTokens: 4096,
  temperature: 0.7
};

const VALID_PROVIDERS = ['anthropic', 'openai', 'openai-compatible', 'ollama'];

export class ConfigManager {
  readonly projectPath: string;
  readonly configPath: string;

  constructor(projectPath: string = process.cwd()) {
    this.projectPath = projectPath;
    this.configPath = path.join(projectPath, '.devboost', 'config.json');
  }

  /**
   * Load configuration from file or return defaults
   */
  async load(): Promise<DevBoostConfig> {
    try {
      if (!existsSync(this.configPath)) {
        return this.createDefaultConfig();
      }

      const content = await fs.readFile(this.configPath, 'utf-8');
      const config = JSON.parse(content) as Partial<DevBoostConfig>;

      // Merge with defaults to ensure all fields exist
      return {
        version: config.version ?? DEFAULT_CONFIG.version,
        llmProvider: config.llmProvider ?? DEFAULT_CONFIG.llmProvider,
        llmModel: config.llmModel ?? DEFAULT_CONFIG.llmModel,
        maxTokens: config.maxTokens ?? DEFAULT_CONFIG.maxTokens,
        temperature: config.temperature ?? DEFAULT_CONFIG.temperature,
        projectPath: this.projectPath,
        createdAt: config.createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    } catch (error) {
      // If file is corrupted, return defaults
      return this.createDefaultConfig();
    }
  }

  /**
   * Save configuration to file
   */
  async save(config: DevBoostConfig): Promise<void> {
    const configDir = path.dirname(this.configPath);

    // Create directory if it doesn't exist
    if (!existsSync(configDir)) {
      await fs.mkdir(configDir, { recursive: true });
    }

    // Update timestamp
    config.updatedAt = new Date().toISOString();

    await fs.writeFile(this.configPath, JSON.stringify(config, null, 2));
  }

  /**
   * Get provider configuration
   */
  async getProviderConfig(): Promise<ProviderConfig> {
    const config = await this.load();

    return {
      type: config.llmProvider,
      model: config.llmModel,
      maxTokens: config.maxTokens,
      temperature: config.temperature
    };
  }

  /**
   * Set provider configuration
   */
  async setProviderConfig(providerConfig: ProviderConfig): Promise<void> {
    const config = await this.load();

    config.llmProvider = providerConfig.type;
    config.llmModel = providerConfig.model;
    config.maxTokens = providerConfig.maxTokens;
    config.temperature = providerConfig.temperature;

    await this.save(config);
  }

  /**
   * Get environment variable
   */
  getEnvVar(name: string): string | undefined {
    return process.env[name];
  }

  /**
   * Set environment variable
   */
  setEnvVar(name: string, value: string): void {
    process.env[name] = value;
  }

  /**
   * Load API key for provider from environment
   */
  loadApiKey(provider: string): string | undefined {
    const envVarNames: Record<string, string> = {
      'anthropic': 'ANTHROPIC_API_KEY',
      'openai': 'OPENAI_API_KEY',
      'openai-compatible': 'OPENAI_API_KEY',
      'ollama': 'OLLAMA_API_KEY'
    };

    const envVar = envVarNames[provider];
    if (!envVar) {
      return undefined;
    }

    return this.getEnvVar(envVar);
  }

  /**
   * Validate configuration
   */
  validateConfig(config: Partial<DevBoostConfig>): ValidationResult {
    const errors: string[] = [];

    // Check required fields
    if (!config.version) {
      errors.push('Missing version');
    }

    if (!config.llmProvider) {
      errors.push('Missing llmProvider');
    } else if (!VALID_PROVIDERS.includes(config.llmProvider)) {
      errors.push(`Invalid llmProvider: ${config.llmProvider}. Must be one of: ${VALID_PROVIDERS.join(', ')}`);
    }

    if (!config.llmModel) {
      errors.push('Missing llmModel');
    }

    if (config.maxTokens !== undefined && (typeof config.maxTokens !== 'number' || config.maxTokens <= 0)) {
      errors.push('maxTokens must be a positive number');
    }

    if (config.temperature !== undefined && (typeof config.temperature !== 'number' || config.temperature < 0 || config.temperature > 2)) {
      errors.push('temperature must be a number between 0 and 2');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Reset configuration to defaults
   */
  async reset(): Promise<void> {
    const defaultConfig = this.createDefaultConfig();
    await this.save(defaultConfig);
  }

  /**
   * Create default configuration
   */
  private createDefaultConfig(): DevBoostConfig {
    const now = new Date().toISOString();

    return {
      ...DEFAULT_CONFIG,
      projectPath: this.projectPath,
      createdAt: now,
      updatedAt: now
    };
  }

  /**
   * Get config file path
   */
  getConfigPath(): string {
    return this.configPath;
  }

  /**
   * Check if config file exists
   */
  exists(): boolean {
    return existsSync(this.configPath);
  }

  /**
   * Delete config file
   */
  async delete(): Promise<void> {
    if (this.exists()) {
      await fs.rm(this.configPath);
    }
  }
}
