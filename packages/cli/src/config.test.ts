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
        llmProvider: 'anthropic',
        llmModel: 'claude-sonnet-4-20250514',
        maxTokens: 4096,
        temperature: 0.7,
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
        llmProvider: 'openai',
        llmModel: 'gpt-4',
        maxTokens: 8192,
        temperature: 0.5,
        projectPath: testDir,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await fs.writeFile(configPath, JSON.stringify(testConfig, null, 2));

      const config = await manager.load();
      expect(config.llmProvider).toBe('openai');
      expect(config.llmModel).toBe('gpt-4');
      expect(config.maxTokens).toBe(8192);
    });

    it('should handle invalid JSON gracefully', async () => {
      const manager = new ConfigManager(testDir);

      // Create invalid config file
      await fs.mkdir(path.dirname(configPath), { recursive: true });
      await fs.writeFile(configPath, 'invalid json');

      const config = await manager.load();
      // Should return default config
      expect(config.version).toBe('0.1.0');
    });
  });

  describe('save', () => {
    it('should save config to file', async () => {
      const manager = new ConfigManager(testDir);
      const config = await manager.load();

      config.llmProvider = 'openai';
      config.llmModel = 'gpt-4';

      await manager.save(config);

      // Verify file was created
      expect(existsSync(configPath)).toBe(true);

      // Verify content
      const content = await fs.readFile(configPath, 'utf-8');
      const savedConfig = JSON.parse(content);
      expect(savedConfig.llmProvider).toBe('openai');
      expect(savedConfig.llmModel).toBe('gpt-4');
    });

    it('should create directory if it does not exist', async () => {
      const manager = new ConfigManager(testDir);
      const config = await manager.load();

      await manager.save(config);

      expect(existsSync(configPath)).toBe(true);
    });
  });

  describe('getProviderConfig', () => {
    it('should return provider configuration', async () => {
      const manager = new ConfigManager(testDir);
      const config = await manager.load();
      config.llmProvider = 'anthropic';
      config.llmModel = 'claude-opus-4-20250514';
      await manager.save(config);

      const providerConfig = await manager.getProviderConfig();
      expect(providerConfig).toEqual({
        type: 'anthropic',
        model: 'claude-opus-4-20250514',
        maxTokens: 4096,
        temperature: 0.7
      });
    });

    it('should return default provider config if not set', async () => {
      const manager = new ConfigManager(testDir);
      const providerConfig = await manager.getProviderConfig();

      expect(providerConfig.type).toBe('anthropic');
      expect(providerConfig.model).toBe('claude-sonnet-4-20250514');
    });
  });

  describe('setProviderConfig', () => {
    it('should update provider configuration', async () => {
      const manager = new ConfigManager(testDir);

      await manager.setProviderConfig({
        type: 'openai',
        model: 'gpt-4-turbo',
        maxTokens: 8192,
        temperature: 0.5
      });

      const config = await manager.load();
      expect(config.llmProvider).toBe('openai');
      expect(config.llmModel).toBe('gpt-4-turbo');
      expect(config.maxTokens).toBe(8192);
      expect(config.temperature).toBe(0.5);
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

  describe('loadApiKey', () => {
    it('should load API key from environment variable', () => {
      process.env.ANTHROPIC_API_KEY = 'test-key';
      const manager = new ConfigManager();

      const apiKey = manager.loadApiKey('anthropic');
      expect(apiKey).toBe('test-key');

      delete process.env.ANTHROPIC_API_KEY;
    });

    it('should return undefined if env var not set', () => {
      const manager = new ConfigManager();
      const apiKey = manager.loadApiKey('anthropic');
      expect(apiKey).toBeUndefined();
    });

    it('should map provider names correctly', () => {
      process.env.OPENAI_API_KEY = 'openai-key';
      process.env.ANTHROPIC_API_KEY = 'anthropic-key';

      const manager = new ConfigManager();
      expect(manager.loadApiKey('openai')).toBe('openai-key');
      expect(manager.loadApiKey('anthropic')).toBe('anthropic-key');

      delete process.env.OPENAI_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;
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

    it('should detect missing required fields', async () => {
      const manager = new ConfigManager(testDir);
      const invalidConfig = {
        version: '0.1.0'
        // Missing required fields
      } as any;

      const result = manager.validateConfig(invalidConfig);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate provider type', async () => {
      const manager = new ConfigManager(testDir);
      const config = await manager.load();
      (config as any).llmProvider = 'invalid-provider';

      const result = manager.validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('provider'))).toBe(true);
    });
  });

  describe('reset', () => {
    it('should reset config to defaults', async () => {
      const manager = new ConfigManager(testDir);
      const config = await manager.load();

      config.llmProvider = 'openai';
      config.temperature = 1.0;
      await manager.save(config);

      await manager.reset();

      const resetConfig = await manager.load();
      expect(resetConfig.llmProvider).toBe('anthropic');
      expect(resetConfig.temperature).toBe(0.7);
    });
  });
});
