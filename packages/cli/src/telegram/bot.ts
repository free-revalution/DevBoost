/**
 * Telegram Bot Service
 *
 * Provides Telegram bot functionality for DevBoost CLI
 * including remote control, notifications, and AI conversation.
 */

import { Bot } from 'grammy';
import { TelegramConfig, getAuthorizedTelegramIds, hasPermission, Permission } from './config.js';

export interface TelegramBotOptions {
  config: TelegramConfig;
  onMessage?: (userId: number, message: string, chatId: number) => Promise<string>;
  onCommand?: (command: string, args: string[], userId: number, chatId: number) => Promise<string>;
  onCallbackQuery?: (queryId: string, data: string, userId: number) => Promise<void>;
}

export class TelegramBot {
  private bot: Bot;
  private config: TelegramConfig;
  private options: TelegramBotOptions;
  private authorizedUserIds: Set<number>;
  private _isRunning: boolean = false;

  constructor(options: TelegramBotOptions) {
    this.config = options.config;
    this.options = options;
    this.authorizedUserIds = getAuthorizedTelegramIds(options.config);
    this.bot = new Bot(options.config.botToken);

    this.setupHandlers();
  }

  /**
   * Setup message and command handlers
   */
  private setupHandlers(): void {
    // Handle all messages
    this.bot.on('message:text', async (ctx) => {
      const userId = ctx.from?.id;
      const chatId = ctx.chat.id;
      const message = ctx.message.text;

      if (!userId || !chatId || !message) return;

      // Check authorization
      if (!this.isAuthorized(userId)) {
        await ctx.reply('Sorry, you are not authorized to use this bot.');
        return;
      }

      // Check if user has ai_chat permission
      if (!this.hasPermission(userId, 'ai_chat')) {
        await ctx.reply('You do not have permission to chat with AI.');
        return;
      }

      try {
        const response = await this.options.onMessage?.(userId, message, chatId);
        if (response) {
          await ctx.reply(response);
        }
      } catch (error) {
        await ctx.reply(`Error processing message: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });

    // Handle callback queries (inline buttons)
    this.bot.on('callback_query', async (ctx) => {
      const queryId = ctx.callbackQuery?.id;
      const userId = ctx.from?.id;
      const data = ctx.callbackQuery?.data;

      if (!queryId || !userId || !data) return;

      // Check authorization
      if (!this.isAuthorized(userId)) {
        await ctx.answerCallbackQuery({ text: 'Unauthorized' });
        return;
      }

      try {
        await this.options.onCallbackQuery?.(queryId, data, userId);
        await ctx.answerCallbackQuery();
      } catch (error) {
        await ctx.answerCallbackQuery({ text: 'Error' });
      }
    });

    // Handle errors
    this.bot.catch((err) => {
      console.error('Telegram bot error:', err);
    });
  }

  /**
   * Start the bot
   */
  async start(): Promise<void> {
    if (!this.config.enabled) {
      console.log('Telegram bot is disabled in config.');
      return;
    }

    if (this._isRunning) {
      console.log('Telegram bot is already running.');
      return;
    }

    try {
      await this.bot.start();
      this._isRunning = true;
      console.log('Telegram bot started successfully.');
    } catch (error) {
      console.error('Failed to start Telegram bot:', error);
      throw error;
    }
  }

  /**
   * Stop the bot
   */
  async stop(): Promise<void> {
    if (!this._isRunning) {
      return;
    }

    try {
      await this.bot.stop();
      this._isRunning = false;
      console.log('Telegram bot stopped.');
    } catch (error) {
      console.error('Error stopping Telegram bot:', error);
    }
  }

  /**
   * Send a message to a specific chat
   */
  async sendMessage(chatId: number, text: string): Promise<void> {
    if (!this._isRunning) {
      throw new Error('Bot is not running');
    }

    try {
      await this.bot.api.sendMessage(chatId, text);
    } catch (error) {
      console.error(`Failed to send message to ${chatId}:`, error);
      throw error;
    }
  }

  /**
   * Send a notification to all authorized users
   */
  async sendNotification(message: string): Promise<void> {
    if (!this.config.notifications) {
      return;
    }

    for (const userId of this.authorizedUserIds) {
      try {
        await this.sendMessage(userId, message);
      } catch (error) {
        console.error(`Failed to send notification to ${userId}:`, error);
      }
    }
  }

  /**
   * Check if a user is authorized
   */
  isAuthorized(userId: number): boolean {
    return this.authorizedUserIds.has(userId);
  }

  /**
   * Check if bot is running
   */
  isRunning(): boolean {
    return this._isRunning;
  }

  /**
   * Check if a user has a specific permission
   */
  hasPermission(userId: number, permission: Permission): boolean {
    const user = this.config.authorizedUsers.find(u => parseInt(u.telegramId, 10) === userId);
    return user ? hasPermission(user, permission) : false;
  }

  /**
   * Get bot status
   */
  getStatus(): { running: boolean; authorizedUsers: number } {
    return {
      running: this._isRunning,
      authorizedUsers: this.authorizedUserIds.size,
    };
  }
}
