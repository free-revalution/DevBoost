/**
 * Tests for Main Loop
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MainLoop } from '../src/loop.js';
import { Agent } from '@devboost/core';
import { TUIManager } from '../src/tui.js';
import { CommandHandler } from '../src/commands.js';
import { ConfigManager } from '../src/config.js';

describe('MainLoop', () => {
  let mainLoop: MainLoop;
  let mockAgent: Agent;
  let mockTUIManager: TUIManager;
  let mockCommandHandler: CommandHandler;
  let mockConfigManager: ConfigManager;

  beforeEach(() => {
    mockAgent = {
      process: vi.fn(),
      initialize: vi.fn(),
      shutdown: vi.fn(),
      getContext: vi.fn(() => ({
        getMessageCount: vi.fn(() => 0),
        clear: vi.fn(),
        getSize: vi.fn(() => 0)
      })),
      getToolRegistry: vi.fn(() => ({
        list: vi.fn(() => [])
      }))
    } as unknown as Agent;

    mockTUIManager = {
      initialize: vi.fn(),
      destroy: vi.fn(),
      setInputHandler: vi.fn(),
      displayMessage: vi.fn(),
      showStatus: vi.fn(),
      handleAgentResponse: vi.fn(),
      getConversationHistory: vi.fn(() => []),
      clearConversation: vi.fn(),
      render: vi.fn(),
      isInitialized: vi.fn(() => false)
    } as unknown as TUIManager;

    mockCommandHandler = {
      parse: vi.fn(),
      execute: vi.fn(),
      isAgentStarted: vi.fn(() => false),
      setAgentStarted: vi.fn(),
      isQuitCommand: vi.fn(() => false)
    } as unknown as CommandHandler;

    mockConfigManager = {
      load: vi.fn(),
      save: vi.fn(),
      exists: vi.fn(() => false)
    } as unknown as ConfigManager;

    mainLoop = new MainLoop(mockAgent, mockTUIManager, mockCommandHandler, mockConfigManager);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create main loop with required dependencies', () => {
      expect(mainLoop).toBeDefined();
    });

    it('should initialize with stopped state', () => {
      expect(mainLoop.isRunning()).toBe(false);
    });
  });

  describe('start', () => {
    it('should start the main loop', async () => {
      mockTUIManager.isInitialized = vi.fn(() => false);
      await mainLoop.start();

      expect(mockTUIManager.initialize).toHaveBeenCalled();
      expect(mockTUIManager.setInputHandler).toHaveBeenCalled();
      expect(mainLoop.isRunning()).toBe(true);
    });

    it('should not reinitialize if already initialized', async () => {
      mockTUIManager.isInitialized = vi.fn(() => true);
      await mainLoop.start();

      expect(mockTUIManager.initialize).not.toHaveBeenCalled();
      expect(mainLoop.isRunning()).toBe(true);
    });

    it('should show ready status', async () => {
      mockTUIManager.isInitialized = vi.fn(() => false);
      await mainLoop.start();

      expect(mockTUIManager.showStatus).toHaveBeenCalledWith('ready', expect.any(String));
    });
  });

  describe('stop', () => {
    it('should stop the main loop', async () => {
      await mainLoop.start();
      await mainLoop.stop();

      expect(mainLoop.isRunning()).toBe(false);
    });

    it('should shutdown agent if running', async () => {
      mockCommandHandler.isAgentStarted = vi.fn(() => true);
      await mainLoop.start();
      await mainLoop.stop();

      expect(mockAgent.shutdown).toHaveBeenCalled();
    });

    it('should not shutdown agent if not running', async () => {
      mockCommandHandler.isAgentStarted = vi.fn(() => false);
      await mainLoop.start();
      await mainLoop.stop();

      expect(mockAgent.shutdown).not.toHaveBeenCalled();
    });

    it('should show idle status', async () => {
      await mainLoop.start();
      await mainLoop.stop();

      expect(mockTUIManager.showStatus).toHaveBeenCalledWith('idle', expect.any(String));
    });
  });

  describe('handleInput', () => {
    beforeEach(async () => {
      mockTUIManager.isInitialized = vi.fn(() => false);
      await mainLoop.start();
    });

    it('should handle empty input', async () => {
      const displayMessageSpy = vi.spyOn(mockTUIManager, 'displayMessage');
      await mainLoop.handleInput('');

      // Should not display user message for empty input
      expect(displayMessageSpy).not.toHaveBeenCalledWith('user', '');
    });

    it('should handle whitespace-only input', async () => {
      const displayMessageSpy = vi.spyOn(mockTUIManager, 'displayMessage');
      await mainLoop.handleInput('   ');

      // Should not display user message for whitespace input
      expect(displayMessageSpy).not.toHaveBeenCalledWith('user', '   ');
    });

    it('should handle user message', async () => {
      const mockResponse = {
        response: 'Test response',
        toolUsed: undefined,
        toolResult: undefined
      };
      mockAgent.process = vi.fn().mockResolvedValue(mockResponse);
      mockCommandHandler.parse = vi.fn(() => null);
      mockCommandHandler.isAgentStarted = vi.fn(() => true);

      await mainLoop.handleInput('Hello');

      expect(mockTUIManager.displayMessage).toHaveBeenCalledWith('user', 'Hello');
      expect(mockTUIManager.showStatus).toHaveBeenCalledWith('processing', expect.any(String));
      expect(mockAgent.process).toHaveBeenCalledWith('Hello');
      expect(mockTUIManager.handleAgentResponse).toHaveBeenCalledWith(mockResponse);
    });

    it('should handle command input', async () => {
      const parsedCommand = {
        command: 'help',
        action: undefined,
        args: []
      };
      mockCommandHandler.parse = vi.fn(() => parsedCommand);
      mockCommandHandler.execute = vi.fn().mockResolvedValue('Help text');

      await mainLoop.handleInput('/help');

      expect(mockCommandHandler.parse).toHaveBeenCalledWith('/help');
      expect(mockCommandHandler.execute).toHaveBeenCalledWith(parsedCommand);
      expect(mockTUIManager.displayMessage).toHaveBeenCalledWith('system', 'Help text');
    });

    it('should handle agent not started error', async () => {
      mockCommandHandler.parse = vi.fn(() => null);
      mockCommandHandler.isAgentStarted = vi.fn(() => false);

      await mainLoop.handleInput('Hello');

      // Should show error status (not displayMessage) when agent is not started
      expect(mockTUIManager.showStatus).toHaveBeenCalledWith('error', expect.stringContaining('Agent is not started'));
      expect(mockAgent.process).not.toHaveBeenCalled();
    });

    it('should handle agent process errors', async () => {
      mockCommandHandler.parse = vi.fn(() => null);
      mockCommandHandler.isAgentStarted = vi.fn(() => true);
      mockAgent.process = vi.fn().mockRejectedValue(new Error('Processing failed'));

      await mainLoop.handleInput('Hello');

      expect(mockTUIManager.displayMessage).toHaveBeenCalledWith('user', 'Hello');
      expect(mockTUIManager.showStatus).toHaveBeenCalledWith('error', expect.any(String));
    });
  });

  describe('displayResponse', () => {
    it('should display system message', () => {
      mainLoop.displayResponse('System message');

      expect(mockTUIManager.displayMessage).toHaveBeenCalledWith('system', 'System message');
    });

    it('should display error message', () => {
      mainLoop.displayResponse('Error occurred', 'error');

      expect(mockTUIManager.showStatus).toHaveBeenCalledWith('error', 'Error occurred');
    });
  });

  describe('handleAgentResponse', () => {
    it('should handle successful agent response', async () => {
      const mockResponse = {
        response: 'Success response',
        toolUsed: 'build',
        toolResult: { success: true, data: { output: 'Build successful' } },
        metadata: { intent: 'build', confidence: 0.9 }
      };

      await mainLoop.handleAgentResponse(mockResponse);

      expect(mockTUIManager.handleAgentResponse).toHaveBeenCalledWith(mockResponse);
    });

    it('should handle agent response with tool error', async () => {
      const mockResponse = {
        response: 'Build failed',
        toolResult: { success: false, error: 'Compilation error' }
      };

      await mainLoop.handleAgentResponse(mockResponse);

      expect(mockTUIManager.handleAgentResponse).toHaveBeenCalledWith(mockResponse);
    });
  });

  describe('handleCommand', () => {
    beforeEach(async () => {
      mockTUIManager.isInitialized = vi.fn(() => true);
      await mainLoop.start();
    });

    it('should execute valid command', async () => {
      const parsedCommand = {
        command: 'help',
        action: undefined,
        args: []
      };
      mockCommandHandler.parse = vi.fn(() => parsedCommand);
      mockCommandHandler.execute = vi.fn().mockResolvedValue('Help displayed');

      // handleCommand is private but needs both input and parsedCommand
      await (mainLoop as any).handleCommand('/help', parsedCommand);

      expect(mockCommandHandler.execute).toHaveBeenCalledWith(parsedCommand);
      expect(mockTUIManager.displayMessage).toHaveBeenCalledWith('system', 'Help displayed');
    });

    it('should handle command execution errors', async () => {
      const parsedCommand = {
        command: 'invalid',
        action: undefined,
        args: []
      };
      mockCommandHandler.parse = vi.fn(() => parsedCommand);
      mockCommandHandler.execute = vi.fn().mockRejectedValue(new Error('Command failed'));

      await mainLoop.handleCommand('/invalid');

      expect(mockTUIManager.displayMessage).toHaveBeenCalledWith('system', expect.stringContaining('Error'));
    });
  });

  describe('isRunning', () => {
    it('should return false initially', () => {
      expect(mainLoop.isRunning()).toBe(false);
    });

    it('should return true after start', async () => {
      mockTUIManager.isInitialized = vi.fn(() => false);
      await mainLoop.start();

      expect(mainLoop.isRunning()).toBe(true);
    });

    it('should return false after stop', async () => {
      mockTUIManager.isInitialized = vi.fn(() => false);
      await mainLoop.start();
      await mainLoop.stop();

      expect(mainLoop.isRunning()).toBe(false);
    });
  });

  describe('handleError', () => {
    it('should display error message', () => {
      const error = new Error('Test error');
      mainLoop.handleError(error);

      expect(mockTUIManager.showStatus).toHaveBeenCalledWith('error', expect.stringContaining('Test error'));
    });

    it('should handle unknown error types', () => {
      mainLoop.handleError('String error');

      expect(mockTUIManager.showStatus).toHaveBeenCalledWith('error', expect.any(String));
    });
  });

  describe('validateInput', () => {
    it('should reject empty input', () => {
      expect(mainLoop.validateInput('')).toBe(false);
    });

    it('should reject whitespace-only input', () => {
      expect(mainLoop.validateInput('   ')).toBe(false);
    });

    it('should accept valid input', () => {
      expect(mainLoop.validateInput('Hello')).toBe(true);
    });

    it('should accept command input', () => {
      expect(mainLoop.validateInput('/help')).toBe(true);
    });
  });
});
