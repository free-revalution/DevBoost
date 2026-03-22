/**
 * Tests for Configuration Management
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ConfigManager } from './config.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { existsSync } from 'node:fs';

describe('ConfigManager', () => {
  const testDir = '/tmp/devboost-config-test';
  const configPath = path.join(testDir, '.devboost', 'config.json');

  beforeEach(async () => {
    // Clean up test directory
    if (existsSync(testDir)) {
      await fs.rm(testDir, { recursive: true, force: true });
    }
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    if (existsSync(testDir)) {
      await fs.rm(testDir, { recursive: true, force: true });
    }
  });

  describe('constructor', () => {
    it('should create config manager with default path', () => {
      const manager = new ConfigManager();
      expect(manager.configPath).toContain('.devboost');
      expect(manager.configPath).toContain('config.json');
    });

    it('should create config manager with custom path', () => {
      const manager = new ConfigManager(testDir);
      expect(manager.configPath).toBe(configPath);
    });
  });

  describe('load', () => {
    it('should return default config if file does not exist', async () => {
      const manager = new ConfigManager(testDir);
      const config = await manager.load();

      expect(config).toEqual({
        version: '0.1.0',
        currentModelId: null,
        models: [],
        projectPath: testDir,
        createdAt: expect.any(String),
        updatedAt: expect.any(String)
      });
    });

    it('should load existing config', async () => {
      const manager = new ConfigManager(testDir);

      // Create config file
      await fs.mkdir(path.dirname(configPath), { recursive: true });
      const testConfig = {
        version: '0.2.0',
        currentModelId: 'openai-gpt-4',
        models: [{
          id: 'openai-gpt-4',
          provider: 'openai',
          modelName: 'gpt-4',
          apiKey: 'sk-test',
          maxTokens: 8192,
          temperature: 0.5,
          createdAt: new Date().toISOString()
        }],
        projectPath: testDir,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await fs.writeFile(configPath, JSON.stringify(testConfig, null, 2));

      const config = await manager.load();
      expect(config.currentModelId).toBe('openai-gpt-4');
      expect(config.models).toHaveLength(1);
      expect(config.models[0].provider).toBe('openai');
      expect(config.models[0].modelName).toBe('gpt-4');
    });

    it('should handle invalid JSON gracefully', async () => {
      const manager = new ConfigManager(testDir);

      // Create invalid config file
      await fs.mkdir(path.dirname(configPath), { recursive: true });
      await fs.writeFile(configPath, 'invalid json');

      const config = await manager.load();
      // Should return default config
      expect(config.version).toBe('0.1.0');
      expect(config.models).toEqual([]);
    });

    it('should migrate old config format', async () => {
      const manager = new ConfigManager(testDir);

      // Create old format config file
      await fs.mkdir(path.dirname(configPath), { recursive: true });
      const oldConfig = {
        version: '0.1.0',
        llmProvider: 'anthropic',
        llmModel: 'claude-3-5-sonnet-20241022',
        maxTokens: 4096,
        temperature: 0.7,
        projectPath: testDir,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await fs.writeFile(configPath, JSON.stringify(oldConfig, null, 2));

      const config = await manager.load();
      // Should migrate to new format
      expect(config.currentModelId).toBe('anthropic-claude-3-5-sonnet-20241022');
      expect(config.models).toHaveLength(1);
      expect(config.models[0].provider).toBe('anthropic');
    });
  });

  describe('save', () => {
    it('should save config to file', async () => {
      const manager = new ConfigManager(testDir);
      const config = await manager.load();

      config.models = [{
        id: 'openai-gpt-4',
        provider: 'openai',
        modelName: 'gpt-4',
        apiKey: 'sk-test',
        maxTokens: 8192,
        temperature: 0.5,
        createdAt: new Date().toISOString()
      }];
      config.currentModelId = 'openai-gpt-4';

      await manager.save(config);

      // Verify file was created
      expect(existsSync(configPath)).toBe(true);

      // Verify content
      const content = await fs.readFile(configPath, 'utf-8');
      const savedConfig = JSON.parse(content);
      expect(savedConfig.currentModelId).toBe('openai-gpt-4');
      expect(savedConfig.models).toHaveLength(1);
    });

    it('should create directory if it does not exist', async () => {
      const manager = new ConfigManager(testDir);
      const config = await manager.load();

      await manager.save(config);

      expect(existsSync(configPath)).toBe(true);
    });
  });

  describe('addModel', () => {
    it('should add a new model', async () => {
      const manager = new ConfigManager(testDir);

      const model = await manager.addModel({
        provider: 'anthropic',
        modelName: 'claude-3-5-sonnet-20241022',
        apiKey: 'sk-ant-test',
        maxTokens: 4096,
        temperature: 0.7
      });

      expect(model.id).toBe('anthropic-claude-3-5-sonnet-20241022');
      expect(model.provider).toBe('anthropic');
      expect(model.isDefault).toBe(true);

      const config = await manager.load();
      expect(config.models).toHaveLength(1);
      expect(config.currentModelId).toBe(model.id);
    });

    it('should update existing model', async () => {
      const manager = new ConfigManager(testDir);

      await manager.addModel({
        provider: 'anthropic',
        modelName: 'claude-3-5-sonnet-20241022',
        apiKey: 'sk-ant-old',
        maxTokens: 4096,
        temperature: 0.7
      });

      const updated = await manager.addModel({
        provider: 'anthropic',
        modelName: 'claude-3-5-sonnet-20241022',
        apiKey: 'sk-ant-new',
        maxTokens: 8192,
        temperature: 0.5
      });

      expect(updated.apiKey).toBe('sk-ant-new');
      expect(updated.maxTokens).toBe(8192);

      const config = await manager.load();
      expect(config.models).toHaveLength(1);
    });
  });

  describe('removeModel', () => {
    it('should remove a model', async () => {
      const manager = new ConfigManager(testDir);

      const model = await manager.addModel({
        provider: 'anthropic',
        modelName: 'claude-3-5-sonnet-20241022',
        apiKey: 'sk-ant-test',
        maxTokens: 4096,
        temperature: 0.7
      });

      const removed = await manager.removeModel(model.id);
      expect(removed).toBe(true);

      const config = await manager.load();
      expect(config.models).toHaveLength(0);
      expect(config.currentModelId).toBeNull();
    });

    it('should return false for non-existent model', async () => {
      const manager = new ConfigManager(testDir);

      const removed = await manager.removeModel('non-existent');
      expect(removed).toBe(false);
    });
  });

  describe('switchModel', () => {
    it('should switch to a different model', async () => {
      const manager = new ConfigManager(testDir);

      await manager.addModel({
        provider: 'anthropic',
        modelName: 'claude-3-5-sonnet-20241022',
        apiKey: 'sk-ant-test',
        maxTokens: 4096,
        temperature: 0.7
      });

      await manager.addModel({
        provider: 'openai',
        modelName: 'gpt-4',
        apiKey: 'sk-openai-test',
        maxTokens: 8192,
        temperature: 0.5
      });

      const switched = await manager.switchModel('openai-gpt-4');
      expect(switched).toBe(true);

      const config = await manager.load();
      expect(config.currentModelId).toBe('openai-gpt-4');
    });

    it('should return false for non-existent model', async () => {
      const manager = new ConfigManager(testDir);

      const switched = await manager.switchModel('non-existent');
      expect(switched).toBe(false);
    });
  });

  describe('getCurrentModel', () => {
    it('should return current model', async () => {
      const manager = new ConfigManager(testDir);

      await manager.addModel({
        provider: 'anthropic',
        modelName: 'claude-3-5-sonnet-20241022',
        apiKey: 'sk-ant-test',
        maxTokens: 4096,
        temperature: 0.7
      });

      const current = await manager.getCurrentModel();
      expect(current).not.toBeNull();
      expect(current?.provider).toBe('anthropic');
    });

    it('should return null when no models', async () => {
      const manager = new ConfigManager(testDir);

      const current = await manager.getCurrentModel();
      expect(current).toBeNull();
    });
  });

  describe('getProviderConfig', () => {
    it('should return provider configuration from current model', async () => {
      const manager = new ConfigManager(testDir);

      await manager.addModel({
        provider: 'anthropic',
        modelName: 'claude-opus-4-20250514',
        apiKey: 'sk-ant-test',
        maxTokens: 4096,
        temperature: 0.7
      });

      const providerConfig = await manager.getProviderConfig();
      expect(providerConfig).toEqual({
        type: 'anthropic',
        model: 'claude-opus-4-20250514',
        maxTokens: 4096,
        temperature: 0.7
      });
    });

    it('should return default provider config if no models', async () => {
      const manager = new ConfigManager(testDir);
      const providerConfig = await manager.getProviderConfig();

      expect(providerConfig.type).toBe('anthropic');
      expect(providerConfig.model).toBe('claude-sonnet-4-20250514');
    });
  });

  describe('getCurrentApiKey', () => {
    it('should return API key from current model', async () => {
      const manager = new ConfigManager(testDir);

      await manager.addModel({
        provider: 'anthropic',
        modelName: 'claude-3-5-sonnet-20241022',
        apiKey: 'sk-ant-test-key',
        maxTokens: 4096,
        temperature: 0.7
      });

      const apiKey = await manager.getCurrentApiKey();
      expect(apiKey).toBe('sk-ant-test-key');
    });

    it('should fall back to environment variable', () => {
      process.env.ANTHROPIC_API_KEY = 'env-key';

      const manager = new ConfigManager();
      const apiKey = manager.loadApiKeyFromEnv('anthropic');
      expect(apiKey).toBe('env-key');

      delete process.env.ANTHROPIC_API_KEY;
    });
  });

  describe('loadApiKeyFromEnv', () => {
    it('should map provider names correctly', () => {
      process.env.OPENAI_API_KEY = 'openai-key';
      process.env.ANTHROPIC_API_KEY = 'anthropic-key';

      const manager = new ConfigManager();
      expect(manager.loadApiKeyFromEnv('openai')).toBe('openai-key');
      expect(manager.loadApiKeyFromEnv('anthropic')).toBe('anthropic-key');
      expect(manager.loadApiKeyFromEnv('openai-compatible')).toBe('openai-key');

      delete process.env.OPENAI_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;
    });

    it('should return undefined for unknown provider', () => {
      const manager = new ConfigManager();
      expect(manager.loadApiKeyFromEnv('unknown')).toBeUndefined();
    });
  });

  describe('validateConfig', () => {
    it('should validate correct config', async () => {
      const manager = new ConfigManager(testDir);
      const config = await manager.load();

      const result = manager.validateConfig(config);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should detect missing version', async () => {
      const manager = new ConfigManager(testDir);
      const invalidConfig = {
        models: []
      } as any;

      const result = manager.validateConfig(invalidConfig);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing version');
    });

    it('should validate model provider', async () => {
      const manager = new ConfigManager(testDir);
      const invalidConfig = {
        version: '0.1.0',
        models: [{
          id: 'test',
          provider: 'invalid-provider',
          modelName: 'model',
          apiKey: 'key',
          maxTokens: 1000,
          temperature: 0.5,
          createdAt: new Date().toISOString()
        }]
      };

      const result = manager.validateConfig(invalidConfig);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid provider'))).toBe(true);
    });
  });

  describe('validateModel', () => {
    it('should validate correct model', async () => {
      const manager = new ConfigManager(testDir);
      const model = {
        provider: 'anthropic',
        modelName: 'claude-3-5-sonnet-20241022',
        apiKey: 'sk-ant-test',
        maxTokens: 4096,
        temperature: 0.7
      };

      const result = manager.validateModel(model);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should detect missing provider', () => {
      const manager = new ConfigManager(testDir);
      const model = {
        modelName: 'test',
        apiKey: 'key',
        maxTokens: 1000,
        temperature: 0.5
      } as any;

      const result = manager.validateModel(model);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing provider');
    });

    it('should detect missing API key', () => {
      const manager = new ConfigManager(testDir);
      const model = {
        provider: 'anthropic',
        modelName: 'test',
        maxTokens: 1000,
        temperature: 0.5
      } as any;

      const result = manager.validateModel(model);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing apiKey');
    });
  });

  describe('reset', () => {
    it('should reset config to defaults', async () => {
      const manager = new ConfigManager(testDir);

      // Add a model
      await manager.addModel({
        provider: 'openai',
        modelName: 'gpt-4',
        apiKey: 'sk-test',
        maxTokens: 8192,
        temperature: 1.0
      });

      await manager.reset();

      const resetConfig = await manager.load();
      expect(resetConfig.currentModelId).toBeNull();
      expect(resetConfig.models).toEqual([]);
      expect(resetConfig.version).toBe('0.1.0');
    });
  });

  describe('exists', () => {
    it('should return true when config exists', async () => {
      const manager = new ConfigManager(testDir);
      await manager.save(await manager.load());

      expect(manager.exists()).toBe(true);
    });

    it('should return false when config does not exist', () => {
      const manager = new ConfigManager(testDir);
      expect(manager.exists()).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete config files', async () => {
      const manager = new ConfigManager(testDir);
      await manager.save(await manager.load());

      await manager.delete();

      expect(manager.exists()).toBe(false);
    });
  });

  describe('getEnvVar', () => {
    it('should return environment variable value', () => {
      process.env.TEST_VAR = 'test_value';
      const manager = new ConfigManager();

      expect(manager.getEnvVar('TEST_VAR')).toBe('test_value');

      delete process.env.TEST_VAR;
    });

    it('should return undefined if env var does not exist', () => {
      const manager = new ConfigManager();
      expect(manager.getEnvVar('NONEXISTENT_VAR')).toBeUndefined();
    });
  });

  describe('setEnvVar', () => {
    it('should set environment variable', () => {
      const manager = new ConfigManager();
      manager.setEnvVar('NEW_VAR', 'new_value');

      expect(process.env.NEW_VAR).toBe('new_value');
      delete process.env.NEW_VAR;
    });
  });
});
