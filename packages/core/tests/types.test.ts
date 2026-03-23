import { describe, it, expect } from 'vitest';
import { Message, Role } from '../src/types.js';

describe('Message Types', () => {
  it('should create a user message', () => {
    const msg: Message = {
      role: Role.User,
      content: 'Hello DevBoost'
    };
    expect(msg.role).toBe(Role.User);
    expect(msg.content).toBe('Hello DevBoost');
  });

  it('should create an assistant message', () => {
    const msg: Message = {
      role: Role.Assistant,
      content: 'How can I help?'
    };
    expect(msg.role).toBe(Role.Assistant);
  });

  it('should create a message with metadata', () => {
    const msg: Message = {
      role: Role.User,
      content: 'Help me',
      metadata: { taskId: 'task-1' }
    };
    expect(msg.metadata?.taskId).toBe('task-1');
  });
});
