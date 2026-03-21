# DevBoost

> 跨平台嵌入式开发智能助手 / Cross-platform embedded development agent

[![Tests](https://img.shields.io/badge/tests-270%20passing-brightgreen)](https://github.com/free-revalution/DevBoost)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen)](https://nodejs.org)

## 简介 / Introduction

DevBoost 是一款跨平台的桌面端 AI 助手，专为嵌入式开发者设计。它能够帮助你：

- 🤖 **智能对话**: 通过自然语言与 AI 助手交互，完成各种开发任务
- 📁 **项目管理**: 自动创建和管理嵌入式项目（支持 STM32CubeMX、Keil5、Arduino IDE）
- 🌐 **浏览器自动化**: 自动操作浏览器，在嘉立创等平台绘制电路图和 PCB
- 🔧 **代码生成**: 自动生成嵌入式代码，配置项目参数
- 📊 **可视化操作**: 通过 TUI（终端用户界面）实时查看操作进度

DevBoost is an AI-powered development assistant designed for embedded systems development. It provides:

- 🤖 **Natural Language Interaction**: Interact with the AI assistant through natural language
- 📁 **Project Management**: Automatically create and manage embedded projects (STM32CubeMX, Keil5, Arduino IDE)
- 🌐 **Browser Automation**: Automate browser interactions for PCB design on platforms like JLCPCB
- 🔧 **Code Generation**: Automatically generate embedded code and configure project parameters
- 📊 **Visual Interface**: Real-time progress monitoring through TUI (Terminal User Interface)

## 快速开始 / Quick Start

### 环境要求 / Requirements

- Node.js >= 22.0.0
- pnpm >= 9.0.0

### 安装 / Installation

```bash
# 克隆仓库 / Clone repository
git clone git@github.com:free-revalution/DevBoost.git
cd DevBoost

# 安装依赖 / Install dependencies
pnpm install

# 构建项目 / Build project
pnpm build
```

### 配置 API Key / Configure API Key

DevBoost 支持多种 LLM 提供商 / DevBoost supports multiple LLM providers:

```bash
# Anthropic Claude (默认/default)
export ANTHROPIC_API_KEY="your-api-key-here"

# OpenAI
export OPENAI_API_KEY="your-api-key-here"

# Ollama (本地/local)
export OLLAMA_API_KEY="your-api-key-here"
```

### 运行 / Run

```bash
# 方式1: 直接运行 / Direct run
node packages/cli/dist/cli-entry.js

# 方式2: 使用 pnpm (推荐/recommended)
pnpm --filter @devboost/cli start

# 方式3: 全局安装后使用 / Global install
pnpm install -g .
devboost
```

## 使用指南 / Usage Guide

### TUI 界面 / TUI Interface

启动后会显示交互式界面 / After starting, you'll see the interactive interface:

```
┌─────────────────────────────────────────────────────────────┐
│                    DevBoost CLI v0.1.0                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Conversation                    Tasks                      │
│  ┌─────────────────────────┐     ┌──────────────────┐       │
│  │ > 你好                   │     │  ○ 任务1          │      │
│  │ < 你好！有什么可以帮助你？  │     │  ◉ 任务2 (进行中)  │       │
│  │                         │     │  ● 任务3          │       │
│  └─────────────────────────┘     └──────────────────┘       │
│                                                             │
│  [READY] Ready for input. Type /help for available commands │
│  > 输入命令或消息...                                           │
└─────────────────────────────────────────────────────────────┘
```

### 可用命令 / Available Commands

以 `/` 开头的命令 / Commands starting with `/`:

| 命令 Command | 说明 Description | 示例 Example |
|-------------|------------------|--------------|
| `/help` | 显示帮助信息 / Show help | `/help` |
| `/agent start` | 启动 AI Agent / Start Agent | `/agent start` |
| `/agent stop` | 停止 AI Agent / Stop Agent | `/agent stop` |
| `/agent status` | 查看 Agent 状态 / Agent status | `/agent status` |
| `/agent restart` | 重启 Agent / Restart Agent | `/agent restart` |
| `/context clear` | 清空对话上下文 / Clear context | `/context clear` |
| `/context save [name]` | 保存上下文 / Save context | `/context save session1` |
| `/context load [name]` | 加载上下文 / Load context | `/context load session1` |
| `/context info` | 上下文信息 / Context info | `/context info` |
| `/tools` | 列出可用工具 / List tools | `/tools` |
| `/history [count]` | 对话历史 / Chat history | `/history 10` |
| `/clear` | 清空屏幕 / Clear screen | `/clear` |
| `/provider list` | 列出 LLM 提供商 / List providers | `/provider list` |
| `/devboost info` | 项目信息 / Project info | `/devboost info` |

### 使用示例 / Usage Examples

#### 创建嵌入式项目 / Create Embedded Project

```
> 帮我创建一个 STM32F103 项目
> Help me create an STM32F103 project
```

#### 配置 CubeMX

```
> 打开 CubeMX，配置 UART1 波特率为 115200
> Open CubeMX and configure UART1 baudrate to 115200
```

#### 编译代码 / Compile Code

```
> 编译当前项目
> Compile the current project
```

#### 烧录固件 / Flash Firmware

```
> 将固件烧录到开发板
> Flash the firmware to the board
```

## 配置文件 / Configuration File

配置文件位置 / Config file location: `.devboost/config.json`

```json
{
  "version": "0.1.0",
  "llmProvider": "anthropic",
  "llmModel": "claude-sonnet-4-20250514",
  "maxTokens": 4096,
  "temperature": 0.7,
  "projectPath": "/path/to/your/project",
  "createdAt": "2026-03-21T00:00:00.000Z",
  "updatedAt": "2026-03-21T00:00:00.000Z"
}
```

## 支持的 LLM 提供商 / Supported LLM Providers

- **Anthropic**: Claude 3.5 Sonnet, Claude 3 Opus
- **OpenAI**: GPT-4, GPT-3.5 Turbo
- **OpenAI Compatible**: 兼容 OpenAI API 的服务 / OpenAI-compatible services
- **Ollama**: 本地运行的模型 / Local models

## 开发 / Development

### 项目结构 / Project Structure

```
DevBoost/
├── packages/
│   ├── core/          # 核心 Agent 实现 / Core Agent
│   ├── cli/           # CLI 界面 / CLI Interface
│   ├── tui/           # TUI 组件 / TUI Components
│   ├── tools/         # 工具集合 / Tools Collection
│   └── automation/    # 自动化模块 / Automation Module
├── docs/              # 文档 / Documentation
└── 文档/              # 中文文档 / Chinese Docs
```

### 运行测试 / Run Tests

```bash
# 运行所有测试 / Run all tests
pnpm test

# 运行特定包的测试 / Run specific package tests
pnpm --filter @devboost/core test
pnpm --filter @devboost/cli test
```

### 构建 / Build

```bash
# 构建所有包 / Build all packages
pnpm build

# 构建特定包 / Build specific package
pnpm --filter @devboost/cli build
```

## 路线图 / Roadmap

- [x] 核心 Agent 框架 / Core Agent Framework
- [x] TUI 界面 / TUI Interface
- [x] 命令处理系统 / Command System
- [x] 配置管理 / Configuration Management
- [ ] 浏览器自动化 / Browser Automation (Playwright)
- [ ] GUI 自动化 / GUI Automation (@nut-tree/nut-js)
- [ ] CubeMX 集成 / STM32CubeMX Integration
- [ ] Keil5 集成 / Keil5 Integration
- [ ] Arduino IDE 集成 / Arduino IDE Integration

## 贡献 / Contributing

欢迎提交 Issue 和 Pull Request！
Issues and Pull Requests are welcome!

## 许可证 / License

MIT License

## 致谢 / Acknowledgments

- [pi-mono](https://github.com/badlogic/pi-mono) - 项目灵感来源 / Project Inspiration
- [Claude Code](https://claude.ai/code) - AI 辅助开发 / AI-assisted Development
- [Blessed](https://github.com/chjj/blessed) - TUI 框架 / TUI Framework
