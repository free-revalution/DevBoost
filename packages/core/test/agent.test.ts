/**
 * Tests for DevBoost Agent
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Agent } from '../src/agent.js';
import { Role } from '../src/types.js';

describe('Agent', () => {
  const testPersistPath = '/tmp/devboost-test-agent';
  let agent: Agent;

  beforeEach(async () => {
    // Clean up any existing test data
    const { promises: fs } = await import('fs');
    try {
      await fs.rm(testPersistPath, { recursive: true, force: true });
    } catch (error) {
      // Ignore
    }

    agent = new Agent({
      config: {
        llmProvider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022'
      },
      context: {
        persistPath: testPersistPath,
        autoSave: false
      }
    });

    await agent.initialize();
  });

  afterEach(async () => {
    try {
      await agent.shutdown();
    } catch (error) {
      // Ignore
    }

    // Clean up test data
    const { promises: fs } = await import('fs');
    try {
      await fs.rm(testPersistPath, { recursive: true, force: true });
    } catch (error) {
      // Ignore
    }
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      const newAgent = new Agent({
        config: {
          llmProvider: 'anthropic',
          model: 'claude-3-5-sonnet-20241022'
        }
      });

      await newAgent.initialize();
      await newAgent.shutdown();

      expect(true).toBe(true); // If we get here, initialization succeeded
    });

    it('should not initialize twice', async () => {
      await agent.initialize();
      await agent.initialize(); // Should not throw

      expect(true).toBe(true);
    });
  });

  describe('process', () => {
    it('should process a simple query', async () => {
      const result = await agent.process('What is the status?');

      expect(result.response).toBeDefined();
      expect(typeof result.response).toBe('string');
    });

    it('should add messages to context', async () => {
      await agent.process('Hello');

      const messages = agent.getContext().getMessages();
      expect(messages).toHaveLength(2); // User + Assistant
      expect(messages[0].role).toBe(Role.User);
      expect(messages[0].content).toBe('Hello');
      expect(messages[1].role).toBe(Role.Assistant);
    });

    it('should parse build intent', async () => {
      const result = await agent.process('Build the project');

      expect(result.metadata?.intent).toBeDefined();
      expect(result.response).toBeDefined();
    });

    it('should parse flash intent', async () => {
      const result = await agent.process('Flash the firmware');

      expect(result.metadata?.intent).toBeDefined();
      expect(result.response).toBeDefined();
    });

    it('should parse config intent', async () => {
      const result = await agent.process('Set timeout to 5000');

      expect(result.metadata?.intent).toBeDefined();
      expect(result.response).toBeDefined();
    });
  });

  describe('tool execution', () => {
    it('should execute config tool', async () => {
      const result = await agent.process('Config list');

      expect(result.response).toBeDefined();
    });

    it('should handle tool errors gracefully', async () => {
      // Try to build a non-existent project
      const result = await agent.process('Build /nonexistent/project');

      expect(result.response).toBeDefined();
      // Should not throw, should return an error message
    });
  });

  describe('context management', () => {
    it('should maintain conversation context', async () => {
      await agent.process('My name is Alice');
      await agent.process('What is my name?');

      const messages = agent.getContext().getMessages();
      expect(messages.length).toBeGreaterThanOrEqual(4); // 2 user + 2 assistant
    });

    it('should provide access to context manager', () => {
      const context = agent.getContext();

      expect(context).toBeDefined();
      expect(context.getMessages()).toHaveLength(0);
    });

    it('should provide access to tool registry', () => {
      const registry = agent.getToolRegistry();

      expect(registry).toBeDefined();
      expect(registry.list().length).toBeGreaterThan(0);
    });

    it('should provide access to intent parser', () => {
      const parser = agent.getIntentParser();

      expect(parser).toBeDefined();
    });
  });

  describe('custom tools', () => {
    it('should allow registering custom tools', () => {
      const customTool = {
        name: 'custom',
        description: 'A custom tool',
        parameters: {},
        execute: async () => ({
          success: true,
          data: { result: 'custom' }
        })
      };

      agent.registerTool(customTool);

      const registry = agent.getToolRegistry();
      expect(registry.has('custom')).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle process without initialization', async () => {
      const newAgent = new Agent({
        config: {
          llmProvider: 'anthropic',
          model: 'claude-3-5-sonnet-20241022'
        }
      });

      await expect(newAgent.process('Hello')).rejects.toThrow('not initialized');
    });

    it('should handle empty messages', async () => {
      const result = await agent.process('');

      expect(result.response).toBeDefined();
    });

    it('should handle malformed messages', async () => {
      const result = await agent.process('!@#$%^&*()');

      expect(result.response).toBeDefined();
    });
  });

  describe('shutdown', () => {
    it('should shutdown cleanly', async () => {
      await agent.process('Hello');
      await agent.shutdown();

      expect(true).toBe(true); // If we get here, shutdown succeeded
    });

    it('should save context on shutdown', async () => {
      await agent.process('Hello');
      await agent.shutdown();

      // Create a new agent and verify context was saved
      const newAgent = new Agent({
        config: {
          llmProvider: 'anthropic',
          model: 'claude-3-5-sonnet-20241022'
        },
        context: {
          persistPath: testPersistPath,
          autoSave: false
        }
      });

      await newAgent.initialize();

      const messages = newAgent.getContext().getMessages();
      expect(messages.length).toBeGreaterThanOrEqual(2);

      await newAgent.shutdown();
    });

    it('should handle multiple shutdowns', async () => {
      await agent.shutdown();
      await agent.shutdown(); // Should not throw

      expect(true).toBe(true);
    });
  });

  describe('integration scenarios', () => {
    it('should handle a complete workflow', async () => {
      // Initialize project
      await agent.process('Initialize project at /tmp/test');

      // Build (will fail since project doesn't exist, but should handle gracefully)
      await agent.process('Build the project');

      // Check context
      const messages = agent.getContext().getMessages();
      expect(messages.length).toBeGreaterThan(0);
    });

    it('should maintain context across multiple interactions', async () => {
      await agent.process('I am working on an STM32 project');
      await agent.process('What build tools can I use?');
      await agent.process('How do I flash the firmware?');

      const messages = agent.getContext().getMessages();
      expect(messages.length).toBeGreaterThanOrEqual(6); // 3 user + 3 assistant
    });
  });

  describe('metadata', () => {
    it('should include metadata in process result', async () => {
      const result = await agent.process('Build the project');

      expect(result.metadata).toBeDefined();
      expect(result.metadata?.intent).toBeDefined();
      expect(result.metadata?.confidence).toBeDefined();
    });

    it('should include tool information when tool is used', async () => {
      const result = await agent.process('Config list');

      expect(result.toolUsed).toBeDefined();
    });

    it('should include confidence score', async () => {
      const result = await agent.process('Detect devices');

      expect(result.metadata?.confidence).toBeDefined();
      expect(result.metadata?.confidence).toBeGreaterThanOrEqual(0);
      expect(result.metadata?.confidence).toBeLessThanOrEqual(1);
    });
  });
});
