/**
 * Tests for TUI Integration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TUIManager } from '../src/tui.js';
import { ScreenManager } from '@devboost/tui';
import { Agent, ProcessResult } from '@devboost/core';

describe('TUIManager', () => {
  let tuiManager: TUIManager;
  let mockScreenManager: ScreenManager;
  let mockAgent: Agent;

  beforeEach(() => {
    // Create minimal mock screen manager
    mockScreenManager = {
      screen: {
        render: vi.fn(),
        key: vi.fn()
      },
      render: vi.fn(),
      registerKey: vi.fn(),
      destroy: vi.fn()
    } as unknown as ScreenManager;

    mockAgent = {
      process: vi.fn(),
      getContext: vi.fn(),
      shutdown: vi.fn()
    } as unknown as Agent;

    tuiManager = new TUIManager(mockScreenManager, mockAgent);
  });

  describe('constructor', () => {
    it('should create TUI manager with screen manager and agent', () => {
      expect(tuiManager).toBeDefined();
    });

    it('should initialize conversation history', () => {
      expect(tuiManager.getConversationHistory()).toEqual([]);
    });
  });

  describe('displayMessage', () => {
    it('should add user message to history', () => {
      tuiManager.displayMessage('user', 'Hello, world!');

      const history = tuiManager.getConversationHistory();
      expect(history).toHaveLength(1);
      expect(history[0]).toEqual({
        role: 'user',
        content: 'Hello, world!',
        timestamp: expect.any(String)
      });
    });

    it('should add assistant message to history', () => {
      tuiManager.displayMessage('assistant', 'Hi there!');

      const history = tuiManager.getConversationHistory();
      expect(history).toHaveLength(1);
      expect(history[0]).toEqual({
        role: 'assistant',
        content: 'Hi there!',
        timestamp: expect.any(String)
      });
    });

    it('should add system message to history', () => {
      tuiManager.displayMessage('system', 'System initialized');

      const history = tuiManager.getConversationHistory();
      expect(history).toHaveLength(1);
      expect(history[0]).toEqual({
        role: 'system',
        content: 'System initialized',
        timestamp: expect.any(String)
      });
    });

    it('should add tool message to history', () => {
      tuiManager.displayMessage('tool', 'Executing build...');

      const history = tuiManager.getConversationHistory();
      expect(history).toHaveLength(1);
      expect(history[0]).toEqual({
        role: 'tool',
        content: 'Executing build...',
        timestamp: expect.any(String)
      });
    });

    it('should preserve message order', () => {
      tuiManager.displayMessage('user', 'Message 1');
      tuiManager.displayMessage('assistant', 'Response 1');
      tuiManager.displayMessage('user', 'Message 2');

      const history = tuiManager.getConversationHistory();
      expect(history).toHaveLength(3);
      expect(history[0].content).toBe('Message 1');
      expect(history[1].content).toBe('Response 1');
      expect(history[2].content).toBe('Message 2');
    });
  });

  describe('displayToolExecution', () => {
    it('should display tool execution start', () => {
      tuiManager.displayToolExecution('build', 'starting');

      const history = tuiManager.getConversationHistory();
      expect(history.length).toBeGreaterThan(0);
      expect(history[history.length - 1].role).toBe('tool');
      expect(history[history.length - 1].content).toContain('build');
      expect(history[history.length - 1].content).toContain('Starting tool execution');
    });

    it('should display tool execution success', () => {
      tuiManager.displayToolExecution('build', 'success', { output: 'Build successful' });

      const history = tuiManager.getConversationHistory();
      const lastMessage = history[history.length - 1];
      expect(lastMessage.role).toBe('tool');
      expect(lastMessage.content).toContain('success');
    });

    it('should display tool execution error', () => {
      tuiManager.displayToolExecution('build', 'error', new Error('Build failed'));

      const history = tuiManager.getConversationHistory();
      const lastMessage = history[history.length - 1];
      expect(lastMessage.role).toBe('tool');
      expect(lastMessage.content).toContain('failed');
      expect(lastMessage.content).toContain('Build failed');
    });
  });

  describe('updateTaskList', () => {
    it('should update task list with new tasks', () => {
      const tasks = [
        { id: '1', content: 'Task 1', status: 'pending' },
        { id: '2', content: 'Task 2', status: 'in_progress' }
      ];

      tuiManager.updateTaskList(tasks);

      const currentTasks = tuiManager.getCurrentTasks();
      expect(currentTasks).toEqual(tasks);
    });

    it('should clear previous tasks when updating', () => {
      const tasks1 = [
        { id: '1', content: 'Task 1', status: 'pending' }
      ];

      tuiManager.updateTaskList(tasks1);

      const tasks2 = [
        { id: '2', content: 'Task 2', status: 'pending' }
      ];

      tuiManager.updateTaskList(tasks2);

      const currentTasks = tuiManager.getCurrentTasks();
      expect(currentTasks).toEqual(tasks2);
      expect(currentTasks).toHaveLength(1);
    });
  });

  describe('handleAgentResponse', () => {
    it('should display agent response with tool execution', async () => {
      const mockResponse: ProcessResult = {
        response: 'This is a test response',
        toolUsed: 'build',
        toolResult: { success: true, data: { output: 'Build successful' } },
        metadata: { intent: 'build', confidence: 0.9 }
      };

      await tuiManager.handleAgentResponse(mockResponse);

      const history = tuiManager.getConversationHistory();
      expect(history.length).toBeGreaterThan(0);

      // Should have assistant response
      const assistantMessage = history.find(m => m.role === 'assistant');
      expect(assistantMessage).toBeDefined();
      expect(assistantMessage?.content).toBe('This is a test response');
    });

    it('should display error if tool execution failed', async () => {
      const mockResponse: ProcessResult = {
        response: 'Build failed',
        toolResult: { success: false, error: 'Compilation error' }
      };

      await tuiManager.handleAgentResponse(mockResponse);

      const history = tuiManager.getConversationHistory();
      const assistantMessage = history.find(m => m.role === 'assistant');
      expect(assistantMessage).toBeDefined();
      expect(assistantMessage?.content).toBe('Build failed');
    });
  });

  describe('getConversationHistory', () => {
    it('should return empty history initially', () => {
      const history = tuiManager.getConversationHistory();
      expect(history).toEqual([]);
    });

    it('should return copy of history (not reference)', () => {
      tuiManager.displayMessage('user', 'Message 1');
      const history1 = tuiManager.getConversationHistory();
      const history2 = tuiManager.getConversationHistory();

      expect(history1).not.toBe(history2);
      expect(history1).toEqual(history2);
    });
  });

  describe('clearConversation', () => {
    it('should clear conversation history', () => {
      tuiManager.displayMessage('user', 'Message 1');
      tuiManager.displayMessage('assistant', 'Response 1');

      expect(tuiManager.getConversationHistory()).toHaveLength(2);

      tuiManager.clearConversation();

      expect(tuiManager.getConversationHistory()).toEqual([]);
    });
  });

  describe('showStatus', () => {
    it('should display status message', () => {
      tuiManager.showStatus('ready', 'Ready for input');

      const status = tuiManager.getCurrentStatus();
      expect(status).toEqual({
        state: 'ready',
        message: 'Ready for input'
      });
    });

    it('should update status to processing', () => {
      tuiManager.showStatus('processing', 'Processing your request...');

      const status = tuiManager.getCurrentStatus();
      expect(status.state).toBe('processing');
    });

    it('should update status to error', () => {
      tuiManager.showStatus('error', 'An error occurred');

      const status = tuiManager.getCurrentStatus();
      expect(status.state).toBe('error');
    });
  });

  describe('getCurrentTasks', () => {
    it('should return current tasks', () => {
      const tasks = [
        { id: '1', content: 'Task 1', status: 'pending' }
      ];

      tuiManager.updateTaskList(tasks);

      expect(tuiManager.getCurrentTasks()).toEqual(tasks);
    });

    it('should return empty array if no tasks', () => {
      expect(tuiManager.getCurrentTasks()).toEqual([]);
    });

    it('should return copy of tasks (not reference)', () => {
      const tasks = [
        { id: '1', content: 'Task 1', status: 'pending' }
      ];

      tuiManager.updateTaskList(tasks);
      const tasks1 = tuiManager.getCurrentTasks();
      const tasks2 = tuiManager.getCurrentTasks();

      expect(tasks1).not.toBe(tasks2);
      expect(tasks1).toEqual(tasks2);
    });
  });

  describe('getCurrentStatus', () => {
    it('should return default status', () => {
      const status = tuiManager.getCurrentStatus();
      expect(status).toEqual({
        state: 'idle',
        message: ''
      });
    });

    it('should return copy of status (not reference)', () => {
      tuiManager.showStatus('ready', 'Ready');
      const status1 = tuiManager.getCurrentStatus();
      const status2 = tuiManager.getCurrentStatus();

      expect(status1).not.toBe(status2);
      expect(status1).toEqual(status2);
    });
  });

  describe('destroy', () => {
    it('should reset state', () => {
      tuiManager.displayMessage('user', 'Message 1');
      tuiManager.showStatus('ready', 'Ready');
      tuiManager.updateTaskList([{ id: '1', content: 'Task 1', status: 'pending' }]);

      tuiManager.destroy();

      expect(tuiManager.isInitialized()).toBe(false);
      expect(tuiManager.getConversationHistory()).toEqual([]);
      expect(tuiManager.getCurrentTasks()).toEqual([]);
      expect(tuiManager.getCurrentStatus()).toEqual({ state: 'idle', message: '' });
    });
  });
});
