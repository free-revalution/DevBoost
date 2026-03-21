import { describe, it, expect } from 'vitest';
import { AutomationAgent } from '../src/index';

describe('AutomationAgent', () => {
  it('should create an instance with default config', () => {
    const agent = new AutomationAgent();
    expect(agent).toBeDefined();
  });

  it('should create an instance with custom config', () => {
    const agent = new AutomationAgent({ screen: { width: 1920, height: 1080 } });
    expect(agent).toBeDefined();
  });
});
