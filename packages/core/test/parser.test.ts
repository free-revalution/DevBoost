/**
 * Tests for Intent Parser
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { IntentParser, IntentType } from '../src/parser.js';

describe('IntentParser', () => {
  let parser: IntentParser;

  beforeEach(() => {
    parser = new IntentParser();
  });

  describe('parse', () => {
    it('should parse query intent from questions', () => {
      const result = parser.parse('What is the status of the build?');

      expect(result.intent.type).toBe(IntentType.QUERY);
      expect(result.intent.confidence).toBeGreaterThan(0);
      expect(result.suggestedTool).toBe('llm');
    });

    it('should parse build intent', () => {
      const result = parser.parse('Build the project');

      expect(result.intent.type).toBe(IntentType.BUILD);
      expect(result.suggestedTool).toBe('build');
    });

    it('should parse clean intent', () => {
      const result = parser.parse('Clean the build output');

      expect(result.intent.type).toBe(IntentType.CLEAN);
      expect(result.suggestedTool).toBe('build');
    });

    it('should parse flash intent', () => {
      const result = parser.parse('Flash the firmware to the device');

      expect(result.intent.type).toBe(IntentType.FLASH);
      expect(result.suggestedTool).toBe('flash');
    });

    it('should parse config set intent', () => {
      const result = parser.parse('Set timeout to 5000');

      expect(result.intent.type).toBe(IntentType.CONFIG_SET);
      expect(result.suggestedTool).toBe('config');
    });

    it('should parse config get intent', () => {
      const result = parser.parse('Show configuration');

      expect(result.intent.type).toBe(IntentType.CONFIG_GET);
      expect(result.suggestedTool).toBe('config');
    });

    it('should parse init project intent', () => {
      const result = parser.parse('Initialize a new project');

      expect(result.intent.type).toBe(IntentType.INIT_PROJECT);
      expect(result.suggestedTool).toBe('project');
    });

    it('should parse load project intent', () => {
      const result = parser.parse('Load project at /path/to/project');

      expect(result.intent.type).toBe(IntentType.LOAD_PROJECT);
      expect(result.suggestedTool).toBe('project');
    });

    it('should return unknown for unrecognized messages', () => {
      const result = parser.parse('xyzabc 123456');

      expect(result.intent.type).toBe(IntentType.UNKNOWN);
      expect(result.suggestedTool).toBe('llm'); // Fallback to LLM
    });
  });

  describe('parameter extraction', () => {
    it('should extract build configuration', () => {
      const result = parser.parse('Build using Debug configuration');

      expect(result.intent.parameters).toHaveProperty('configuration', 'Debug');
    });

    it('should extract flash device', () => {
      const result = parser.parse('Flash to /dev/ttyUSB0');

      expect(result.intent.parameters).toHaveProperty('device', '/dev/ttyUSB0');
    });

    it('should extract flash address', () => {
      const result = parser.parse('Flash at address 0x08000000');

      expect(result.intent.parameters).toHaveProperty('address', '0x08000000');
    });

    it('should extract config key-value', () => {
      const result = parser.parse('Set timeout to 5000');

      expect(result.intent.parameters).toHaveProperty('key', 'timeout');
      expect(result.intent.parameters).toHaveProperty('value', '5000');
    });

    it('should extract project path', () => {
      const result = parser.parse('Load project at /home/user/myproject');

      expect(result.intent.parameters).toHaveProperty('path', '/home/user/myproject');
    });

    it('should extract query topic', () => {
      const result = parser.parse('Explain about memory layout');

      expect(result.intent.parameters).toHaveProperty('topic', 'memory layout');
    });
  });

  describe('confidence scoring', () => {
    it('should have higher confidence for exact pattern matches', () => {
      const result1 = parser.parse('Build the project');
      const result2 = parser.parse('I want to build something');

      expect(result1.intent.confidence).toBeGreaterThan(result2.intent.confidence);
    });

    it('should calculate confidence between 0 and 1', () => {
      const result = parser.parse('Build the project');

      expect(result.intent.confidence).toBeGreaterThanOrEqual(0);
      expect(result.intent.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('custom patterns', () => {
    it('should allow adding custom patterns', () => {
      parser.addPattern(IntentType.BUILD, /^compile\s+everything$/i);

      const result = parser.parse('Compile everything');

      expect(result.intent.type).toBe(IntentType.BUILD);
    });
  });

  describe('custom keywords', () => {
    it('should allow adding custom keywords', () => {
      parser.addKeywords(IntentType.BUILD, ['assemble']);

      const result = parser.parse('Assemble the code');

      expect(result.intent.type).toBe(IntentType.BUILD);
    });
  });

  describe('edge cases', () => {
    it('should handle empty messages', () => {
      const result = parser.parse('');

      expect(result.intent.type).toBe(IntentType.UNKNOWN);
      expect(result.intent.rawMessage).toBe('');
    });

    it('should handle whitespace-only messages', () => {
      const result = parser.parse('   ');

      expect(result.intent.type).toBe(IntentType.UNKNOWN);
    });

    it('should handle messages with special characters', () => {
      const result = parser.parse('Build project: "My Project" (v1.0)');

      expect(result.intent.type).toBe(IntentType.BUILD);
    });

    it('should be case-insensitive', () => {
      const result1 = parser.parse('BUILD the project');
      const result2 = parser.parse('build the project');

      expect(result1.intent.type).toBe(result2.intent.type);
    });
  });

  describe('complex messages', () => {
    it('should handle multi-sentence messages', () => {
      const result = parser.parse('Can you help me? I need to build the project.');

      expect(result.intent.type).toBe(IntentType.QUERY);
    });

    it('should prioritize the dominant intent', () => {
      const result = parser.parse('Please build the project and then flash it');

      expect(result.intent.type).toBe(IntentType.BUILD);
    });
  });
});
