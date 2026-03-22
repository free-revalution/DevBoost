import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CommandHandler, ParsedCommand } from './commands.js';
import { ConfigManager } from './config.js';
import { Agent } from '@devboost/core';
import { TUIManager } from './tui.js';

describe('CommandHandler', () => {
  let handler: CommandHandler;
  let mockConfigManager: ConfigManager;
  let mockAgent: Agent;
  let mockTUIManager: TUIManager;

  beforeEach(() => {
    mockConfigManager = {
      load: vi.fn(),
      save: vi.fn(),
      getProviderConfig: vi.fn(),
      setProviderConfig: vi.fn(),
      loadApiKey: vi.fn(),
      reset: vi.fn()
    } as unknown as ConfigManager;

    mockAgent = {
      process: vi.fn(),
      initialize: vi.fn(),
      getContext: vi.fn(() => ({
        getMessageCount: vi.fn(() => 0),
        getMessages: vi.fn(() => []),
        clear: vi.fn(),
        getSize: vi.fn(() => 0)
      })),
      shutdown: vi.fn(),
      getToolRegistry: vi.fn(() => ({
        list: vi.fn(() => [])
      }))
    } as unknown as Agent;

    mockTUIManager = {
      displayMessage: vi.fn(),
      showStatus: vi.fn(),
      clearConversation: vi.fn(),
      getConversationHistory: vi.fn(() => [])
    } as unknown as TUIManager;

    handler = new CommandHandler(mockConfigManager, mockAgent, mockTUIManager);
  });

  describe('parse', () => {
    it('should return null for non-command input', () => {
      expect(handler.parse('hello world')).toBeNull();
    });

    it('should parse basic command', () => {
      const result = handler.parse('/help');
      expect(result).toEqual({ command: 'help', action: undefined, args: [] });
    });

    it('should parse command with action', () => {
      const result = handler.parse('/provider add');
      expect(result).toEqual({ command: 'provider', action: 'add', args: [] });
    });

    it('should parse command with action and args', () => {
      const result = handler.parse('/provider add anthropic');
      expect(result).toEqual({ command: 'provider', action: 'add', args: ['anthropic'] });
    });

    it('should parse command with multiple args', () => {
      const result = handler.parse('/context save my-context');
      expect(result).toEqual({ command: 'context', action: 'save', args: ['my-context'] });
    });

    it('should return null for unknown command', () => {
      expect(handler.parse('/unknown')).toBeNull();
    });

    it('should handle extra whitespace', () => {
      const result = handler.parse('/agent   start');
      expect(result).toEqual({ command: 'agent', action: 'start', args: [] });
    });
  });

  describe('execute', () => {
    it('should execute help command', async () => {
      const result = await handler.execute({ command: 'help', action: undefined, args: [] });
      expect(result).toContain('Available commands');
      expect(result).toContain('/help');
      expect(result).toContain('/agent');
      expect(result).toContain('/context');
      expect(result).toContain('/tools');
      expect(result).toContain('/history');
    });

    it('should execute agent start command', async () => {
      const result = await handler.execute({ command: 'agent', action: 'start', args: [] });
      expect(result).toContain('Agent');
      expect(result).toContain('started');
    });

    it('should execute agent stop command', async () => {
      // Set agent as started first
      handler['agentStarted'] = true;
      const result = await handler.execute({ command: 'agent', action: 'stop', args: [] });
      expect(result).toContain('Agent');
      expect(result).toContain('stopped');
    });

    it('should execute agent status command', async () => {
      const result = await handler.execute({ command: 'agent', action: 'status', args: [] });
      expect(result).toContain('Agent Status');
    });

    it('should execute context clear command', async () => {
      const result = await handler.execute({ command: 'context', action: 'clear', args: [] });
      expect(result).toContain('Context');
      expect(result).toContain('cleared');
      expect(mockTUIManager.clearConversation).toHaveBeenCalled();
    });

    it('should execute context save command', async () => {
      const result = await handler.execute({ command: 'context', action: 'save', args: ['my-context'] });
      expect(result).toContain('Context');
      expect(result).toContain('saved');
      expect(result).toContain('my-context');
    });

    it('should execute context load command', async () => {
      const result = await handler.execute({ command: 'context', action: 'load', args: ['my-context'] });
      expect(result).toContain('Context');
      expect(result).toContain('loaded');
      expect(result).toContain('my-context');
    });

    it('should execute tools command', async () => {
      const result = await handler.execute({ command: 'tools', action: undefined, args: [] });
      expect(result).toContain('Available Tools');
    });

    it('should execute history command', async () => {
      const result = await handler.execute({ command: 'history', action: undefined, args: [] });
      expect(result).toContain('Conversation History');
    });

    it('should execute clear command', async () => {
      const result = await handler.execute({ command: 'clear', action: undefined, args: [] });
      expect(result).toContain('cleared');
    });

    it('should return usage for command without action', async () => {
      const result = await handler.execute({ command: 'agent', action: undefined, args: [] });
      expect(result).toContain('Usage');
    });

    it('should return error for unknown command', async () => {
      const result = await handler.execute({ command: 'unknown', action: undefined, args: [] });
      expect(result).toContain('Unknown command');
    });
  });

  describe('getHelp', () => {
    it('should return help text', () => {
      const help = handler.getHelp();
      expect(help).toContain('Available commands');
      expect(help).toContain('/agent');
      expect(help).toContain('/context');
      expect(help).toContain('/tools');
      expect(help).toContain('/history');
      expect(help).toContain('/clear');
    });
  });

  describe('handleAgentCommand', () => {
    it('should handle agent start', async () => {
      const result = await handler.handleAgentCommand('start', []);
      expect(result).toContain('started');
    });

    it('should handle agent stop', async () => {
      // Set agent as started first
      handler['agentStarted'] = true;
      const result = await handler.handleAgentCommand('stop', []);
      expect(result).toContain('stopped');
      expect(mockAgent.shutdown).toHaveBeenCalled();
    });

    it('should handle agent status', async () => {
      const result = await handler.handleAgentCommand('status', []);
      expect(result).toContain('Status');
    });
  });

  describe('handleContextCommand', () => {
    it('should handle context clear', async () => {
      const result = await handler.handleContextCommand('clear', []);
      expect(result).toContain('cleared');
      expect(mockTUIManager.clearConversation).toHaveBeenCalled();
    });

    it('should handle context save', async () => {
      const result = await handler.handleContextCommand('save', ['my-context']);
      expect(result).toContain('saved');
      expect(result).toContain('my-context');
    });

    it('should handle context load', async () => {
      const result = await handler.handleContextCommand('load', ['my-context']);
      expect(result).toContain('loaded');
      expect(result).toContain('my-context');
    });
  });

  describe('handleToolsCommand', () => {
    it('should list available tools', async () => {
      const result = await handler.handleToolsCommand();
      expect(result).toContain('Available Tools');
    });
  });

  describe('handleHistoryCommand', () => {
    it('should show conversation history', async () => {
      const result = await handler.handleHistoryCommand(10);
      expect(result).toContain('Conversation History');
    });
  });
});
