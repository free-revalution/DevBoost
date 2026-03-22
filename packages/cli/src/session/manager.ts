/**
 * Session Manager
 *
 * Manages sessions and synchronizes messages between CLI and Telegram
 */

import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import { join } from 'path';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  platform: 'cli' | 'telegram';
  userId?: string;
  chatId?: number;
}

export interface Session {
  id: string;
  userId: number; // Telegram user ID
  chatId: number;  // Telegram chat ID
  messages: Message[];
  createdAt: number;
  lastActivity: number;
}

export interface SessionManagerOptions {
  maxSessions?: number;
  sessionTimeout?: number; // in milliseconds
  persistPath?: string; // Path to store session data
  autoSave?: boolean; // Automatically save after changes
}

export class SessionManager extends EventEmitter {
  private sessions: Map<string, Session> = new Map();
  private userIdToSessionId: Map<number, string> = new Map();
  private maxSessions: number;
  private sessionTimeout: number;
  private persistPath: string;
  private autoSave: boolean;

  constructor(options: SessionManagerOptions = {}) {
    super();
    this.maxSessions = options.maxSessions ?? 100;
    this.sessionTimeout = options.sessionTimeout ?? 24 * 60 * 60 * 1000; // 24 hours
    this.persistPath = options.persistPath ?? '.devboost/sessions';
    this.autoSave = options.autoSave ?? true;

    // Clean up expired sessions every hour
    setInterval(() => this.cleanupExpiredSessions(), 60 * 60 * 1000);
  }

  /**
   * Get or create a session for a user
   */
  getOrCreateSession(userId: number, chatId: number): Session {
    const sessionId = `${userId}:${chatId}`;
    let session = this.sessions.get(sessionId);

    if (!session) {
      // Clean up old sessions if at limit
      if (this.sessions.size >= this.maxSessions) {
        this.cleanupOldestSession();
      }

      session = {
        id: sessionId,
        userId,
        chatId,
        messages: [],
        createdAt: Date.now(),
        lastActivity: Date.now(),
      };

      this.sessions.set(sessionId, session);
      this.userIdToSessionId.set(userId, sessionId);
      this.emit('session:created', session);
    }

    return session;
  }

  /**
   * Get session by user ID
   */
  getSessionByUserId(userId: number): Session | undefined {
    const sessionId = this.userIdToSessionId.get(userId);
    return sessionId ? this.sessions.get(sessionId) : undefined;
  }

  /**
   * Add a message to a session
   */
  async addMessage(sessionId: string, message: Message): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.messages.push(message);
      session.lastActivity = Date.now();
      this.emit('message:added', { sessionId, message });

      // Auto-save if enabled
      if (this.autoSave) {
        await this.save();
      }
    }
  }

  /**
   * Add a message from CLI and sync to Telegram
   */
  addCLIMessage(userId: number, chatId: number, role: 'user' | 'assistant', content: string): void {
    const session = this.getOrCreateSession(userId, chatId);
    const message: Message = {
      role,
      content,
      timestamp: Date.now(),
      platform: 'cli',
      userId: String(userId),
      chatId,
    };

    this.addMessage(session.id, message);
    this.emit('cli:message', { session, message });
  }

  /**
   * Add a message from Telegram and sync to CLI
   */
  addTelegramMessage(userId: number, chatId: number, role: 'user', content: string): void {
    const session = this.getOrCreateSession(userId, chatId);
    const message: Message = {
      role,
      content,
      timestamp: Date.now(),
      platform: 'telegram',
      userId: String(userId),
      chatId,
    };

    this.addMessage(session.id, message);
    this.emit('telegram:message', { session, message });
  }

  /**
   * Get session messages
   */
  getSessionMessages(sessionId: string): Message[] {
    const session = this.sessions.get(sessionId);
    return session ? session.messages : [];
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Clear session messages
   */
  clearSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.messages = [];
      session.lastActivity = Date.now();
      this.emit('session:cleared', session);
    }
  }

  /**
   * Delete a session
   */
  deleteSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      this.userIdToSessionId.delete(session.userId);
      this.sessions.delete(sessionId);
      this.emit('session:deleted', session);
    }
  }

  /**
   * Get all sessions
   */
  getAllSessions(): Session[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Clean up expired sessions
   */
  private cleanupExpiredSessions(): void {
    const now = Date.now();
    const expiredIds: string[] = [];

    for (const [id, session] of this.sessions) {
      if (now - session.lastActivity > this.sessionTimeout) {
        expiredIds.push(id);
      }
    }

    for (const id of expiredIds) {
      this.deleteSession(id);
    }

    if (expiredIds.length > 0) {
      console.log(`Cleaned up ${expiredIds.length} expired sessions`);
    }
  }

  /**
   * Clean up oldest session when at limit
   */
  private cleanupOldestSession(): void {
    let oldestSession: Session | null = null;
    let oldestTime = Infinity;

    for (const session of this.sessions.values()) {
      if (session.lastActivity < oldestTime) {
        oldestTime = session.lastActivity;
        oldestSession = session;
      }
    }

    if (oldestSession) {
      this.deleteSession(oldestSession.id);
    }
  }

  /**
   * Get session count
   */
  get sessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Get active session count (activity within last hour)
   */
  getActiveSessionCount(): number {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    let count = 0;

    for (const session of this.sessions.values()) {
      if (session.lastActivity > oneHourAgo) {
        count++;
      }
    }

    return count;
  }

  /**
   * Save all sessions to disk
   */
  async save(): Promise<void> {
    try {
      // Ensure directory exists
      await fs.mkdir(this.persistPath, { recursive: true });

      const sessionsFile = join(this.persistPath, 'sessions.json');
      const sessionsArray = Array.from(this.sessions.values());

      await fs.writeFile(sessionsFile, JSON.stringify(sessionsArray, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to save sessions:', error);
    }
  }

  /**
   * Load sessions from disk
   */
  async load(): Promise<void> {
    try {
      const sessionsFile = join(this.persistPath, 'sessions.json');
      const data = await fs.readFile(sessionsFile, 'utf-8');
      const sessionsArray = JSON.parse(data) as Session[];

      // Restore sessions
      for (const session of sessionsArray) {
        this.sessions.set(session.id, session);
        this.userIdToSessionId.set(session.userId, session.id);
      }

      console.log(`Loaded ${sessionsArray.length} sessions from disk`);
    } catch (error) {
      // File doesn't exist or is invalid - start fresh
      console.log('No existing sessions found, starting fresh');
    }
  }

  /**
   * Clear all sessions
   */
  async clearAll(): Promise<void> {
    this.sessions.clear();
    this.userIdToSessionId.clear();

    if (this.autoSave) {
      await this.save();
    }
  }
}
