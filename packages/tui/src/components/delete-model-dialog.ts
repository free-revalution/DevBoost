/**
 * Delete Model Dialog Component
 *
 * Shows a list of models for deletion with confirmation.
 */

import blessed from 'blessed';

export interface ModelInfo {
	id: string;
	name: string;
}

export class DeleteModelDialog {
	private screen: ReturnType<typeof blessed.screen>;
	dialog!: ReturnType<typeof blessed.box>;
	list!: ReturnType<typeof blessed.list>;

	constructor(screen: ReturnType<typeof blessed.screen>) {
		this.screen = screen;
		this.createDialog();
	}

	private createDialog(): void {
		this.dialog = blessed.box({
			parent: this.screen,
			top: 'center',
			left: 'center',
			width: 55,
			height: 14,
			tags: true,
			border: { type: 'line' },
			label: ' 🗑️  删除模型 ',
			style: {
				fg: '#cdd6f4',
				bg: '#1e1e2e',
				border: { fg: '#f38ba8' }
			}
		});

		// 警告提示
		const warning = blessed.box({
			parent: this.dialog,
			top: 1,
			left: 1,
			width: '100%-2',
			height: 1,
			tags: true,
			content: '{yellow-fg}⚠️  选择要删除的模型（此操作不可撤销）{/yellow-fg}',
			style: { fg: '#f9e2af' }
		});

		// 模型列表
		this.list = blessed.list({
			parent: this.dialog,
			top: 3,
			left: 1,
			width: '100%-2',
			height: 7,
			tags: true,
			style: {
				fg: '#cdd6f4',
				bg: '#1e1e2e',
				selected: {
					bg: '#313244',
					fg: '#f38ba8'
				}
			},
			keys: true,
			vi: true,
			scrollable: true
		});

		// 提示
		const hint = blessed.box({
			parent: this.dialog,
			bottom: 1,
			left: 1,
			width: '100%-2',
			height: 1,
			tags: true,
			content: '{gray-fg}↑↓ 选择 • Enter 删除 • Esc 取消{/gray-fg}'
		});
	}

	/**
	 * 显示删除确认对话框
	 */
	async show(models: ModelInfo[]): Promise<string | null> {
		// 填充列表
		this.list.setItems(
			models.map(m => `  🗑️  {gray-fg}[${m.id}]{/gray-fg} ${m.name}`)
		);
		this.list.select(0);

		// 键盘处理
		this.list.key(['escape', 'q'], () => {
			this.destroy();
			(this.list as any).resolve?.(null);
		});

		this.list.key(['enter', 'return'], () => {
			const index = (this.list as any).selected || 0;
			const modelId = models[index].id;
			this.destroy();
			(this.list as any).resolve?.(modelId);
		});

		// 上下导航
		this.list.key(['up', 'k'], () => {
			const current = (this.list as any).selected || 0;
			if (current > 0) {
				this.list.select(current - 1);
				this.screen.render();
			}
		});

		this.list.key(['down', 'j'], () => {
			const current = (this.list as any).selected || 0;
			if (current < models.length - 1) {
				this.list.select(current + 1);
				this.screen.render();
			}
		});

		this.dialog.focus();
		this.list.focus();
		this.screen.render();

		return new Promise((resolve) => {
			(this.list as any).resolve = resolve;
		});
	}

	private destroy(): void {
		this.dialog.destroy();
		this.screen.render();
	}
}
