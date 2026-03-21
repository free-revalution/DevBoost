# DevBoost 设计文档

**日期**: 2026-03-20
**状态**: 设计阶段
**参考项目**: [badlogic/pi-mono](https://github.com/badlogic/pi-mono)

---

## 1. 项目概述

DevBoost 是一款跨平台桌面端通用 Agent，专注于嵌入式开发和电子设计自动化。

### 1.1 核心目标

- 支持嵌入式开发（Keil5、Arduino IDE、STM32CubeMX）
- 可视化浏览器操作（JLCPCB PCB 设计与打板）
- 复杂编码任务协调（调用 Claude Code）
- 跨平台支持（Windows/Linux/macOS）

### 1.2 参考项目

pi-mono 是一个 TypeScript/Node.js 的 Agent 框架，包含以下包：
- `@mariozechner/pi-ai`: 多提供商 LLM API
- `@mariozechner/pi-agent-core`: Agent 运行时
- `@mariozechner/pi-coding-agent`: 交互式编码 Agent CLI
- `@mariozechner/pi-tui`: 终端 UI 库

---

## 2. 技术栈

| 组件 | 选择 | 原因 |
|------|------|------|
| **语言** | TypeScript 5+ | 类型安全、生态成熟 |
| **运行时** | Node.js 22+ | 跨平台、npm 生态 |
| **包管理** | pnpm | 支持 monorepo、高效 |
| **TUI** | blessed 或 ink | 成熟的终端 UI |
| **浏览器自动化** | Playwright | 跨平台、API 稳定 |
| **桌面自动化** | @nut-tree/nut-js | 跨平台 GUI 自动化 |
| **LLM SDK** | @anthropic-ai/sdk | Claude API 官方支持 |

---

## 3. 项目结构

### 3.1 Monorepo 结构

```
DevBoost/
├── packages/
│   ├── core/           # 核心 Agent 运行时
│   ├── automation/     # 嵌入式工具自动化
│   ├── browser/        # 浏览器自动化
│   ├── llm/            # LLM 提供商系统
│   ├── tui/            # 终端 UI
│   └── cli/            # 命令行入口
├── docs/
│   └── plans/
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

### 3.2 包职责

| 包 | 职责 |
|---|------|
| **core** | Agent 运行时、工具注册、错误处理、内存管理 |
| **automation** | 嵌入式工具集成（Keil5、CubeMX、烧录） |
| **browser** | 浏览器自动化（JLCPCB 等） |
| **llm** | LLM 提供商抽象、配置管理 |
| **tui** | 终端界面组件、差分渲染 |
| **cli** | 命令行入口、启动逻辑 |

---

## 4. 核心架构

### 4.1 整体架构

```
┌─────────────────────────────────────────────────────────┐
│                       用户输入                           │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                    TUI (blessed)                        │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                  Core Agent 运行时                       │
│  ┌───────────┬───────────┬───────────┬─────────────┐  │
│  │  意图解析  │  任务规划  │  工具调度  │  结果处理   │  │
│  └───────────┴───────────┴───────────┴─────────────┘  │
└─────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│   automation  │   │    browser    │   │ Claude Code   │
│  嵌入式自动化  │   │  浏览器自动化  │   │  外部编码工具  │
└───────────────┘   └───────────────┘   └───────────────┘
```

### 4.2 数据流

```
用户指令 (自然语言)
    │
    ▼
TUI 接收输入
    │
    ▼
Core Agent 解析意图
    │
    ├──► 嵌入式开发 ──► automation 包
    ├──► PCB 打板   ──► browser 包
    ├──► 复杂编码   ──► Claude Code CLI
    └──► 其他任务   ──► 相应工具
    │
    ▼
结果汇总
    │
    ▼
TUI 展示
```

---

## 5. LLM 提供商系统

### 5.1 架构

```
packages/llm/
├── src/
│   ├── providers/
│   │   ├── base.ts          # 提供商基类
│   │   ├── anthropic.ts     # Anthropic（默认）
│   │   ├── openai.ts        # OpenAI
│   │   ├── custom.ts        # 自定义提供商
│   │   └── registry.ts      # 提供商注册表
│   ├── config/
│   │   ├── store.ts         # 配置存储
│   │   └── manager.ts       # 配置管理器
│   └── index.ts
```

### 5.2 配置文件

```json
{
  "currentProvider": "anthropic",
  "providers": {
    "anthropic": {
      "type": "anthropic",
      "apiKey": "sk-ant-xxx",
      "model": "claude-sonnet-4-6"
    },
    "deepseek": {
      "type": "openai-compatible",
      "baseUrl": "https://api.deepseek.com/v1",
      "apiKey": "sk-xxx",
      "model": "deepseek-chat"
    }
  }
}
```

### 5.3 用户指令

```
/provider add <name> --api-key=<key> --base-url=<url> --model=<model>
/provider use <name>
/provider list
/provider remove <name>
```

---

## 6. 嵌入式工具自动化

### 6.1 三层架构

```
┌─────────────────────────────────────────────────────────┐
│                   DevBoost Agent                        │
└─────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│    文件层     │   │    CLI 层     │   │    GUI 层     │
│   (首选)      │   │   (次选)      │   │   (兜底)      │
│ 编辑配置文件   │   │ 命令行工具    │   │  nut.js 自动化 │
└───────────────┘   └───────────────┘   └───────────────┘
```

| 层级 | 实现方式 | 适用场景 | 稳定性 |
|------|----------|----------|--------|
| **文件层** | 直接编辑 .ioc/.uvprojx | 项目配置、参数修改 | ⭐⭐⭐⭐⭐ |
| **CLI 层** | 调用 headless build | 编译、烧录 | ⭐⭐⭐⭐ |
| **GUI 层** | nut.js 模拟点击 | 无法通过文件/CLI 完成 | ⭐⭐⭐ |

### 6.2 模块结构

```
packages/automation/
├── src/
│   ├── flash/
│   │   ├── detectors.ts       # 检测烧录器
│   │   ├── tools.ts           # 烧录工具封装
│   │   └── verifier.ts        # 烧录验证
│   ├── keil/
│   │   └── project.ts         # Keil 项目解析
│   ├── cubemx/
│   │   └── config.ts          # CubeMX .ioc 解析
│   └── index.ts
```

### 6.3 烧录流程

```
┌─────────────────────────────────────────────────────────┐
│  1. 检测烧录器                                          │
│     - 扫描 USB 设备（ST-Link V2/V3, J-Link, DAPLink）  │
│     - 确认设备状态和驱动                                │
├─────────────────────────────────────────────────────────┤
│  2. 检测单片机                                          │
│     - 通过烧录器读取 MCU 型号                           │
│     - 匹配对应的烧录算法                                │
├─────────────────────────────────────────────────────────┤
│  3. 烧录程序                                            │
│     - 调用对应工具（STM32CubeProgrammer 等）            │
│     - 擦除 -> 写入 -> 验证                              │
├─────────────────────────────────────────────────────────┤
│  4. 验证结果                                            │
│     - 读取校验和/签名                                   │
│     - 确认烧录成功                                      │
└─────────────────────────────────────────────────────────┘
```

### 6.4 烧录器检测

| 烧录器 | VID/PID | 工具 |
|--------|---------|------|
| ST-Link V2 | 0x0483:0x3748 | STM32CubeProgrammer |
| ST-Link V3 | 0x0483:0x374E | STM32CubeProgrammer |
| J-Link | 0x1366:0x0101 | J-Link Commander |
| DAPLink | 多种 | OpenOCD |

---

## 7. 浏览器自动化

### 7.1 架构

```
packages/browser/
├── src/
│   ├── platforms/
│   │   ├── jlcpcb/
│   │   │   ├── schematic.ts    # 原理图自动化
│   │   │   ├── pcb.ts          # PCB 布局
│   │   │   └── order.ts        # 自动下单
│   │   └── base.ts             # 平台基类
│   ├── session.ts              # 浏览器会话
│   └── index.ts
```

### 7.2 操作流程

```
用户指令: "帮我用嘉立创打板，文件是 xxx.gb"
    │
    ▼
启动浏览器（持久化上下文）
    │
    ▼
检测登录状态
    │
    ▼
上传文件 → 填充参数 → 确认订单
    │
    ▼
返回订单号
```

---

## 8. Claude Code 集成

### 8.1 集成方式

采用**工具调用模式**：DevBoost 作为主控，检测到复杂编码任务时自动调用 Claude Code CLI。

```typescript
if (task.complexity > threshold) {
  const result = await spawnClaudeCode({
    prompt: task.description,
    cwd: projectPath
  });
  return parseClaudeCodeOutput(result);
}
```

### 8.2 调用流程

```
┌─────────────────┐    检测到复杂编码任务    ┌──────────────────┐
│   DevBoost      │ ─────────────────────► │  Claude Code CLI │
│   (主控)        │                          │                  │
└─────────────────┘                          └──────────────────┘
        │                                              │
        │ ◄──────────────────── 返回结果 ──────────────┤
        │                                              │
        ▼                                              ▼
  继续处理任务                                  完成编码
```

---

## 9. 错误处理与恢复

### 9.1 错误分类

| 错误类型 | 示例 | 处理策略 |
|----------|------|----------|
| LLM API 错误 | 限流、超时 | 切换提供商、重试 |
| 工具调用失败 | 烧录失败 | 回滚、诊断、提供建议 |
| 浏览器异常 | 页面变化 | 截图、重试、备用流程 |
| 文件操作失败 | 权限、路径 | 提示用户、备用路径 |
| 网络问题 | 连接超时 | 重试、离线模式 |

### 9.2 恢复机制

```typescript
async function executeWithRetry<T>(
  operation: () => Promise<T>,
  context: ExecutionContext
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const recovery = await determineRecoveryStrategy(error, context);
    if (recovery) {
      return await recovery.execute();
    }
    throw error;
  }
}
```

---

## 10. 安装与启动体验

### 10.1 一键安装

```bash
curl -sSL https://get.devboost.dev/install.sh | sh

# 或使用 npm
npm install -g @devboost/cli
```

### 10.2 启动体验

```bash
mkdir my-embedded-project
cd my-embedded-project
DevBoost    # 不区分大小写
```

### 10.3 项目目录结构

启动时自动创建 `.devboost` 目录：

```
my-embedded-project/
├── .devboost/              # 自动创建
│   ├── config.json         # 项目配置
│   ├── skills/             # 自定义 Skills
│   ├── history/            # 聊天记录
│   ├── context/            # 上下文缓存
│   ├── cache/              # 其他缓存
│   └── session.json        # 会话状态
└── [用户项目文件]
```

### 10.4 配置优先级

```
项目配置 (.devboost/config.json)
    ↓ (未找到)
全局配置 (~/.devboost/config.json)
    ↓ (未找到)
默认配置
```

### 10.5 特殊指令

```
/devboost init          # 初始化项目
/devboost clean         # 清理缓存
/devboost reset         # 重置配置
/devboost info          # 显示项目信息
```

### 10.6 跨平台命令支持

| 平台 | 实现方式 |
|------|----------|
| Linux/macOS | 可执行文件 + 符号链接 |
| Windows | `devboost.cmd` 批处理文件 |

---

## 11. 测试策略

### 11.1 测试分层

```
packages/*/test/
├── unit/                # 单元测试
├── integration/         # 集成测试
└── e2e/                # 端到端测试
```

| 层级 | 覆盖内容 | 工具 |
|------|----------|------|
| 单元测试 | 各模块函数、工具类 | Vitest |
| 集成测试 | 模块间交互、API 调用 | Vitest + MSW |
| E2E 测试 | 完整用户流程 | Playwright |

### 11.2 特殊测试场景

- **嵌入式工具自动化**: Mock 工具输出，验证调用参数
- **浏览器自动化**: 本地测试页面，验证操作序列
- **烧录流程**: 模拟烧录器响应，验证完整流程

---

## 12. 部署与分发

### 12.1 打包方案

- 使用 `pkg` 或 `nexe` 打包为单一可执行文件
- 分别构建 Windows、Linux、macOS 版本
- 包含必要依赖（Playwright 浏览器、原生模块）

### 12.2 分发方式

```bash
# npm 安装
npm install -g @devboost/cli

# 或下载独立二进制
curl -L https://github.com/xxx/devboost/releases/latest/download/devboost-linux -o devboost
chmod +x devboost
```

### 12.3 更新机制

- 内置版本检查
- 提示更新
- 支持自动更新（可选）

---

## 13. 实现阶段规划

### Phase 1: 基础框架（2-3周）
- [ ] Monorepo 搭建
- [ ] Core Agent 基础运行时
- [ ] TUI 基础界面
- [ ] LLM 提供商系统
- [ ] 安装与启动流程

### Phase 2: 嵌入式自动化（3-4周）
- [ ] 烧录器检测
- [ ] STM32CubeProgrammer 集成
- [ ] Keil5 项目文件解析
- [ ] CubeMX .ioc 文件操作

### Phase 3: 浏览器自动化（2-3周）
- [ ] Playwright 集成
- [ ] JLCPCB 平台自动化

### Phase 4: Claude Code 集成（1-2周）
- [ ] CLI 调用封装
- [ ] 结果解析

### Phase 5: 测试与优化（2-3周）
- [ ] 完善测试覆盖
- [ ] 性能优化
- [ ] 文档编写

---

## 14. 风险与挑战

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| GUI 自动化不稳定 | 核心功能受影响 | 优先使用文件/CLI，GUI 作为兜底 |
| 工具版本兼容性 | 功能失效 | 支持多版本，提供版本检测 |
| 跨平台差异 | 开发复杂度增加 | 使用成熟跨平台库，充分测试 |

---

## 15. 后续扩展

- 支持更多嵌入式 IDE（IAR、Microchip Studio）
- 支持更多 PCB 平台（EasyEDA、PCBWay）
- 插件系统，允许用户扩展功能
- 可视化配置界面（Web UI）

---

**文档版本**: 1.0
**最后更新**: 2026-03-20
