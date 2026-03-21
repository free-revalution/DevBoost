/**
 * Tests for Context Manager
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ContextManager, ProjectState } from '../src/context.js';
import { Role } from '../src/types.js';
import { promises as fs } from 'fs';
import { join } from 'path';

describe('ContextManager', () => {
  const testPersistPath = '/tmp/devboost-test-context';
  let contextManager: ContextManager;

  beforeEach(async () => {
    // Clean up any existing test data
    try {
      await fs.rm(testPersistPath, { recursive: true, force: true });
    } catch (error) {
      // Ignore
    }

    contextManager = new ContextManager({
      persistPath: testPersistPath,
      autoSave: false // Disable auto-save for tests
    });
  });

  afterEach(async () => {
    // Clean up test data
    try {
      await fs.rm(testPersistPath, { recursive: true, force: true });
    } catch (error) {
      // Ignore
    }
  });

  describe('message management', () => {
    it('should add messages to history', async () => {
      await contextManager.addMessage({
        role: Role.User,
        content: 'Hello'
      });

      const messages = contextManager.getMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe('Hello');
      expect(messages[0].timestamp).toBeDefined();
    });

    it('should preserve message order', async () => {
      await contextManager.addMessage({
        role: Role.User,
        content: 'First'
      });

      await contextManager.addMessage({
        role: Role.Assistant,
        content: 'Second'
      });

      await contextManager.addMessage({
        role: Role.User,
        content: 'Third'
      });

      const messages = contextManager.getMessages();
      expect(messages[0].content).toBe('First');
      expect(messages[1].content).toBe('Second');
      expect(messages[2].content).toBe('Third');
    });

    it('should trim history when exceeding max size', async () => {
      const smallManager = new ContextManager({
        maxHistorySize: 5,
        persistPath: testPersistPath,
        autoSave: false
      });

      for (let i = 0; i < 10; i++) {
        await smallManager.addMessage({
          role: Role.User,
          content: `Message ${i}`
        });
      }

      const messages = smallManager.getMessages();
      expect(messages).toHaveLength(5);
      expect(messages[0].content).toBe('Message 5');
      expect(messages[4].content).toBe('Message 9');
    });

    it('should get recent messages', async () => {
      for (let i = 0; i < 10; i++) {
        await contextManager.addMessage({
          role: Role.User,
          content: `Message ${i}`
        });
      }

      const recent = contextManager.getRecentMessages(3);
      expect(recent).toHaveLength(3);
      expect(recent[0].content).toBe('Message 7');
      expect(recent[2].content).toBe('Message 9');
    });

    it('should get messages since timestamp', async () => {
      const now = Date.now();

      await contextManager.addMessage({
        role: Role.User,
        content: 'Old message',
        timestamp: now - 1000
      });

      await contextManager.addMessage({
        role: Role.User,
        content: 'New message',
        timestamp: now + 1000
      });

      const messages = contextManager.getMessagesSince(now);
      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe('New message');
    });

    it('should clear all messages', async () => {
      await contextManager.addMessage({
        role: Role.User,
        content: 'Test'
      });

      await contextManager.clearMessages();

      const messages = contextManager.getMessages();
      expect(messages).toHaveLength(0);
    });
  });

  describe('project management', () => {
    const testProject: ProjectState = {
      path: '/path/to/project',
      name: 'TestProject',
      type: 'embedded'
    };

    it('should set current project', async () => {
      await contextManager.setProject(testProject);

      const project = contextManager.getProject();
      expect(project).toEqual(testProject);
    });

    it('should update project', async () => {
      await contextManager.setProject(testProject);

      const updatedProject = { ...testProject, name: 'UpdatedProject' };
      await contextManager.setProject(updatedProject);

      const project = contextManager.getProject();
      expect(project?.name).toBe('UpdatedProject');
    });

    it('should clear current project', async () => {
      await contextManager.setProject(testProject);
      await contextManager.clearProject();

      const project = contextManager.getProject();
      expect(project).toBeUndefined();
    });
  });

  describe('variable management', () => {
    it('should set and get variables', async () => {
      await contextManager.setVariable('testKey', 'testValue');

      expect(contextManager.getVariable('testKey')).toBe('testValue');
    });

    it('should check if variable exists', async () => {
      await contextManager.setVariable('exists', true);

      expect(contextManager.hasVariable('exists')).toBe(true);
      expect(contextManager.hasVariable('notexists')).toBe(false);
    });

    it('should delete variables', async () => {
      await contextManager.setVariable('temp', 'value');

      const deleted = await contextManager.deleteVariable('temp');
      expect(deleted).toBe(true);
      expect(contextManager.hasVariable('temp')).toBe(false);
    });

    it('should return false when deleting non-existent variable', async () => {
      const deleted = await contextManager.deleteVariable('nonexistent');
      expect(deleted).toBe(false);
    });

    it('should get all variables as object', async () => {
      await contextManager.setVariable('key1', 'value1');
      await contextManager.setVariable('key2', 42);
      await contextManager.setVariable('key3', true);

      const variables = contextManager.getVariables();
      expect(variables).toEqual({
        key1: 'value1',
        key2: 42,
        key3: true
      });
    });
  });

  describe('persistence', () => {
    it('should save and load context', async () => {
      await contextManager.addMessage({
        role: Role.User,
        content: 'Test message'
      });

      await contextManager.setVariable('test', 'value');

      await contextManager.save();

      const newManager = new ContextManager({
        persistPath: testPersistPath,
        autoSave: false
      });

      await newManager.load();

      const messages = newManager.getMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe('Test message');

      expect(newManager.getVariable('test')).toBe('value');
    });

    it('should handle missing context file on load', async () => {
      await contextManager.load();

      const messages = contextManager.getMessages();
      expect(messages).toHaveLength(0);
    });

    it('should not save when not dirty', async () => {
      await contextManager.save();

      // Second save should be a no-op
      await contextManager.save();

      // File should still exist and be valid
      const newManager = new ContextManager({
        persistPath: testPersistPath,
        autoSave: false
      });

      await newManager.load();
      expect(newManager.getMessages()).toHaveLength(0);
    });
  });

  describe('snapshots', () => {
    it('should create and restore snapshots', async () => {
      await contextManager.addMessage({
        role: Role.User,
        content: 'Original'
      });

      await contextManager.setVariable('key', 'original');

      const snapshot = contextManager.createSnapshot();

      // Modify context
      await contextManager.addMessage({
        role: Role.User,
        content: 'Modified'
      });

      await contextManager.setVariable('key', 'modified');

      // Restore snapshot
      await contextManager.restoreSnapshot(snapshot);

      const messages = contextManager.getMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe('Original');

      expect(contextManager.getVariable('key')).toBe('original');
    });
  });

  describe('summary and stats', () => {
    it('should generate conversation summary', async () => {
      await contextManager.addMessage({ role: Role.User, content: 'User message' });
      await contextManager.addMessage({ role: Role.Assistant, content: 'Assistant message' });

      await contextManager.setProject({
        path: '/project',
        name: 'MyProject',
        type: 'embedded'
      });

      const summary = contextManager.getSummary();

      expect(summary).toContain('Conversation: 2 messages');
      expect(summary).toContain('User: 1, Assistant: 1');
      expect(summary).toContain('Path: /project');
      expect(summary).toContain('Name: MyProject');
      expect(summary).toContain('Type: embedded');
    });

    it('should get context stats', () => {
      const stats = contextManager.getStats();

      expect(stats.messageCount).toBe(0);
      expect(stats.variableCount).toBe(0);
      expect(stats.hasProject).toBe(false);
      expect(stats.isDirty).toBe(false);
    });
  });

  describe('export and import', () => {
    it('should export and import state', async () => {
      await contextManager.addMessage({
        role: Role.User,
        content: 'Test'
      });

      await contextManager.setProject({
        path: '/test',
        name: 'TestProject'
      });

      await contextManager.setVariable('var', 'value');

      const exported = contextManager.export();

      const newManager = new ContextManager({
        persistPath: testPersistPath,
        autoSave: false
      });

      await newManager.import(exported);

      expect(newManager.getMessages()).toHaveLength(1);
      expect(newManager.getProject()?.path).toBe('/test');
      expect(newManager.getVariable('var')).toBe('value');
    });
  });

  describe('reset', () => {
    it('should clear all data and remove persistence', async () => {
      await contextManager.addMessage({
        role: Role.User,
        content: 'Test'
      });

      await contextManager.save();

      await contextManager.reset();

      expect(contextManager.getMessages()).toHaveLength(0);
      expect(contextManager.getProject()).toBeUndefined();

      // File should be deleted
      const exists = await fs.access(join(testPersistPath, 'context.json'))
        .then(() => true)
        .catch(() => false);

      expect(exists).toBe(false);
    });
  });

  describe('auto-save', () => {
    it('should auto-save when enabled', async () => {
      const autoManager = new ContextManager({
        persistPath: testPersistPath,
        autoSave: true
      });

      await autoManager.addMessage({
        role: Role.User,
        content: 'Auto-save test'
      });

      // Wait a bit for async save
      await new Promise(resolve => setTimeout(resolve, 100));

      const newManager = new ContextManager({
        persistPath: testPersistPath,
        autoSave: false
      });

      await newManager.load();

      expect(newManager.getMessages()).toHaveLength(1);
      expect(newManager.getMessages()[0].content).toBe('Auto-save test');
    });
  });
});
