# DevBoost

**Cross-platform embedded development agent**

DevBoost is an AI-powered development assistant designed for embedded systems and PCB development. It provides intelligent automation for code generation, testing, and documentation.

## Features

- **LLM Integration**: Support for multiple LLM providers (OpenAI, Anthropic, local models)
- **Browser Automation**: Automated interaction with PCB platforms and documentation
- **Desktop Automation**: Screen control and keyboard/mouse automation
- **TUI Interface**: Interactive terminal-based UI for agent control
- **CLI Tools**: Command-line interface for quick operations

## Quick Start

### Installation

```bash
npm install -g @devboost/cli
```

### Initialize a Project

```bash
mkdir my-project
cd my-project
DevBoost
```

## Commands

- `/help` - Show help and available commands
- `/provider add <name>` - Add an LLM provider
- `/devboost init` - Initialize a new DevBoost project

## Development

### Build All Packages

```bash
pnpm build
```

### Run Tests

```bash
pnpm test
```

### Install from Source

```bash
./scripts/install.sh
```

## Project Structure

```
DevBoost/
├── packages/
│   ├── cli/         # Command-line interface
│   ├── core/        # Core agent runtime
│   ├── llm/         # LLM provider integrations
│   ├── tui/         # Terminal UI components
│   ├── browser/     # Browser automation
│   └── automation/  # Desktop automation
├── docs/            # Documentation
└── scripts/         # Build and install scripts
```

## Requirements

- Node.js 22+
- pnpm 9+

## License

MIT
