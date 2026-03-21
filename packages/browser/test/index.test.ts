import { describe, it, expect } from 'vitest';
import { BrowserAgent } from '../src/index';

describe('BrowserAgent', () => {
  it('should create an instance with default config', () => {
    const agent = new BrowserAgent();
    expect(agent).toBeDefined();
  });

  it('should create an instance with custom config', () => {
    const agent = new BrowserAgent({ headless: false, timeout: 60000 });
    expect(agent).toBeDefined();
  });
});
