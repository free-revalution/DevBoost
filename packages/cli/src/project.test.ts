import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ProjectManager } from './project.js';
import { rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';

describe('ProjectManager', () => {
  const testDir = '/tmp/devboost-test-project';
  let manager: ProjectManager;

  beforeEach(async () => {
    // Clean up test directory before each test
    try { await rm(testDir, { recursive: true, force: true }); } catch {}
    manager = new ProjectManager(testDir);
  });

  afterEach(async () => {
    // Clean up after each test
    try { await rm(testDir, { recursive: true, force: true }); } catch {}
  });

  describe('constructor', () => {
    it('should use provided project path', () => {
      const customManager = new ProjectManager(testDir);
      expect(customManager.projectPath).toBe(testDir);
      expect(customManager.configPath).toBe(`${testDir}/.devboost`);
    });

    it('should use current working directory by default', () => {
      const defaultManager = new ProjectManager();
      expect(defaultManager.projectPath).toBe(process.cwd());
      expect(defaultManager.configPath).toBe(`${process.cwd()}/.devboost`);
    });
  });

  describe('isInitialized', () => {
    it('should return false when .devboost does not exist', () => {
      expect(manager.isInitialized()).toBe(false);
    });

    it('should return true when .devboost exists', async () => {
      await manager.init();
      expect(manager.isInitialized()).toBe(true);
    });
  });

  describe('init', () => {
    it('should create .devboost directory', async () => {
      await manager.init();
      expect(existsSync(manager.configPath)).toBe(true);
    });

    it('should create subdirectories', async () => {
      await manager.init();
      expect(existsSync(`${manager.configPath}/skills`)).toBe(true);
      expect(existsSync(`${manager.configPath}/history`)).toBe(true);
      expect(existsSync(`${manager.configPath}/context`)).toBe(true);
      expect(existsSync(`${manager.configPath}/cache`)).toBe(true);
    });

    it('should create config.json with default values', async () => {
      await manager.init();
      const { readFile } = await import('node:fs/promises');
      const configContent = await readFile(`${manager.configPath}/config.json`, 'utf-8');
      const config = JSON.parse(configContent);

      expect(config.version).toBe('0.1.0');
      expect(config.llmProvider).toBe('anthropic');
      expect(config.createdAt).toBeDefined();
    });

    it('should not overwrite existing config.json', async () => {
      await manager.init();

      // Modify the config
      const { writeFile } = await import('node:fs/promises');
      await writeFile(`${manager.configPath}/config.json`, JSON.stringify({
        version: '0.2.0',
        llmProvider: 'openai',
        customField: 'should-remain'
      }, null, 2));

      // Run init again
      await manager.init();

      // Verify config wasn't overwritten
      const { readFile } = await import('node:fs/promises');
      const configContent = await readFile(`${manager.configPath}/config.json`, 'utf-8');
      const config = JSON.parse(configContent);

      expect(config.version).toBe('0.2.0');
      expect(config.llmProvider).toBe('openai');
      expect(config.customField).toBe('should-remain');
    });

    it('should be idempotent', async () => {
      await manager.init();
      await manager.init();
      expect(existsSync(manager.configPath)).toBe(true);
    });
  });
});
