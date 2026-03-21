/**
 * Configuration Management for DevBoost CLI
 *
 * Handles loading, saving, and validating configuration.
 * Manages LLM provider settings and environment variables.
 * Supports multiple model configurations.
 */

import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

/**
 * Model configuration
 */
export interface ModelConfig {
  id: string;
  provider: string;
  modelName: string;
  apiKey: string;
  maxTokens: number;
  temperature: number;
  baseUrl?: string; // For custom endpoints
  createdAt: string;
  isDefault?: boolean;
}

/**
 * Main configuration structure
 */
export interface DevBoostConfig {
  version: string;
  currentModelId: string | null;
  models: ModelConfig[];
  projectPath: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Legacy provider config (for backward compatibility)
 */
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

const VALID_PROVIDERS = ['anthropic', 'openai', 'openai-compatible', 'ollama'];

export class ConfigManager {
  readonly projectPath: string;
  readonly configPath: string;
  private modelsPath: string;

  constructor(projectPath: string = process.cwd()) {
    this.projectPath = projectPath;
    this.configPath = path.join(projectPath, '.devboost', 'config.json');
    this.modelsPath = path.join(projectPath, '.devboost', 'models.json');
  }

  /**
   * Load configuration from file or return defaults
   */
  async load(): Promise<DevBoostConfig> {
    try {
      // Try to load new format config
      if (existsSync(this.configPath)) {
        const content = await fs.readFile(this.configPath, 'utf-8');
        const config = JSON.parse(content) as Partial<DevBoostConfig>;

        // Check if it's new format (has models array)
        if (config.models && Array.isArray(config.models)) {
          return {
            version: config.version || '0.1.0',
            currentModelId: config.currentModelId || null,
            models: config.models,
            projectPath: this.projectPath,
            createdAt: config.createdAt || new Date().toISOString(),
            updatedAt: config.updatedAt || new Date().toISOString()
          };
        }

        // Migrate from old format
        return await this.migrateOldConfig(config);
      }

      // Create default config
      return this.createDefaultConfig();
    } catch (error) {
      // If file is corrupted, return defaults
      return this.createDefaultConfig();
    }
  }

  /**
   * Migrate old config format to new format
   */
  private async migrateOldConfig(oldConfig: any): Promise<DevBoostConfig> {
    const now = new Date().toISOString();

    // If there's a models.json file, load it
    let models: ModelConfig[] = [];
    if (existsSync(this.modelsPath)) {
      try {
        const modelsContent = await fs.readFile(this.modelsPath, 'utf-8');
        models = JSON.parse(modelsContent);
      } catch (e) {
        // Ignore errors, use empty array
      }
    }

    // If no models yet, create one from old config
    if (models.length === 0 && oldConfig.llmProvider) {
      const apiKey = this.loadApiKeyFromEnv(oldConfig.llmProvider);
      models = [{
        id: `${oldConfig.llmProvider}-${oldConfig.llmModel || 'default'}`,
        provider: oldConfig.llmProvider,
        modelName: oldConfig.llmModel || this.getDefaultModel(oldConfig.llmProvider),
        apiKey: apiKey || '',
        maxTokens: oldConfig.maxTokens || 4096,
        temperature: oldConfig.temperature || 0.7,
        createdAt: oldConfig.createdAt || now,
        isDefault: true
      }];
    }

    const newConfig: DevBoostConfig = {
      version: '0.1.0',
      currentModelId: models.length > 0 ? models[0].id : null,
      models,
      projectPath: this.projectPath,
      createdAt: oldConfig.createdAt || now,
      updatedAt: now
    };

    await this.save(newConfig);
    return newConfig;
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

    // Save main config (without API keys in plain text)
    const configToSave = { ...config };
    configToSave.models = configToSave.models.map(m => ({
      ...m,
      apiKey: m.apiKey ? '***' + m.apiKey.slice(-4) : '' // Hide API key
    }));

    await fs.writeFile(this.configPath, JSON.stringify(configToSave, null, 2));

    // Save models separately with API keys
    await fs.writeFile(this.modelsPath, JSON.stringify(config.models, null, 2));
  }

  /**
   * Add a new model configuration
   */
  async addModel(model: Omit<ModelConfig, 'id' | 'createdAt'>): Promise<ModelConfig> {
    const config = await this.load();

    // Check if model with same provider and modelName exists
    const existingId = this.generateModelId(model.provider, model.modelName);
    const existingIndex = config.models.findIndex(m => m.id === existingId);

    const newModel: ModelConfig = {
      id: existingId,
      provider: model.provider,
      modelName: model.modelName,
      apiKey: model.apiKey,
      maxTokens: model.maxTokens,
      temperature: model.temperature,
      baseUrl: model.baseUrl,
      createdAt: new Date().toISOString(),
      isDefault: config.models.length === 0
    };

    if (existingIndex >= 0) {
      // Update existing model
      config.models[existingIndex] = newModel;
    } else {
      // Add new model
      config.models.push(newModel);
    }

    // If this is the first model or marked as default, set as current
    if (config.models.length === 1 || model.isDefault) {
      config.currentModelId = newModel.id;
    }

    await this.save(config);
    return newModel;
  }

  /**
   * Remove a model configuration
   */
  async removeModel(modelId: string): Promise<boolean> {
    const config = await this.load();
    const index = config.models.findIndex(m => m.id === modelId);

    if (index === -1) {
      return false;
    }

    config.models.splice(index, 1);

    // If we removed the current model, switch to another
    if (config.currentModelId === modelId) {
      config.currentModelId = config.models.length > 0 ? config.models[0].id : null;
    }

    await this.save(config);
    return true;
  }

  /**
   * Switch to a different model
   */
  async switchModel(modelId: string): Promise<boolean> {
    const config = await this.load();
    const model = config.models.find(m => m.id === modelId);

    if (!model) {
      return false;
    }

    config.currentModelId = modelId;
    await this.save(config);
    return true;
  }

  /**
   * Get current model configuration
   */
  async getCurrentModel(): Promise<ModelConfig | null> {
    const config = await this.load();

    if (!config.currentModelId) {
      return config.models.length > 0 ? config.models[0] : null;
    }

    return config.models.find(m => m.id === config.currentModelId) || null;
  }

  /**
   * Get all models
   */
  async getAllModels(): Promise<ModelConfig[]> {
    const config = await this.load();
    return config.models;
  }

  /**
   * Get a model by ID
   */
  async getModel(modelId: string): Promise<ModelConfig | null> {
    const config = await this.load();
    return config.models.find(m => m.id === modelId) || null;
  }

  /**
   * Get provider configuration (for backward compatibility)
   */
  async getProviderConfig(): Promise<ProviderConfig> {
    const model = await this.getCurrentModel();

    if (!model) {
      return {
        type: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        maxTokens: 4096,
        temperature: 0.7
      };
    }

    return {
      type: model.provider,
      model: model.modelName,
      maxTokens: model.maxTokens,
      temperature: model.temperature
    };
  }

  /**
   * Get API key for current model
   */
  async getCurrentApiKey(): Promise<string | null> {
    const model = await this.getCurrentModel();

    if (!model) {
      return null;
    }

    // If model has API key stored, use it
    if (model.apiKey && model.apiKey !== '') {
      return model.apiKey;
    }

    // Otherwise, try to load from environment
    return this.loadApiKeyFromEnv(model.provider) || null;
  }

  /**
   * Load API key for provider from environment
   */
  loadApiKeyFromEnv(provider: string): string | undefined {
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

    return process.env[envVar];
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
   * Validate configuration
   */
  validateConfig(config: Partial<DevBoostConfig>): ValidationResult {
    const errors: string[] = [];

    // Check required fields
    if (!config.version) {
      errors.push('Missing version');
    }

    if (config.models) {
      config.models.forEach((model, index) => {
        if (!model.provider) {
          errors.push(`Model ${index}: Missing provider`);
        } else if (!VALID_PROVIDERS.includes(model.provider)) {
          errors.push(`Model ${index}: Invalid provider: ${model.provider}`);
        }

        if (!model.modelName) {
          errors.push(`Model ${index}: Missing modelName`);
        }

        if (model.maxTokens !== undefined && (typeof model.maxTokens !== 'number' || model.maxTokens <= 0)) {
          errors.push(`Model ${index}: maxTokens must be a positive number`);
        }

        if (model.temperature !== undefined && (typeof model.temperature !== 'number' || model.temperature < 0 || model.temperature > 2)) {
          errors.push(`Model ${index}: temperature must be between 0 and 2`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate a model config
   */
  validateModel(model: Partial<ModelConfig>): ValidationResult {
    const errors: string[] = [];

    if (!model.provider) {
      errors.push('Missing provider');
    } else if (!VALID_PROVIDERS.includes(model.provider)) {
      errors.push(`Invalid provider: ${model.provider}. Must be one of: ${VALID_PROVIDERS.join(', ')}`);
    }

    if (!model.modelName) {
      errors.push('Missing modelName');
    }

    if (!model.apiKey || model.apiKey.trim() === '') {
      errors.push('Missing apiKey');
    }

    if (model.maxTokens !== undefined && (typeof model.maxTokens !== 'number' || model.maxTokens <= 0)) {
      errors.push('maxTokens must be a positive number');
    }

    if (model.temperature !== undefined && (typeof model.temperature !== 'number' || model.temperature < 0 || model.temperature > 2)) {
      errors.push('temperature must be between 0 and 2');
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
      version: '0.1.0',
      currentModelId: null,
      models: [],
      projectPath: this.projectPath,
      createdAt: now,
      updatedAt: now
    };
  }

  /**
   * Generate a unique model ID
   */
  private generateModelId(provider: string, modelName: string): string {
    // Sanitize the model name to create a valid ID
    const sanitizedName = modelName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    return `${provider}-${sanitizedName}`;
  }

  /**
   * Get default model name for a provider
   */
  private getDefaultModel(provider: string): string {
    const defaults: Record<string, string> = {
      'anthropic': 'claude-3-5-sonnet-20241022',
      'openai': 'gpt-4',
      'openai-compatible': 'gpt-4',
      'ollama': 'llama2'
    };

    return defaults[provider] || 'default';
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
    if (existsSync(this.modelsPath)) {
      await fs.rm(this.modelsPath);
    }
  }
}
