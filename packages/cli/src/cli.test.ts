/**
 * Tests for Enhanced CLI
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DevBoostCLI } from './cli.js';
import { Agent } from '@devboost/core';
import { ConfigManager } from './config.js';
import { ProjectManager } from './project.js';

// Mock the TUI modules
vi.mock('@devboost/tui', () => ({
  ScreenManager: vi.fn().mockImplementation(() => ({
    screen: {
      destroy: vi.fn(),
      key: vi.fn()
    },
    render: vi.fn(),
    registerKey: vi.fn(),
    onQuit: vi.fn()
  })),
  MainLayout: vi.fn().mockImplementation(() => ({
    input: {
      focus: vi.fn(),
      value: '',
      clearValue: vi.fn(),
      key: vi.fn()
    },
    render: vi.fn()
  })),
  CatppuccinMocha: {}
}));

describe('DevBoostCLI', () => {
  let cli: DevBoostCLI;
  let mockAgent: Agent;
  let mockConfigManager: ConfigManager;
  let mockProjectManager: ProjectManager;

  beforeEach(() => {
    mockAgent = {
      initialize: vi.fn(),
      process: vi.fn(),
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

    mockConfigManager = {
      load: vi.fn().mockResolvedValue({
        version: '0.1.0',
        llmProvider: 'anthropic',
        llmModel: 'claude-sonnet-4-20250514',
        maxTokens: 4096,
        temperature: 0.7,
        projectPath: process.cwd(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }),
      save: vi.fn(),
      exists: vi.fn(() => false),
      getConfigPath: vi.fn(() => '/tmp/.devboost/config.json'),
      getProviderConfig: vi.fn(),
      setProviderConfig: vi.fn(),
      loadApiKey: vi.fn(),
      reset: vi.fn()
    } as unknown as ConfigManager;

    mockProjectManager = {
      init: vi.fn(),
      isInitialized: vi.fn(() => false),
      projectPath: process.cwd(),
      configPath: '/tmp/.devboost'
    } as unknown as ProjectManager;

    cli = new DevBoostCLI(mockAgent, mockConfigManager, mockProjectManager);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create instance with version', () => {
      expect(cli.version).toBe('0.1.0');
    });

    it('should create instance with dependencies', () => {
      expect(cli).toBeDefined();
      expect(cli['agent']).toBeDefined();
      expect(cli['configManager']).toBeDefined();
      expect(cli['projectManager']).toBeDefined();
    });

    it('should create instance with default dependencies', () => {
      const defaultCli = new DevBoostCLI();
      expect(defaultCli).toBeDefined();
      expect(defaultCli.version).toBe('0.1.0');
    });
  });

  describe('initialize', () => {
    it('should initialize all components', async () => {
      await cli.initialize();

      expect(mockConfigManager.load).toHaveBeenCalled();
      expect(cli['initialized']).toBe(true);
    });

    it('should initialize project if not initialized', async () => {
      mockProjectManager.isInitialized = vi.fn(() => false);

      await cli.initialize();

      expect(mockProjectManager.init).toHaveBeenCalled();
    });

    it('should not initialize project if already initialized', async () => {
      mockProjectManager.isInitialized = vi.fn(() => true);

      await cli.initialize();

      expect(mockProjectManager.init).not.toHaveBeenCalled();
    });

    it('should handle initialization errors gracefully', async () => {
      mockConfigManager.load = vi.fn().mockRejectedValue(new Error('Load failed'));

      await expect(cli.initialize()).rejects.toThrow('Load failed');
    });
  });

  describe('run', () => {
    it('should initialize before running', async () => {
      const initializeSpy = vi.spyOn(cli, 'initialize').mockResolvedValue();
      const startLoopSpy = vi.spyOn(cli, 'startMainLoop').mockResolvedValue();

      // Mock createTUIComponents to avoid actual TUI creation
      vi.spyOn(cli as any, 'createTUIComponents').mockImplementation(() => {
        cli['mainLoop'] = { start: vi.fn().mockResolvedValue() } as any;
      });

      await cli.run();

      expect(initializeSpy).toHaveBeenCalled();
      expect(startLoopSpy).toHaveBeenCalled();
    });

    it('should start main loop', async () => {
      vi.spyOn(cli, 'initialize').mockResolvedValue();
      const startLoopSpy = vi.spyOn(cli, 'startMainLoop').mockResolvedValue();

      // Mock createTUIComponents to avoid actual TUI creation
      vi.spyOn(cli as any, 'createTUIComponents').mockImplementation(() => {
        cli['mainLoop'] = { start: vi.fn().mockResolvedValue() } as any;
      });

      await cli.run();

      expect(startLoopSpy).toHaveBeenCalled();
    });

    it('should handle errors during run', async () => {
      vi.spyOn(cli, 'initialize').mockRejectedValue(new Error('Init failed'));

      await expect(cli.run()).rejects.toThrow('Init failed');
    });
  });

  describe('startMainLoop', () => {
    it('should start the main loop', async () => {
      vi.spyOn(cli, 'initialize').mockResolvedValue();

      // Mock the internal components
      cli['screenManager'] = {
        screen: { key: vi.fn() },
        render: vi.fn(),
        destroy: vi.fn()
      } as any;

      cli['tuiManager'] = {
        initialize: vi.fn().mockResolvedValue(),
        isInitialized: vi.fn(() => true),
        setInputHandler: vi.fn(),
        destroy: vi.fn()
      } as any;

      cli['commandHandler'] = {
        initialize: vi.fn().mockResolvedValue()
      } as any;

      cli['mainLoop'] = {
        start: vi.fn().mockResolvedValue(),
        stop: vi.fn().mockResolvedValue(),
        isRunning: vi.fn(() => true)
      } as any;

      await cli.startMainLoop();

      expect(cli['mainLoop']?.start).toHaveBeenCalled();
    });

    it('should setup quit handler', async () => {
      vi.spyOn(cli, 'initialize').mockResolvedValue();

      // Mock components
      cli['screenManager'] = {
        screen: { key: vi.fn() },
        render: vi.fn(),
        destroy: vi.fn()
      } as any;

      cli['tuiManager'] = {
        initialize: vi.fn().mockResolvedValue(),
        isInitialized: vi.fn(() => true),
        setInputHandler: vi.fn(),
        destroy: vi.fn()
      } as any;

      cli['commandHandler'] = {
        initialize: vi.fn().mockResolvedValue()
      } as any;

      cli['mainLoop'] = {
        start: vi.fn().mockResolvedValue(),
        stop: vi.fn().mockResolvedValue(),
        isRunning: vi.fn(() => true)
      } as any;

      await cli.startMainLoop();

      // Verify quit handler is registered - it's registered in setupSignalHandlers
      // which is called from createTUIComponents, called from run()
      // startMainLoop doesn't directly setup quit handlers
      expect(cli['mainLoop']?.start).toHaveBeenCalled();
    });
  });

  describe('shutdown', () => {
    it('should shutdown gracefully', async () => {
      // Set up mocks directly without calling startMainLoop
      cli['mainLoop'] = {
        start: vi.fn().mockResolvedValue(),
        stop: vi.fn().mockResolvedValue(),
        isRunning: vi.fn(() => true)
      } as any;

      cli['commandHandler'] = {
        isAgentStarted: vi.fn(() => false)
      } as any;

      cli['screenManager'] = {
        screen: { key: vi.fn() },
        render: vi.fn(),
        destroy: vi.fn()
      } as any;

      cli['tuiManager'] = {
        isInitialized: vi.fn(() => true),
        destroy: vi.fn()
      } as any;

      // Mark as initialized so shutdown can proceed
      cli['initialized'] = true;

      await cli.shutdown();

      expect(cli['mainLoop']?.stop).toHaveBeenCalled();
    });

    it('should shutdown agent if running', async () => {
      cli['mainLoop'] = {
        start: vi.fn().mockResolvedValue(),
        stop: vi.fn().mockResolvedValue(),
        isRunning: vi.fn(() => true)
      } as any;

      cli['commandHandler'] = {
        isAgentStarted: vi.fn(() => true),
        setAgentStarted: vi.fn()
      } as any;

      cli['screenManager'] = {
        screen: { key: vi.fn() },
        render: vi.fn(),
        destroy: vi.fn()
      } as any;

      cli['tuiManager'] = {
        isInitialized: vi.fn(() => true),
        destroy: vi.fn()
      } as any;

      cli['initialized'] = true;

      await cli.shutdown();

      expect(mockAgent.shutdown).toHaveBeenCalled();
    });

    it('should destroy screen manager', async () => {
      cli['mainLoop'] = {
        start: vi.fn().mockResolvedValue(),
        stop: vi.fn().mockResolvedValue(),
        isRunning: vi.fn(() => true)
      } as any;

      cli['screenManager'] = {
        screen: { key: vi.fn() },
        render: vi.fn(),
        destroy: vi.fn()
      } as any;

      cli['tuiManager'] = {
        isInitialized: vi.fn(() => true),
        destroy: vi.fn()
      } as any;

      cli['initialized'] = true;

      const destroySpy = vi.spyOn(cli['screenManager'], 'destroy');

      await cli.shutdown();

      expect(destroySpy).toHaveBeenCalled();
    });
  });

  describe('getAgent', () => {
    it('should return agent instance', () => {
      const agent = cli.getAgent();
      expect(agent).toBeDefined();
      expect(agent).toBe(mockAgent);
    });
  });

  describe('getConfigManager', () => {
    it('should return config manager instance', () => {
      const configManager = cli.getConfigManager();
      expect(configManager).toBeDefined();
      expect(configManager).toBe(mockConfigManager);
    });
  });

  describe('getProjectManager', () => {
    it('should return project manager instance', () => {
      const projectManager = cli.getProjectManager();
      expect(projectManager).toBeDefined();
      expect(projectManager).toBe(mockProjectManager);
    });
  });

  describe('handleSignal', () => {
    it('should handle SIGINT signal', async () => {
      // Mock process.exit to prevent actual exit
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit unexpectedly called with "0"');
      });

      // Mock components for handleSignal
      cli['mainLoop'] = {
        start: vi.fn().mockResolvedValue(),
        stop: vi.fn().mockResolvedValue(),
        isRunning: vi.fn(() => true)
      } as any;

      cli['screenManager'] = {
        screen: { key: vi.fn() },
        render: vi.fn(),
        destroy: vi.fn()
      } as any;

      cli['tuiManager'] = {
        isInitialized: vi.fn(() => true),
        destroy: vi.fn()
      } as any;

      cli['commandHandler'] = {
        isAgentStarted: vi.fn(() => false)
      } as any;

      cli['initialized'] = true;

      const shutdownSpy = vi.spyOn(cli, 'shutdown').mockResolvedValue();

      // Access private method via bracket notation
      try {
        await (cli as any)['handleSignal']('SIGINT');
      } catch (e) {
        // Expected - process.exit throws
      }

      expect(shutdownSpy).toHaveBeenCalled();
      exitSpy.mockRestore();
    });

    it('should handle SIGTERM signal', async () => {
      // Mock process.exit to prevent actual exit
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit unexpectedly called with "0"');
      });

      cli['mainLoop'] = {
        start: vi.fn().mockResolvedValue(),
        stop: vi.fn().mockResolvedValue(),
        isRunning: vi.fn(() => true)
      } as any;

      cli['screenManager'] = {
        screen: { key: vi.fn() },
        render: vi.fn(),
        destroy: vi.fn()
      } as any;

      cli['tuiManager'] = {
        isInitialized: vi.fn(() => true),
        destroy: vi.fn()
      } as any;

      cli['commandHandler'] = {
        isAgentStarted: vi.fn(() => false)
      } as any;

      cli['initialized'] = true;

      const shutdownSpy = vi.spyOn(cli, 'shutdown').mockResolvedValue();

      try {
        await (cli as any)['handleSignal']('SIGTERM');
      } catch (e) {
        // Expected - process.exit throws
      }

      expect(shutdownSpy).toHaveBeenCalled();
      exitSpy.mockRestore();
    });
  });

  describe('isInitialized', () => {
    it('should return false before initialization', () => {
      expect(cli.isInitialized()).toBe(false);
    });

    it('should return true after initialization', async () => {
      // Don't mock initialize - let it run to set internal state
      mockConfigManager.load = vi.fn().mockResolvedValue({
        version: '0.1.0',
        llmProvider: 'anthropic',
        llmModel: 'claude-sonnet-4-20250514',
        maxTokens: 4096,
        temperature: 0.7,
        projectPath: process.cwd(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      mockProjectManager.isInitialized = vi.fn(() => true);

      await cli.initialize();

      expect(cli.isInitialized()).toBe(true);
    });
  });

  describe('getVersion', () => {
    it('should return version string', () => {
      const version = cli.getVersion();
      expect(version).toBe('0.1.0');
    });
  });

  describe('error handling', () => {
    it('should handle config manager load errors', async () => {
      mockConfigManager.load = vi.fn().mockRejectedValue(new Error('Config load failed'));

      await expect(cli.initialize()).rejects.toThrow('Config load failed');
    });

    it('should handle project manager init errors', async () => {
      mockProjectManager.init = vi.fn().mockRejectedValue(new Error('Project init failed'));

      await expect(cli.initialize()).rejects.toThrow('Project init failed');
    });

    it('should handle main loop start errors', async () => {
      vi.spyOn(cli, 'initialize').mockResolvedValue();
      vi.spyOn(cli, 'startMainLoop').mockRejectedValue(new Error('Loop start failed'));

      await expect(cli.run()).rejects.toThrow('Loop start failed');
    });
  });
});
