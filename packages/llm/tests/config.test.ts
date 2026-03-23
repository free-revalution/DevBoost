import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConfigStore } from '../src/config/store.js';
import { ProviderConfig } from '../src/config/types.js';
import { promises as fs } from 'fs';

describe('ConfigStore', () => {
  const testConfigPath = '/tmp/test-llm-config.json';
  let store: ConfigStore;

  beforeEach(() => {
    store = new ConfigStore(testConfigPath);
  });

  afterEach(async () => {
    try {
      await fs.unlink(testConfigPath);
    } catch {
      // Ignore if file doesn't exist
    }
  });

  it('should save config to file', async () => {
    const config: ProviderConfig = {
      providers: [
        {
          name: 'anthropic',
          type: 'anthropic',
          apiKey: 'sk-test-key',
          model: 'claude-sonnet-4-6'
        }
      ],
      defaultProvider: 'anthropic'
    };

    await store.save(config);

    const saved = await fs.readFile(testConfigPath, 'utf-8');
    const parsed = JSON.parse(saved);
    expect(parsed).toEqual(config);
  });

  it('should load config from file', async () => {
    const config: ProviderConfig = {
      providers: [
        {
          name: 'openai',
          type: 'openai-compatible',
          apiKey: 'sk-test',
          model: 'gpt-4',
          baseUrl: 'https://api.openai.com/v1'
        }
      ],
      defaultProvider: 'openai'
    };

    await fs.writeFile(testConfigPath, JSON.stringify(config, null, 2));

    const loaded = await store.load();
    expect(loaded).toEqual(config);
  });

  it('should throw error when loading non-existent file', async () => {
    await expect(store.load()).rejects.toThrow();
  });

  it('should handle multiple providers', async () => {
    const config: ProviderConfig = {
      providers: [
        {
          name: 'anthropic',
          type: 'anthropic',
          apiKey: 'sk-ant-key',
          model: 'claude-sonnet-4-6'
        },
        {
          name: 'openai',
          type: 'openai-compatible',
          apiKey: 'sk-openai-key',
          model: 'gpt-4',
          baseUrl: 'https://api.openai.com/v1'
        }
      ],
      defaultProvider: 'anthropic'
    };

    await store.save(config);
    const loaded = await store.load();

    expect(loaded.providers).toHaveLength(2);
    expect(loaded.providers[0].name).toBe('anthropic');
    expect(loaded.providers[1].name).toBe('openai');
  });

  it('should preserve provider types correctly', async () => {
    const config: ProviderConfig = {
      providers: [
        {
          name: 'provider1',
          type: 'anthropic',
          apiKey: 'key1',
          model: 'model1'
        },
        {
          name: 'provider2',
          type: 'openai-compatible',
          apiKey: 'key2',
          model: 'model2',
          baseUrl: 'https://example.com'
        }
      ],
      defaultProvider: 'provider1'
    };

    await store.save(config);
    const loaded = await store.load();

    expect(loaded.providers[0].type).toBe('anthropic');
    expect(loaded.providers[1].type).toBe('openai-compatible');
  });
});
