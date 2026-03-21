export interface ParsedCommand {
  command: string;
  action?: string;
  args: string[];
}

export class CommandHandler {
  private commands = ['help', 'provider', 'devboost', 'clear'];

  parse(input: string): ParsedCommand | null {
    if (!input.startsWith('/')) return null;
    const parts = input.slice(1).split(/\s+/).filter(p => p.length > 0);
    const command = parts[0];
    if (!this.commands.includes(command)) return null;
    return { command, action: parts[1], args: parts.slice(2) };
  }

  async execute(command: ParsedCommand): Promise<string> {
    switch (command.command) {
      case 'help': return this.getHelp();
      case 'provider': return this.handleProvider(command);
      case 'devboost': return this.handleDevBoost(command);
      case 'clear': return 'Screen cleared.';
      default: return 'Unknown command';
    }
  }

  private getHelp(): string {
    return `Available commands:
  /help              Show this help
  /provider add      Add a new LLM provider
  /provider use      Switch to a provider
  /devboost init     Initialize project
  /clear             Clear screen`;
  }

  private handleProvider(command: ParsedCommand): string {
    if (!command.action) return 'Usage: /provider <add|use|list|remove> [args]';
    return `Provider: ${command.action} ${command.args.join(' ')}`;
  }

  private handleDevBoost(command: ParsedCommand): string {
    if (!command.action) return 'Usage: /devboost <init|clean|reset|info>';
    return `DevBoost: ${command.action}`;
  }
}
