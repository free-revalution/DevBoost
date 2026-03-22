# DevBoost Telegram Integration Design

## 概述

为 DevBoost CLI 添加 Telegram 机器人集成，实现远程控制、通知推送和完整 AI 对话功能。

## 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                      DevBoost CLI                           │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                    CommandHandler                         │ │
│  │  - 处理用户命令                                          │ │
│  │  - 管理 Agent 会话                                       │ │
│  │  - 与 Telegram 服务通信                                  │ │
│  └─────────────────────────────────────────────────────────┘ │
│                             ↕                                 │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                   SessionManager                          │ │
│  │  - 全局会话存储                                          │ │
│  │  - CLI ↔ Telegram 同步                                  │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                             ↕
┌─────────────────────────────────────────────────────────────┐
│                  Telegram Service                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                   TelegramBot                             │ │
│  │  - 接收 Telegram 消息                                    │ │
│  │  - 验证授权用户                                          │ │
│  │  - 路由到 CommandHandler                                 │ │
│  │  - 发送响应消息                                          │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 核心组件

### 1. TelegramBot 类

**文件:** `packages/cli/src/telegram/bot.ts`

```typescript
export class TelegramBot {
  private bot: Bot;
  private authorizedUsers: Set<number>;
  private commandHandler: CommandHandler;

  constructor(config: TelegramConfig);

  // 启动机器人
  async start(): Promise<void>;

  // 停止机器人
  async stop(): Promise<void>;

  // 发送消息
  async sendMessage(chatId: number, text: string): Promise<void>;

  // 检查用户是否授权
  isAuthorized(userId: number): boolean;
}
```

### 2. TelegramConfig 接口

**文件:** `packages/cli/src/telegram/config.ts`

```typescript
export interface TelegramConfig {
  botToken: string;
  authorizedUsers: AuthorizedUser[];
  enableNotifications: boolean;
  enableRemoteControl: boolean;
  enableAIConversation: boolean;
}

export interface AuthorizedUser {
  telegramId: string;
  name: string;
  permissions: string[]; // ['remote_control', 'notifications', 'ai_chat']
}
```

### 3. SessionManager

**文件:** `packages/cli/src/session/manager.ts`

```typescript
export class SessionManager {
  private sessions: Map<string, Session>;

  // 共享会话：CLI 和 Telegram 使用同一会话
  shareSession(cliSession: Session): void;

  // 获取或创建会话
  getSession(userId: number, platform: 'cli' | 'telegram'): Session;

  // 同步消息到其他平台
  syncMessage(message: Message, fromPlatform: 'cli' | 'telegram'): void;
}
```

## 功能流程

### 1. 启动流程

```
用户启动 CLI
    ↓
检查 Telegram 配置
    ↓
如果配置存在 → 启动 Telegram Bot
    ↓
Bot 开始接收消息
```

### 2. 消息处理流程

```
Telegram 消息
    ↓
验证用户授权
    ↓
解析意图 (自然语言/命令)
    ↓
CommandHandler 处理
    ↓
Agent 执行
    ↓
响应发送回 Telegram
    ↓
SessionManager 同步到 CLI
```

### 3. CLI ↔ Telegram 同步

```
CLI 用户输入
    ↓
SessionManager 记录
    ↓
发送通知到 Telegram (如果启用)
    ↓
Telegram 用户可继续对话
```

## 安全考虑

1. **授权验证**: 只有白名单用户可使用 Bot
2. **权限级别**: 不同用户可授予不同权限
3. **API 密钥保护**: Token 存储在加密配置中
4. **命令验证**: 敏感操作需要额外确认

## 配置文件

**文件:** `.devboost/telegram.json`

```json
{
  "botToken": "123456:ABC-DEF",
  "enabled": true,
  "authorizedUsers": [
    {
      "telegramId": "123456789",
      "name": "Admin",
      "permissions": ["all"]
    }
  ],
  "notifications": true,
  "remoteControl": true,
  "aiConversation": true
}
```

## 实现步骤

1. ✅ 设计完成
2. ⏳ 创建 Telegram 服务模块
3. ⏳ 实现 TelegramBot 类
4. ⏳ 实现 SessionManager
5. ⏳ 集成到 CommandHandler
6. ⏳ 添加配置管理
7. ⏳ 编写测试
8. ⏳ 文档更新
