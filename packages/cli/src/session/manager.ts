/**
 * Session Manager
 *
 * Manages sessions and synchronizes messages between CLI and Telegram
 */

import { EventEmitter } from 'events';

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
}

export class SessionManager extends EventEmitter {
  private sessions: Map<string, Session> = new Map();
  private userIdToSessionId: Map<number, string> = new Map();
  private maxSessions: number;
  private sessionTimeout: number;

  constructor(options: SessionManagerOptions = {}) {
    super();
    this.maxSessions = options.maxSessions ?? 100;
    this.sessionTimeout = options.sessionTimeout ?? 24 * 60 * 60 * 1000; // 24 hours

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
  addMessage(sessionId: string, message: Message): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.messages.push(message);
      session.lastActivity = Date.now();
      this.emit('message:added', { sessionId, message });
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
}
