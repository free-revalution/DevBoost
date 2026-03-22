# 模型配置指南

## 如何添加模型

### 方式一：交互式添加（推荐）

启动 DevBoost 后，使用以下命令：

```
/model add
```

然后按照提示输入：

```
1. 设置提供商
/model provider anthropic

2. 设置模型名称
/model name claude-3-5-sonnet-20241022

3. 设置 API Key
/model key sk-ant-your-api-key-here

4. 设置 Base URL（可选）
/model url https://api.anthropic.com

5. 确认添加
/model confirm
```

### 方式二：直接添加所有参数

```
/model provider <provider>
/model name <model-name>
/model key <api-key>
/model url <base-url>
/model confirm
```

## 支持的提供商

### 1. Anthropic Claude

```
Provider: anthropic
Model Names:
  - claude-3-5-sonnet-20241022
  - claude-3-opus-20240229

API Key: sk-ant-xxxxx
Base URL: 通常不需要（可选）
```

### 2. OpenAI

```
Provider: openai
Model Names:
  - gpt-4
  - gpt-4-turbo
  - gpt-3.5-turbo

API Key: sk-xxxxx
Base URL: https://api.openai.com/v1
```

### 3. OpenAI Compatible (兼容 API)

```
Provider: openai-compatible
Model Names: 取决于服务商
API Key: 取决于服务商
Base URL: 必须填写（如 https://your-api.com/v1）
```

### 4. Ollama (本地)

```
Provider: ollama
Model Names:
  - llama2
  - mistral
  - codellama

API Key: 不需要（可填任意值）
Base URL: http://localhost:11434/v1（或留空使用默认）
```

## 管理模型

### 查看所有模型

```
/model list
```

### 切换模型

```
/model switch <model-id>
```

### 删除模型

```
/model remove <model-id>
```

### 取消添加

```
/model cancel
```

## 环境变量方式（备选）

你也可以通过环境变量设置 API Key：

```bash
# Anthropic
export ANTHROPIC_API_KEY="sk-ant-xxxxx"

# OpenAI
export OPENAI_API_KEY="sk-xxxxx"

# Ollama (可选)
export OLLAMA_API_KEY="any-value"
```

## 配置文件位置

```
.devboost/
├── config.json       # 元数据配置
├── models.json       # 模型配置（含 API Key）
└── context/          # 对话记录
    └── context.json
```

## 常见问题

### Q: 添加模型后无法使用？

A: 检查以下几点：
1. API Key 是否正确
2. 模型名称是否拼写正确
3. 是否使用 `/agent start` 启动了 Agent
4. Base URL 是否正确（OpenAI Compatible 必填）

### Q: 如何使用自定义 OpenAI 兼容 API？

A:
1. 选择 `openai-compatible` 提供商
2. 填写你的 API Key
3. **必须填写** Base URL（如 `https://your-service.com/v1`）

### Q: Ollama 无法连接？

A:
1. 确保 Ollama 正在运行：`ollama serve`
2. 检查端口：默认 `http://localhost:11434/v1`
3. 可以不填 API Key（或填任意值）
