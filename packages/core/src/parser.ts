/**
 * Intent Parser for DevBoost Agent
 *
 * Parses user messages to extract intent and parameters for tool routing.
 */

export enum IntentType {
  // LLM interaction
  QUERY = 'query',
  EXPLAIN = 'explain',
  GENERATE = 'generate',

  // Project operations
  INIT_PROJECT = 'init_project',
  LOAD_PROJECT = 'load_project',
  SAVE_PROJECT = 'save_project',

  // Build operations
  BUILD = 'build',
  CLEAN = 'clean',
  REBUILD = 'rebuild',

  // Flash operations
  FLASH = 'flash',
  VERIFY = 'verify',

  // Device detection
  DETECT = 'detect',
  LIST_DEVICES = 'list_devices',

  // Configuration
  CONFIG_SET = 'config_set',
  CONFIG_GET = 'config_get',
  CONFIG_LIST = 'config_list',

  // File operations
  FILE_READ = 'file_read',
  FILE_WRITE = 'file_write',
  FILE_EDIT = 'file_edit',

  // Unknown
  UNKNOWN = 'unknown'
}

export interface Intent {
  type: IntentType;
  confidence: number;
  parameters: Record<string, unknown>;
  rawMessage: string;
}

export interface ParseResult {
  intent: Intent;
  suggestedTool?: string;
}

/**
 * Intent Parser class
 *
 * Uses pattern matching and keyword analysis to determine user intent.
 */
export class IntentParser {
  private patterns: Map<IntentType, RegExp[]>;
  private keywords: Map<IntentType, string[]>;

  constructor() {
    this.patterns = new Map();
    this.keywords = new Map();
    this.initializePatterns();
    this.initializeKeywords();
  }

  private initializePatterns(): void {
    // Query patterns
    this.patterns.set(IntentType.QUERY, [
      /^(what|how|why|when|where|who|which|can you|could you|please|help)/i,
      /^(explain|describe|tell me|show me)/i,
      /\?$/,
    ]);

    // Build patterns
    this.patterns.set(IntentType.BUILD, [
      /^(build|compile|make)/i,
      /\b(build|compile|make)\s+(the\s+)?(project|code|firmware)/i,
    ]);

    // Clean patterns
    this.patterns.set(IntentType.CLEAN, [
      /^(clean|clear)/i,
      /\bclean\s+(the\s+)?(project|build|output)/i,
    ]);

    // Flash patterns
    this.patterns.set(IntentType.FLASH, [
      /^(flash|program|download)/i,
      /\b(flash|program|download)\s+(to\s+)?(the\s+)?(device|board|mcu|target)/i,
    ]);

    // Detect patterns
    this.patterns.set(IntentType.DETECT, [
      /^(detect|scan|find|identify)/i,
      /\b(detect|scan|find|identify)\s+(devices?|boards?|mcus?|targets?)/i,
      /\blist\s+(devices?|boards?|mcus?)/i,
    ]);

    // Config patterns
    this.patterns.set(IntentType.CONFIG_SET, [
      /^(set|config|configure)/i,
      /\b(set|config|configure)\s+(the\s+)?/,
    ]);

    this.patterns.set(IntentType.CONFIG_GET, [
      /^(get|show|display|list)\s+(config|configuration|settings)/i,
    ]);

    // Project patterns
    this.patterns.set(IntentType.INIT_PROJECT, [
      /^(init|initialize|create|start)\s+(a\s+)?(new\s+)?(project)/i,
    ]);

    this.patterns.set(IntentType.LOAD_PROJECT, [
      /^(load|open|switch\s+to)\s+(the\s+)?(project)/i,
    ]);
  }

  private initializeKeywords(): void {
    this.keywords.set(IntentType.QUERY, [
      'what', 'how', 'why', 'explain', 'describe', 'tell', 'show', 'help'
    ]);

    this.keywords.set(IntentType.BUILD, [
      'build', 'compile', 'make', 'rebuild'
    ]);

    this.keywords.set(IntentType.CLEAN, [
      'clean', 'clear', 'remove', 'delete'
    ]);

    this.keywords.set(IntentType.FLASH, [
      'flash', 'program', 'download', 'burn', 'write'
    ]);

    this.keywords.set(IntentType.DETECT, [
      'detect', 'scan', 'find', 'identify', 'list', 'devices', 'boards'
    ]);

    this.keywords.set(IntentType.CONFIG_SET, [
      'set', 'config', 'configure', 'change', 'update'
    ]);

    this.keywords.set(IntentType.CONFIG_GET, [
      'get', 'show', 'display', 'list', 'view'
    ]);

    this.keywords.set(IntentType.INIT_PROJECT, [
      'init', 'initialize', 'create', 'new', 'start'
    ]);

    this.keywords.set(IntentType.LOAD_PROJECT, [
      'load', 'open', 'switch'
    ]);
  }

  /**
   * Parse a user message to determine intent
   */
  parse(message: string): ParseResult {
    const trimmedMessage = message.trim();
    const intent = this.analyzeIntent(trimmedMessage);
    const suggestedTool = this.suggestTool(intent);

    return {
      intent,
      suggestedTool
    };
  }

  /**
   * Analyze the intent from a message
   */
  private analyzeIntent(message: string): Intent {
    const scores = new Map<IntentType, number>();

    // Initialize scores
    Object.values(IntentType).forEach(type => {
      scores.set(type, 0);
    });

    // Score based on pattern matching
    for (const [intentType, patterns] of this.patterns.entries()) {
      for (const pattern of patterns) {
        if (pattern.test(message)) {
          const currentScore = scores.get(intentType) || 0;
          scores.set(intentType, currentScore + 10);
        }
      }
    }

    // Score based on keyword matching
    const words = message.toLowerCase().split(/\s+/);
    for (const [intentType, keywords] of this.keywords.entries()) {
      for (const word of words) {
        if (keywords.includes(word)) {
          const currentScore = scores.get(intentType) || 0;
          scores.set(intentType, currentScore + 5);
        }
      }
    }

    // Find the highest scoring intent
    let bestIntent = IntentType.UNKNOWN;
    let bestScore = 0;

    for (const [intentType, score] of scores.entries()) {
      if (score > bestScore) {
        bestScore = score;
        bestIntent = intentType;
      }
    }

    // Calculate confidence (0-1)
    const maxPossibleScore = 15; // Pattern match + keyword match
    const confidence = Math.min(bestScore / maxPossibleScore, 1);

    // Extract parameters based on intent
    const parameters = this.extractParameters(message, bestIntent);

    return {
      type: bestIntent,
      confidence,
      parameters,
      rawMessage: message
    };
  }

  /**
   * Extract parameters from message based on intent
   */
  private extractParameters(message: string, intent: IntentType): Record<string, unknown> {
    const params: Record<string, unknown> = {};

    switch (intent) {
      case IntentType.BUILD:
      case IntentType.CLEAN:
        // Extract build configuration if mentioned
        const buildConfigMatch = message.match(/(?:using|with|config)\s+(\w+)/i);
        if (buildConfigMatch) {
          params.configuration = buildConfigMatch[1];
        }
        break;

      case IntentType.FLASH:
        // Extract device/path if mentioned
        const deviceMatch = message.match(/(?:to|device|target)\s+(\S+)/i);
        if (deviceMatch) {
          params.device = deviceMatch[1];
        }
        const addressMatch = message.match(/(?:address|offset)\s+(0x[0-9a-f]+)/i);
        if (addressMatch) {
          params.address = addressMatch[1];
        }
        break;

      case IntentType.CONFIG_SET:
        // Extract key-value pairs
        const kvMatch = message.match(/(\w+)\s+(?:to|=|as)\s+(\S+)/i);
        if (kvMatch) {
          params.key = kvMatch[1];
          params.value = kvMatch[2];
        }
        break;

      case IntentType.LOAD_PROJECT:
      case IntentType.INIT_PROJECT:
        // Extract project path - match patterns like "at /path", "project /path", or path at end
        const pathMatch = message.match(/(?:project|path|at\s+)?\s*([\/\~][^\s]+)/i);
        if (pathMatch) {
          params.path = pathMatch[1];
        }
        break;

      case IntentType.QUERY:
      case IntentType.EXPLAIN:
        // Extract the query topic
        const queryMatch = message.match(/(?:about|regarding|for)\s+(.+)/i);
        if (queryMatch) {
          params.topic = queryMatch[1].trim();
        } else {
          params.topic = message;
        }
        break;
    }

    return params;
  }

  /**
   * Suggest the appropriate tool for an intent
   */
  private suggestTool(intent: Intent): string | undefined {
    const toolMapping: Record<IntentType, string> = {
      [IntentType.QUERY]: 'llm',
      [IntentType.EXPLAIN]: 'llm',
      [IntentType.GENERATE]: 'llm',
      [IntentType.INIT_PROJECT]: 'project',
      [IntentType.LOAD_PROJECT]: 'project',
      [IntentType.SAVE_PROJECT]: 'project',
      [IntentType.BUILD]: 'build',
      [IntentType.CLEAN]: 'build',
      [IntentType.REBUILD]: 'build',
      [IntentType.FLASH]: 'flash',
      [IntentType.VERIFY]: 'flash',
      [IntentType.DETECT]: 'detect',
      [IntentType.LIST_DEVICES]: 'detect',
      [IntentType.CONFIG_SET]: 'config',
      [IntentType.CONFIG_GET]: 'config',
      [IntentType.CONFIG_LIST]: 'config',
      [IntentType.FILE_READ]: 'file',
      [IntentType.FILE_WRITE]: 'file',
      [IntentType.FILE_EDIT]: 'file',
      [IntentType.UNKNOWN]: 'llm'
    };

    return toolMapping[intent.type];
  }

  /**
   * Add a custom pattern for an intent
   */
  addPattern(intent: IntentType, pattern: RegExp): void {
    const patterns = this.patterns.get(intent) || [];
    patterns.push(pattern);
    this.patterns.set(intent, patterns);
  }

  /**
   * Add custom keywords for an intent
   */
  addKeywords(intent: IntentType, keywords: string[]): void {
    const existing = this.keywords.get(intent) || [];
    this.keywords.set(intent, [...existing, ...keywords]);
  }
}
