/**
 * Tests for DevBoost Agent Tools
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FlashToolClass } from '../src/tools/flash.js';
import { BuildToolClass } from '../src/tools/build.js';
import { ProjectToolClass } from '../src/tools/project.js';
import { ConfigTool } from '../src/tools/config.js';
import { DetectToolClass } from '../src/tools/detect.js';
import { LLMTool } from '../src/tools/llm.js';
import { ProviderRegistry } from '@devboost/llm';
import { AnthropicProvider } from '@devboost/llm';
import { ContextManager } from '../src/context.js';

describe('FlashTool', () => {
  let tool: FlashToolClass;

  beforeEach(() => {
    tool = new FlashToolClass();
  });

  describe('initialization', () => {
    it('should have correct name and description', () => {
      expect(tool.name).toBe('flash');
      expect(tool.description).toBeDefined();
      expect(tool.description.length).toBeGreaterThan(0);
    });

    it('should have correct parameters schema', () => {
      expect(tool.parameters).toBeDefined();
      expect(tool.parameters.type).toBe('object');
      expect(tool.parameters.properties).toBeDefined();
      expect(tool.parameters.required).toContain('filePath');
    });
  });

  describe('execute', () => {
    it('should require filePath parameter', async () => {
      const result = await tool.execute({});

      expect(result.success).toBe(false);
      expect(result.error).toContain('filePath');
    });

    it('should validate file existence', async () => {
      const result = await tool.execute({
        filePath: '/nonexistent/file.hex'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should accept valid parameters', async () => {
      // Create a temporary test file
      const { promises: fs } = await import('fs');
      const { join } = await import('path');
      const tmpDir = '/tmp/devboost-test-flash';
      await fs.mkdir(tmpDir, { recursive: true });
      const testFile = join(tmpDir, 'test.hex');
      await fs.writeFile(testFile, 'test data');

      const result = await tool.execute({
        filePath: testFile,
        verify: true
      });

      // Result may fail due to missing hardware, but should not fail validation
      expect(result).toBeDefined();

      // Cleanup
      await fs.rm(tmpDir, { recursive: true, force: true });
    });

    it('should handle optional parameters', async () => {
      const { promises: fs } = await import('fs');
      const { join } = await import('path');
      const tmpDir = '/tmp/devboost-test-flash';
      await fs.mkdir(tmpDir, { recursive: true });
      const testFile = join(tmpDir, 'test.hex');
      await fs.writeFile(testFile, 'test data');

      const result = await tool.execute({
        filePath: testFile,
        device: '/dev/ttyUSB0',
        address: '0x08000000',
        verify: false,
        options: {
          startAddress: '0x08000000',
          noReset: true
        }
      });

      expect(result).toBeDefined();

      // Cleanup
      await fs.rm(tmpDir, { recursive: true, force: true });
    });
  });
});

describe('BuildTool', () => {
  let tool: BuildToolClass;

  beforeEach(() => {
    tool = new BuildToolClass();
  });

  describe('initialization', () => {
    it('should have correct name and description', () => {
      expect(tool.name).toBe('build');
      expect(tool.description).toBeDefined();
    });

    it('should have correct parameters schema', () => {
      expect(tool.parameters).toBeDefined();
      expect(tool.parameters.required).toContain('projectPath');
    });
  });

  describe('execute', () => {
    it('should require projectPath parameter', async () => {
      const result = await tool.execute({});

      expect(result.success).toBe(false);
      expect(result.error).toContain('projectPath');
    });

    it('should validate project path existence', async () => {
      const result = await tool.execute({
        projectPath: '/nonexistent/project'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should accept valid parameters', async () => {
      const { promises: fs } = await import('fs');
      const tmpDir = '/tmp/devboost-test-build';
      await fs.mkdir(tmpDir, { recursive: true });

      const result = await tool.execute({
        projectPath: tmpDir,
        tool: 'make',
        configuration: 'Debug',
        clean: false
      });

      expect(result).toBeDefined();

      // Cleanup
      await fs.rm(tmpDir, { recursive: true, force: true });
    });
  });
});

describe('ProjectTool', () => {
  let tool: ProjectToolClass;

  beforeEach(() => {
    tool = new ProjectToolClass();
  });

  describe('initialization', () => {
    it('should have correct name and description', () => {
      expect(tool.name).toBe('project');
      expect(tool.description).toBeDefined();
    });

    it('should have correct parameters schema', () => {
      expect(tool.parameters).toBeDefined();
      expect(tool.parameters.required).toContain('action');
    });
  });

  describe('execute', () => {
    it('should require action parameter', async () => {
      const result = await tool.execute({});

      expect(result.success).toBe(false);
      expect(result.error).toContain('action');
    });

    it('should handle init action', async () => {
      const { promises: fs } = await import('fs');
      const tmpDir = '/tmp/devboost-test-project-init';
      await fs.mkdir(tmpDir, { recursive: true });

      const result = await tool.execute({
        action: 'init',
        path: tmpDir,
        name: 'TestProject',
        type: 'embedded'
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data).toHaveProperty('project');

      // Cleanup
      await fs.rm(tmpDir, { recursive: true, force: true });
    });

    it('should require path for init action', async () => {
      const result = await tool.execute({
        action: 'init'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('path');
    });

    it('should handle load action', async () => {
      const { promises: fs } = await import('fs');
      const tmpDir = '/tmp/devboost-test-project-load';
      await fs.mkdir(tmpDir, { recursive: true });

      const result = await tool.execute({
        action: 'load',
        path: tmpDir
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      // Cleanup
      await fs.rm(tmpDir, { recursive: true, force: true });
    });

    it('should handle save action', async () => {
      const result = await tool.execute({
        action: 'save'
      });

      expect(result.success).toBe(true);
    });

    it('should handle info action', async () => {
      const result = await tool.execute({
        action: 'info'
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should reject unknown actions', async () => {
      const result = await tool.execute({
        action: 'unknown' as any
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown action');
    });
  });

  describe('context integration', () => {
    it('should accept context manager', () => {
      const context = new ContextManager();

      expect(() => tool.setContext(context)).not.toThrow();
    });
  });
});

describe('ConfigTool', () => {
  let tool: ConfigTool;

  beforeEach(() => {
    tool = new ConfigTool();
  });

  describe('initialization', () => {
    it('should have correct name and description', () => {
      expect(tool.name).toBe('config');
      expect(tool.description).toBeDefined();
    });

    it('should have correct parameters schema', () => {
      expect(tool.parameters).toBeDefined();
      expect(tool.parameters.required).toContain('action');
    });
  });

  describe('execute', () => {
    it('should require action parameter', async () => {
      const result = await tool.execute({});

      expect(result.success).toBe(false);
      expect(result.error).toContain('action');
    });

    it('should handle set action', async () => {
      const result = await tool.execute({
        action: 'set',
        key: 'test.key',
        value: 'test-value'
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('key', 'test.key');
      expect(result.data).toHaveProperty('value', 'test-value');
    });

    it('should require key for set action', async () => {
      const result = await tool.execute({
        action: 'set',
        value: 'test-value'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('key');
    });

    it('should handle get action', async () => {
      // First set a value
      await tool.execute({
        action: 'set',
        key: 'test.get',
        value: 'get-value'
      });

      // Then get it
      const result = await tool.execute({
        action: 'get',
        key: 'test.get'
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('value', 'get-value');
    });

    it('should return error for non-existent key', async () => {
      const result = await tool.execute({
        action: 'get',
        key: 'nonexistent.key'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should handle list action', async () => {
      const result = await tool.execute({
        action: 'list'
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data).toHaveProperty('config');
    });

    it('should handle delete action', async () => {
      // First set a value
      await tool.execute({
        action: 'set',
        key: 'test.delete',
        value: 'delete-value'
      });

      // Then delete it
      const result = await tool.execute({
        action: 'delete',
        key: 'test.delete'
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('key', 'test.delete');
    });

    it('should support nested keys with dot notation', async () => {
      const result = await tool.execute({
        action: 'set',
        key: 'llm.temperature',
        value: 0.8
      });

      expect(result.success).toBe(true);

      const getResult = await tool.execute({
        action: 'get',
        key: 'llm.temperature'
      });

      expect(getResult.success).toBe(true);
      expect(getResult.data).toHaveProperty('value', 0.8);
    });
  });

  describe('static methods', () => {
    it('should provide getAllConfig method', () => {
      const config = ConfigTool.getAllConfig();

      expect(config).toBeDefined();
      expect(typeof config).toBe('object');
    });

    it('should provide getConfigValue method', () => {
      const value = ConfigTool.getConfigValue('llm.provider');

      expect(value).toBeDefined();
    });

    it('should return undefined for non-existent config key', () => {
      const value = ConfigTool.getConfigValue('nonexistent.key');

      expect(value).toBeUndefined();
    });
  });
});

describe('DetectTool', () => {
  let tool: DetectToolClass;

  beforeEach(() => {
    tool = new DetectToolClass();
  });

  describe('initialization', () => {
    it('should have correct name and description', () => {
      expect(tool.name).toBe('detect');
      expect(tool.description).toBeDefined();
    });

    it('should have correct parameters schema', () => {
      expect(tool.parameters).toBeDefined();
      expect(tool.parameters.properties).toHaveProperty('action');
    });
  });

  describe('execute', () => {
    it('should handle list action with default parameters', async () => {
      const result = await tool.execute({});

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should handle list action explicitly', async () => {
      const result = await tool.execute({
        action: 'list'
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data).toHaveProperty('devices');
      expect(result.data).toHaveProperty('count');
    });

    it('should return empty devices when none found', async () => {
      const result = await tool.execute({
        action: 'list'
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('devices');
      expect(result.data).toHaveProperty('count');
      // Count should be a number
      expect(typeof result.data.count).toBe('number');
    });

    it('should filter by device type', async () => {
      const result = await tool.execute({
        action: 'list',
        deviceType: 'stm32'
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should handle identify action', async () => {
      const result = await tool.execute({
        action: 'identify'
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should return success with empty devices for identify when none found', async () => {
      const result = await tool.execute({
        action: 'identify'
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data).toHaveProperty('sampleDevice');
    });

    it('should handle watch action', async () => {
      const result = await tool.execute({
        action: 'watch',
        timeout: 100
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data).toHaveProperty('duration');
    });

    it('should handle watch with custom timeout', async () => {
      const result = await tool.execute({
        action: 'watch',
        timeout: 500
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should reject unknown actions', async () => {
      const result = await tool.execute({
        action: 'unknown' as any
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown action');
    });
  });
});

describe('LLMTool', () => {
  let tool: LLMTool;
  let registry: ProviderRegistry;

  beforeEach(() => {
    registry = new ProviderRegistry();
    tool = new LLMTool(registry);
  });

  describe('initialization', () => {
    it('should have correct name and description', () => {
      expect(tool.name).toBe('llm');
      expect(tool.description).toBeDefined();
    });

    it('should require prompt parameter', () => {
      expect(tool.parameters.required).toContain('prompt');
    });
  });

  describe('execute', () => {
    it('should require prompt parameter', async () => {
      const result = await tool.execute({});

      expect(result.success).toBe(false);
      expect(result.error).toContain('prompt');
    });

    it('should fail without configured provider', async () => {
      const result = await tool.execute({
        prompt: 'Test prompt'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('provider');
    });

    it('should accept valid parameters', async () => {
      // Register a mock provider
      const mockProvider = {
        chat: async () => 'Test response'
      } as any;
      registry.register('mock', mockProvider);
      registry.use('mock');

      const result = await tool.execute({
        prompt: 'Test prompt',
        temperature: 0.7,
        maxTokens: 1000
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should handle system prompt', async () => {
      const mockProvider = {
        chat: async () => 'Test response'
      } as any;
      registry.register('mock', mockProvider);
      registry.use('mock');

      const result = await tool.execute({
        prompt: 'Test prompt',
        systemPrompt: 'You are a helpful assistant'
      });

      expect(result.success).toBe(true);
    });
  });
});
