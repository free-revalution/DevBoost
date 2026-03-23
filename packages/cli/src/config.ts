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
 * Main configuration structure (config.json - safe to commit)
 * Models are stored separately in models.json (contains API keys)
 */
export interface DevBoostConfig {
  version: string;
  currentModelId: string | null;
  projectPath: string;
  createdAt: string;
  updatedAt: string;
  telegram?: TelegramConfig;
  // models array is NOT stored here - it's in models.json
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

// Import and re-export TelegramConfig from telegram module
import type { TelegramConfig, AuthorizedUser, Permission } from './telegram/config.js';
export type { TelegramConfig };

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export class ConfigManager {
  readonly projectPath: string;
  readonly configPath: string;
  private modelsPath: string;
  private readonly telegramPath: string;

  constructor(projectPath?: string) {
    // If no projectPath provided, find the monorepo root
    this.projectPath = projectPath || this.findProjectRoot();
    this.configPath = path.join(this.projectPath, '.devboost', 'config.json');
    this.modelsPath = path.join(this.projectPath, '.devboost', 'models.json');
    this.telegramPath = path.join(this.projectPath, '.devboost', 'telegram.json');
  }

  /**
   * Find the project root by looking for package.json or pnpm-workspace.yaml
   * This ensures .devboost is always at the monorepo root, not in subdirectories
   */
  private findProjectRoot(startPath: string = process.cwd()): string {
    let currentPath = startPath;

    while (currentPath !== path.parse(currentPath).root) {
      // Check for monorepo markers
      const hasPnpmWorkspace = existsSync(path.join(currentPath, 'pnpm-workspace.yaml'));
      const hasPackageJson = existsSync(path.join(currentPath, 'package.json'));

      if (hasPnpmWorkspace || hasPackageJson) {
        // Check if this is a monorepo root by looking for packages directory
        const packagesDir = existsSync(path.join(currentPath, 'packages'));
        if (packagesDir || hasPnpmWorkspace) {
          return currentPath;
        }
      }

      // Move up one directory
      currentPath = path.dirname(currentPath);
    }

    // Fallback to current directory if no root found
    return startPath;
  }

  /**
   * Load configuration from file or return defaults
   * Returns config with models loaded from models.json
   */
  async load(): Promise<DevBoostConfig & { models: ModelConfig[] }> {
    try {
      // Load or create metadata config
      let metadata: Partial<DevBoostConfig>;

      if (existsSync(this.configPath)) {
        const content = await fs.readFile(this.configPath, 'utf-8');
        const parsed = JSON.parse(content);

        // Handle old format with llmProvider/llmModel (truly old format)
        if (parsed.llmProvider || parsed.llmModel) {
          return await this.migrateOldConfig(parsed);
        }

        // Handle intermediate format (has models array in config.json)
        if (parsed.models && Array.isArray(parsed.models)) {
          // Migrate: move models to models.json
          const models = parsed.models;
          await fs.writeFile(this.modelsPath, JSON.stringify(models, null, 2));

          // Remove models from config and save
          delete parsed.models;
          await fs.writeFile(this.configPath, JSON.stringify(parsed, null, 2));

          metadata = parsed;
        } else {
          metadata = parsed as Partial<DevBoostConfig>;
        }
      } else {
        // Create default metadata
        metadata = {
          version: '0.1.0',
          currentModelId: null,
          projectPath: this.projectPath,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }

      // Load models from models.json
      let models: ModelConfig[] = [];
      if (existsSync(this.modelsPath)) {
        try {
          const modelsContent = await fs.readFile(this.modelsPath, 'utf-8');
          models = JSON.parse(modelsContent);
        } catch (e) {
          // If models.json is corrupted, start with empty array
          models = [];
        }
      }

      return {
        version: metadata.version || '0.1.0',
        currentModelId: metadata.currentModelId || null,
        models,
        projectPath: this.projectPath,
        createdAt: metadata.createdAt || new Date().toISOString(),
        updatedAt: metadata.updatedAt || new Date().toISOString(),
        telegram: metadata.telegram
      };
    } catch (error) {
      // If file is corrupted, return defaults
      return {
        version: '0.1.0',
        currentModelId: null,
        models: [],
        projectPath: this.projectPath,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }
  }

  /**
   * Migrate old config format to new format
   */
  private async migrateOldConfig(oldConfig: any): Promise<DevBoostConfig & { models: ModelConfig[] }> {
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

    const newConfig = {
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
   * Saves metadata to config.json (safe to commit)
   * Saves models with API keys to models.json (gitignored)
   */
  async save(config: DevBoostConfig & { models: ModelConfig[] }): Promise<void> {
    const configDir = path.dirname(this.configPath);

    // Create directory if it doesn't exist
    if (!existsSync(configDir)) {
      await fs.mkdir(configDir, { recursive: true });
    }

    // Update timestamp
    config.updatedAt = new Date().toISOString();

    // Save metadata to config.json (NO models array, NO API keys)
    const { models, telegram, ...metadata } = config;
    const metadataToSave = {
      ...metadata,
      // Include telegram with masked botToken if present
      ...(telegram && {
        telegram: {
          ...telegram,
          botToken: telegram.botToken ? '***' + telegram.botToken.slice(-4) : ''
        }
      })
    };

    await fs.writeFile(this.configPath, JSON.stringify(metadataToSave, null, 2));

    // Save models separately with unmasked API keys
    await fs.writeFile(this.modelsPath, JSON.stringify(models, null, 2));

    // Save telegram config separately if it exists
    if (telegram && telegram.botToken) {
      await this.saveTelegramConfig(telegram);
    }
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
  validateConfig(config: Partial<DevBoostConfig> & { models?: ModelConfig[] }): ValidationResult {
    const errors: string[] = [];

    // Check required fields
    if (!config.version) {
      errors.push('Missing version');
    }

    // Validate models if provided
    if (config.models) {
      config.models.forEach((model, index) => {
        // Provider is optional - can be any value
        // No provider validation needed

        if (!model.modelName) {
          errors.push(`Model ${index}: Missing modelName`);
        }

        if (!model.apiKey || model.apiKey.trim() === '') {
          errors.push(`Model ${index}: Missing apiKey`);
        }

        if (!model.baseUrl || model.baseUrl.trim() === '') {
          errors.push(`Model ${index}: Missing baseUrl (API endpoint URL)`);
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

    // provider is optional - user can use any provider
    // if (!model.provider) {
    //   errors.push('Missing provider');
    // }

    if (!model.modelName || model.modelName.trim() === '') {
      errors.push('Missing modelName');
    }

    if (!model.apiKey || model.apiKey.trim() === '') {
      errors.push('Missing apiKey');
    }

    if (!model.baseUrl || model.baseUrl.trim() === '') {
      errors.push('Missing baseUrl - API endpoint URL is required');
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
  private createDefaultConfig(): DevBoostConfig & { models: ModelConfig[] } {
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
    // Use model name as ID (sanitized) for simplicity
    // Provider is no longer restricted, so ID is based on model name
    const sanitizedName = modelName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    return sanitizedName;
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
    if (existsSync(this.telegramPath)) {
      await fs.rm(this.telegramPath);
    }
  }

  /**
   * Get Telegram configuration
   */
  async getTelegramConfig(): Promise<TelegramConfig | null> {
    const config = await this.load();

    // Try to load from telegram.json (has unmasked token)
    if (existsSync(this.telegramPath)) {
      try {
        const telegramContent = await fs.readFile(this.telegramPath, 'utf-8');
        return JSON.parse(telegramContent) as TelegramConfig;
      } catch (e) {
        // If file is corrupted, return null
        return null;
      }
    }

    // If no telegram.json but config has telegram settings, return those
    if (config.telegram) {
      return config.telegram;
    }

    return null;
  }

  /**
   * Save Telegram configuration
   */
  async saveTelegramConfig(telegramConfig: TelegramConfig): Promise<void> {
    const configDir = path.dirname(this.telegramPath);

    // Create directory if it doesn't exist
    if (!existsSync(configDir)) {
      await fs.mkdir(configDir, { recursive: true });
    }

    // Save to telegram.json with full token
    await fs.writeFile(this.telegramPath, JSON.stringify(telegramConfig, null, 2));

    // Also update main config to reflect enabled status
    const mainConfig = await this.load();
    mainConfig.telegram = {
      ...telegramConfig,
      botToken: telegramConfig.botToken ? '***' + telegramConfig.botToken.slice(-4) : ''
    };
    await this.save(mainConfig);
  }

  /**
   * Update Telegram bot token
   */
  async updateTelegramBotToken(token: string): Promise<void> {
    const telegramConfig = await this.getTelegramConfig();

    if (!telegramConfig) {
      throw new Error('Telegram configuration not found. Initialize it first.');
    }

    telegramConfig.botToken = token;
    await this.saveTelegramConfig(telegramConfig);
  }

  /**
   * Add authorized Telegram user
   */
  async addAuthorizedUser(user: {
    telegramId: string;
    name: string;
    permissions: string[];
  }): Promise<void> {
    const telegramConfig = await this.getTelegramConfig();

    if (!telegramConfig) {
      throw new Error('Telegram configuration not found. Initialize it first.');
    }

    const authorizedUser: AuthorizedUser = {
      telegramId: user.telegramId,
      name: user.name,
      permissions: user.permissions as Permission[]
    };

    const existingIndex = telegramConfig.authorizedUsers.findIndex(
      (u: AuthorizedUser) => u.telegramId === user.telegramId
    );

    if (existingIndex >= 0) {
      // Update existing user
      telegramConfig.authorizedUsers[existingIndex] = authorizedUser;
    } else {
      // Add new user
      telegramConfig.authorizedUsers.push(authorizedUser);
    }

    await this.saveTelegramConfig(telegramConfig);
  }

  /**
   * Remove authorized Telegram user
   */
  async removeAuthorizedUser(telegramId: string): Promise<boolean> {
    const telegramConfig = await this.getTelegramConfig();

    if (!telegramConfig) {
      return false;
    }

    const index = telegramConfig.authorizedUsers.findIndex(
      (u: AuthorizedUser) => u.telegramId === telegramId
    );

    if (index === -1) {
      return false;
    }

    telegramConfig.authorizedUsers.splice(index, 1);
    await this.saveTelegramConfig(telegramConfig);
    return true;
  }

  /**
   * Initialize default Telegram configuration
   */
  async initializeTelegramConfig(botToken: string): Promise<TelegramConfig> {
    const defaultConfig: TelegramConfig = {
      enabled: true,
      botToken,
      authorizedUsers: [],
      notifications: true,
      remoteControl: true,
      aiConversation: true
    };

    await this.saveTelegramConfig(defaultConfig);
    return defaultConfig;
  }
}
