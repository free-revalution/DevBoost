import { describe, it, expect } from 'vitest';
import { CommandHandler, ParsedCommand } from './commands.js';

describe('CommandHandler', () => {
  describe('parse', () => {
    it('should return null for non-command input', () => {
      const handler = new CommandHandler();
      expect(handler.parse('hello world')).toBeNull();
    });

    it('should parse basic command', () => {
      const handler = new CommandHandler();
      const result = handler.parse('/help');
      expect(result).toEqual({ command: 'help', action: undefined, args: [] });
    });

    it('should parse command with action', () => {
      const handler = new CommandHandler();
      const result = handler.parse('/provider add');
      expect(result).toEqual({ command: 'provider', action: 'add', args: [] });
    });

    it('should parse command with action and args', () => {
      const handler = new CommandHandler();
      const result = handler.parse('/provider add anthropic');
      expect(result).toEqual({ command: 'provider', action: 'add', args: ['anthropic'] });
    });

    it('should parse command with multiple args', () => {
      const handler = new CommandHandler();
      const result = handler.parse('/devboost init --force');
      expect(result).toEqual({ command: 'devboost', action: 'init', args: ['--force'] });
    });

    it('should return null for unknown command', () => {
      const handler = new CommandHandler();
      expect(handler.parse('/unknown')).toBeNull();
    });

    it('should handle extra whitespace', () => {
      const handler = new CommandHandler();
      const result = handler.parse('/provider   add   anthropic');
      expect(result).toEqual({ command: 'provider', action: 'add', args: ['anthropic'] });
    });
  });

  describe('execute', () => {
    it('should execute help command', async () => {
      const handler = new CommandHandler();
      const result = await handler.execute({ command: 'help', action: undefined, args: [] });
      expect(result).toContain('Available commands');
      expect(result).toContain('/help');
      expect(result).toContain('/provider');
      expect(result).toContain('/devboost');
      expect(result).toContain('/clear');
    });

    it('should execute clear command', async () => {
      const handler = new CommandHandler();
      const result = await handler.execute({ command: 'clear', action: undefined, args: [] });
      expect(result).toBe('Screen cleared.');
    });

    it('should execute provider command with action', async () => {
      const handler = new CommandHandler();
      const result = await handler.execute({ command: 'provider', action: 'add', args: ['anthropic'] });
      expect(result).toContain('Provider');
      expect(result).toContain('add');
      expect(result).toContain('anthropic');
    });

    it('should execute provider command without action', async () => {
      const handler = new CommandHandler();
      const result = await handler.execute({ command: 'provider', action: undefined, args: [] });
      expect(result).toContain('Usage');
      expect(result).toContain('/provider');
    });

    it('should execute devboost command with action', async () => {
      const handler = new CommandHandler();
      const result = await handler.execute({ command: 'devboost', action: 'init', args: [] });
      expect(result).toContain('DevBoost');
      expect(result).toContain('init');
    });

    it('should execute devboost command without action', async () => {
      const handler = new CommandHandler();
      const result = await handler.execute({ command: 'devboost', action: undefined, args: [] });
      expect(result).toContain('Usage');
      expect(result).toContain('/devboost');
    });

    it('should return unknown command for unrecognized command', async () => {
      const handler = new CommandHandler();
      const result = await handler.execute({ command: 'unknown', action: undefined, args: [] });
      expect(result).toBe('Unknown command');
    });
  });
});
