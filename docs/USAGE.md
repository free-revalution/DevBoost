# DevBoost CLI 使用指南

## 简介

DevBoost CLI 是一个功能强大的命令行界面工具，提供了完整的终端 UI (TUI) 和简单模式两种使用方式。

## 安装

```bash
# 克隆项目
git clone git@github.com:free-revalution/DevBoost.git
cd DevBoost

# 安装依赖
pnpm install

# 构建项目
pnpm build
```

## 为什么使用 pnpm 而不是 npm？

1. **高效的磁盘空间使用**: pnpm 使用硬链接和符号链接，所有项目共享同一个 `node_modules`
2. **更快的安装速度**: 由于链接机制，安装速度比 npm 快
3. **严格的依赖隔离**: 防止幽灵依赖问题
4. **monorepo 支持**: 原生支持 monorepo 工作区
5. **更严格的语义**: 遵循 Node.js 模块解析规则

## 启动方式

### TUI 模式（推荐）

完整的终端用户界面，提供更好的视觉体验：

```bash
pnpm start
# 或
node packages/cli/dist/cli-entry.js
```

### 简单模式

适用于不支持 blessed TUI 的终端：

```bash
pnpm start -- --no-tui
# 或
node packages/cli/dist/cli-entry.js --no-tui
```

## 模型管理

### 查看已配置的模型

```
/model list
```

输出示例：
```
Configured Models (1):

 *[anthropic-default]
  Provider: anthropic
  Model: claude-3-5-sonnet-20241022
  API Key: (no key)
  Max Tokens: 4096
  Temperature: 0.7

* = Current model
```

### 添加新模型（交互式）

```
/model add
```

然后按照提示逐步输入：

```
/model provider anthropic
/model name claude-3-5-sonnet-20241022
/model key sk-ant-your-key-here
```

支持的服务商：
- `anthropic` - Anthropic Claude
- `openai` - OpenAI GPT
- `openai-compatible` - OpenAI 兼容 API
- `ollama` - Ollama 本地模型

### 切换模型

```
/model switch <model-id>
```

例如：
```
/model switch anthropic-default
```

### 删除模型

```
/model remove <model-id>
```

### 取消添加操作

在添加模型过程中，可以随时取消：

```
/model cancel
```

## Agent 管理

### 启动 Agent

```
/agent start
```

### 停止 Agent

```
/agent stop
```

### 查看 Agent 状态

```
/agent status
```

### 重启 Agent

```
/agent restart
```

## 上下文管理

### 清空对话上下文

```
/context clear
```

### 保存当前上下文

```
/context save my-session
```

### 加载已保存的上下文

```
/context load my-session
```

### 查看上下文信息

```
/context info
```

## 其他命令

### 显示帮助

```
/help
```

### 列出可用工具

```
/tools
```

### 查看对话历史

```
/history 10
```

### 清屏

```
/clear
```

### 退出

```
/exit
# 或
/quit
# 或按 Ctrl+C
```

## 快速开始示例

```bash
# 1. 启动 CLI
pnpm start -- --no-tui

# 2. 查看当前模型
> /model list

# 3. 添加新模型
> /model add
> /model provider openai
> /model name gpt-4
> /model key sk-your-openai-key

# 4. 切换到新模型
> /model switch openai-gpt-4

# 5. 启动 agent
> /agent start

# 6. 开始对话
> Hello, can you help me?

# 7. 退出
> /exit
```

## 配置文件

模型配置保存在 `~/.devboost/models.json`：

```json
{
  "models": [
    {
      "id": "anthropic-default",
      "provider": "anthropic",
      "modelName": "claude-3-5-sonnet-20241022",
      "apiKey": "sk-ant-xxx",
      "maxTokens": 4096,
      "temperature": 0.7,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "isDefault": true
    }
  ],
  "currentModel": "anthropic-default"
}
```

## 环境变量

也可以通过环境变量设置 API 密钥：

```bash
export ANTHROPIC_API_KEY="sk-ant-your-key"
export OPENAI_API_KEY="sk-your-openai-key"
```

## 故障排除

### TUI 模式启动失败

如果遇到 `String.prototype.bold called on null or undefined` 错误：

1. 确保已重新构建项目：`pnpm build`
2. 尝试使用简单模式：`pnpm start -- --no-tui`

### 模型添加失败

1. 确保输入的 API 密钥格式正确
2. 检查网络连接
3. 验证服务商和模型名称是否正确

### 更多帮助

- 项目主页: https://github.com/free-revalution/DevBoost
- 提交问题: https://github.com/free-revalution/DevBoost/issues
