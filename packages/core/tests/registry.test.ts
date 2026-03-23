import { describe, it, expect } from 'vitest';
import { ToolRegistry } from '../src/registry.js';
import { Tool, ToolResult } from '../src/types.js';

describe('ToolRegistry', () => {
  it('should register a tool', () => {
    const registry = new ToolRegistry();
    const mockTool: Tool = {
      name: 'test-tool',
      description: 'A test tool',
      parameters: {},
      execute: async () => ({ success: true, data: 'test' })
    };
    registry.register(mockTool);
    expect(registry.has('test-tool')).toBe(true);
  });

  it('should retrieve a registered tool', () => {
    const registry = new ToolRegistry();
    const mockTool: Tool = {
      name: 'get-tool',
      description: 'Get test',
      parameters: {},
      execute: async () => ({ success: true })
    };
    registry.register(mockTool);
    const retrieved = registry.get('get-tool');
    expect(retrieved?.name).toBe('get-tool');
  });

  it('should return undefined for non-existent tool', () => {
    const registry = new ToolRegistry();
    expect(registry.get('non-existent')).toBeUndefined();
  });

  it('should list all tools', () => {
    const registry = new ToolRegistry();
    registry.register({
      name: 'tool1',
      description: 'First',
      parameters: {},
      execute: async () => ({ success: true })
    });
    registry.register({
      name: 'tool2',
      description: 'Second',
      parameters: {},
      execute: async () => ({ success: true })
    });
    const tools = registry.list();
    expect(tools).toHaveLength(2);
  });
});
