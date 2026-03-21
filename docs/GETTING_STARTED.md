# DevBoost 使用指南 / Usage Guide

## 目录 / Table of Contents

1. [安装 / Installation](#安装--installation)
2. [首次配置 / First-time Setup](#首次配置--first-time-setup)
3. [基本操作 / Basic Operations](#基本操作--basic-operations)
4. [命令参考 / Command Reference](#命令参考--command-reference)
5. [使用场景 / Use Cases](#使用场景--use-cases)
6. [故障排除 / Troubleshooting](#故障排除--troubleshooting)

---

## 安装 / Installation

### 环境要求 / Requirements

```bash
# 检查 Node.js 版本 / Check Node.js version
node --version  # 需要 >= 22.0.0 / Required >= 22.0.0

# 检查 pnpm 版本 / Check pnpm version
pnpm --version  # 需要 >= 9.0.0 / Required >= 9.0.0
```

### 从源码安装 / Install from Source

```bash
# 1. 克隆仓库 / Clone repository
git clone git@github.com:free-revalution/DevBoost.git
cd DevBoost

# 2. 安装依赖 / Install dependencies
pnpm install

# 3. 构建项目 / Build project
pnpm build

# 4. 运行 / Run
node packages/cli/dist/cli-entry.js
```

### 全局安装 / Global Install

```bash
# 在项目根目录 / In project root
pnpm install -g .

# 现在可以直接运行 / Now you can run directly
devboost
```

---

## 首次配置 / First-time Setup

### 1. 设置 API Key

DevBoost 需要配置 LLM 提供商的 API Key。

**Anthropic Claude (推荐 / Recommended):**

```bash
# macOS / Linux
export ANTHROPIC_API_KEY="sk-ant-api03-..."

# 添加到 ~/.zshrc 或 ~/.bashrc 使其永久生效
echo 'export ANTHROPIC_API_KEY="sk-ant-api03-..."' >> ~/.zshrc
source ~/.zshrc
```

**OpenAI:**

```bash
export OPENAI_API_KEY="sk-..."
```

**Windows:**

```powershell
# PowerShell
$env:ANTHROPIC_API_KEY="sk-ant-api03-..."

# 或设置环境变量（永久）
setx ANTHROPIC_API_KEY "sk-ant-api03-..."
```

### 2. 初始化项目

```bash
# 在你的项目目录 / In your project directory
cd /path/to/your/embedded/project
devboost

# 首次运行会自动创建 .devboost 目录和配置文件
# First run automatically creates .devboost directory and config
```

### 3. 验证配置

```bash
# 启动 DevBoost 后 / After starting DevBoost
/devboost info

# 输出示例 / Output example:
# DevBoost Project Information
# Path: /path/to/your/project
# Config: /path/to/project/.devboost/config.json
# Initialized: Yes
```

---

## 基本操作 / Basic Operations

### 启动 DevBoost

```bash
devboost
```

你会看到以下界面 / You will see:

```
┌─────────────────────────────────────────────────────────────┐
│                    DevBoost CLI v0.1.0                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Conversation                    Tasks                      │
│  ┌─────────────────────────┐     ┌──────────────────┐     │
│  │ {cyan-fg}Welcome to DevBoost CLI!{/cyan-fg}       │     │
│  │                         │     │                  │     │
│  │ Your intelligent assistant │     │                  │     │
│  │ for embedded development.  │     │                  │     │
│  │                         │     │                  │     │
│  │ Getting started:        │     │                  │     │
│  │   1. Type /agent start  │     │                  │     │
│  │   2. Type /help         │     │                  │     │
│  │   3. Start asking!      │     │                  │     │
│  └─────────────────────────┘     └──────────────────┘     │
│                                                             │
│  [READY] Ready for input. Type /help for available commands│
│  > _                                                        │
└─────────────────────────────────────────────────────────────┘
```

### 基本对话流程 / Basic Chat Flow

```
# 1. 启动 Agent / Start Agent
> /agent start
✓ Agent started successfully

# 2. 开始对话 / Start chatting
> 帮我创建一个 STM32F103 的 UART 项目
< 好的，我来帮你创建 STM32F103 的 UART 项目...

# 3. 查看任务列表 / View task list
> /tools
Available Tools:
  build - 编译项目
  flash - 烧录固件
  ...

# 4. 停止 Agent / Stop Agent
> /agent stop
✓ Agent stopped
```

### 键盘快捷键 / Keyboard Shortcuts

| 按键 / Key | 功能 / Function |
|-----------|----------------|
| `Ctrl+C` | 退出程序 / Exit |
| `Enter` | 发送消息 / Send message |
| `Ctrl+L` | 清空屏幕 / Clear screen |

---

## 命令参考 / Command Reference

### Agent 管理命令 / Agent Management

```
/agent start      # 启动 AI Agent / Start AI Agent
/agent stop       # 停止 AI Agent / Stop AI Agent
/agent status     # 查看 Agent 状态 / View Agent status
/agent restart    # 重启 Agent / Restart Agent
```

**示例 / Examples:**

```
> /agent status
Agent Status: Running
Messages in context: 5
Tools available: 8
```

### 上下文管理命令 / Context Management

```
/context clear    # 清空对话历史 / Clear conversation history
/context save     # 保存当前上下文（默认: default）/ Save context
/context load     # 加载保存的上下文 / Load saved context
/context info     # 显示上下文信息 / Show context info
```

**示例 / Examples:**

```
> /context save my-stm32-project
✓ Context saved as "my-stm32-project"

> /context load my-stm32-project
✓ Context loaded from "my-stm32-project"

> /context info
Context Information:
Total messages: 12
Context size: 2048
Last updated: 2026-03-21T15:30:00.000Z
```

### 工具命令 / Tool Commands

```
/tools           # 列出所有可用工具 / List all available tools
/history [n]     # 显示最近 n 条消息（默认: 10）/ Show last n messages
```

### 提供商管理 / Provider Management

```
/provider list                    # 列出所有提供商 / List all providers
/provider add <type>               # 添加提供商 / Add provider
/provider use <type>               # 切换提供商 / Switch provider
```

### 项目管理 / Project Management

```
/devboost init     # 初始化新项目 / Initialize new project
/devboost info     # 显示项目信息 / Show project info
```

### 其他命令 / Other Commands

```
/help             # 显示帮助信息 / Show help
/clear            # 清空屏幕 / Clear screen
```

---

## 使用场景 / Use Cases

### 场景 1: 创建 STM32 项目

```
# 1. 启动 Agent
> /agent start

# 2. 描述需求
> 我需要创建一个 STM32F103C8T6 的项目，使用 UART1 发送 "Hello World"

# 3. Agent 会自动执行以下步骤：
#    - 创建项目结构
#    - 配置 CubeMX 参数
#    - 生成初始化代码
#    - 添加 UART 发送代码
#    - 编译项目

# 4. 查看生成的代码
> 显示 main.c 的内容

# 5. 如果需要修改
> 把波特率改为 9600
```

### 场景 2: 浏览器自动化（嘉立创 PCB）

```
> 打开嘉立创EDA，创建一个简单的LED电路

# Agent 会：
# 1. 启动浏览器
# 2. 打开嘉立创EDA
# 3. 自动绘制电路图
# 4. 等待你的确认
```

### 场景 3: 调试代码

```
> 我的代码编译出错了，帮我看看

# Agent 会：
# 1. 读取编译错误信息
# 2. 分析问题原因
# 3. 提供修复建议
# 4. 自动修复（如果可能）
```

### 场景 4: 保存和恢复工作会话

```
# 保存当前工作
> /context save uart-project
✓ Context saved as "uart-project"

# 下次继续工作
> /context load uart-project
✓ Context loaded from "uart-project"

# 查看历史对话
> /history 20
```

---

## 故障排除 / Troubleshooting

### 问题 1: "No active screen" 错误

**原因 / Cause:** TUI 初始化失败

**解决 / Solution:**
```bash
# 确保在支持的终端中运行 / Ensure running in supported terminal
# macOS: Terminal.app, iTerm2
# Linux: gnome-terminal, konsole
# Windows: Windows Terminal, PowerShell

# 避免在以下环境中运行 / Avoid running in:
# - VSCode 内置终端（有时有问题）
# - 某些远程 SSH 会话
```

### 问题 2: API Key 无效

**解决 / Solution:**
```bash
# 检查环境变量 / Check environment variable
echo $ANTHROPIC_API_KEY

# 重新设置 / Reset
export ANTHROPIC_API_KEY="your-actual-key"

# 验证 / Verify
/devboost info
```

### 问题 3: Agent 无法启动

**检查清单 / Checklist:**
```bash
# 1. 检查 API Key / Check API Key
echo $ANTHROPIC_API_KEY

# 2. 检查网络连接 / Check network connection
ping api.anthropic.com

# 3. 查看详细错误 / View detailed error
> /agent start
# 查看控制台输出的错误信息
```

### 问题 4: 构建失败

```bash
# 清理并重新构建 / Clean and rebuild
pnpm clean
pnpm install
pnpm build

# 如果还有问题 / If still having issues
rm -rf node_modules
pnpm install
pnpm build
```

---

## 高级配置 / Advanced Configuration

### 自定义配置文件 / Custom Config

编辑 `.devboost/config.json`:

```json
{
  "version": "0.1.0",
  "llmProvider": "anthropic",
  "llmModel": "claude-sonnet-4-20250514",
  "maxTokens": 8192,
  "temperature": 0.5,
  "projectPath": "/custom/path"
}
```

### 使用不同的 LLM 提供商

```bash
# OpenAI
export OPENAI_API_KEY="sk-..."
> /provider use openai

# 本地 Ollama
export OLLAMA_API_KEY="..."
> /provider use ollama
```

---

## 获取帮助 / Getting Help

- 查看 GitHub Issues: https://github.com/free-revalution/DevBoost/issues
- 提交 Bug: 使用 `/devboost info` 获取系统信息并提交 Issue
- 功能建议: 欢迎提交 Feature Request

---

## 下一步 / Next Steps

- 阅读 [开发指南](./DEVELOPMENT.md) 了解如何贡献代码
- 查看 [API 文档](./API.md) 了解编程接口
- 探索 [示例项目](../examples/) 学习实际用法
