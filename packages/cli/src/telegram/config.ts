/**
 * Telegram Configuration
 */

export interface AuthorizedUser {
  telegramId: string;
  name: string;
  permissions: Permission[];
}

export type Permission =
  | 'all'
  | 'remote_control'
  | 'notifications'
  | 'ai_chat'
  | 'model_management';

export interface TelegramConfig {
  botToken: string;
  enabled: boolean;
  authorizedUsers: AuthorizedUser[];
  notifications: boolean;
  remoteControl: boolean;
  aiConversation: boolean;
}

export const DEFAULT_TELEGRAM_CONFIG: Partial<TelegramConfig> = {
  enabled: false,
  authorizedUsers: [],
  notifications: true,
  remoteControl: true,
  aiConversation: true,
};

/**
 * Check if a user has a specific permission
 */
export function hasPermission(
  user: AuthorizedUser,
  permission: Permission
): boolean {
  return user.permissions.includes('all') || user.permissions.includes(permission);
}

/**
 * Get all Telegram IDs from authorized users
 */
export function getAuthorizedTelegramIds(config: TelegramConfig): Set<number> {
  return new Set(
    config.authorizedUsers.map(u => parseInt(u.telegramId, 10)).filter(id => !isNaN(id))
  );
}
