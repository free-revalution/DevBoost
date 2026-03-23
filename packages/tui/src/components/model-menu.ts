/**
 * Interactive Model Menu Component
 *
 * Displays a selectable list of models with keyboard navigation.
 * Last two items are "Add Model" and "Delete Model" actions.
 */

import blessed from 'blessed';

export interface ModelInfo {
	id: string;
	name: string;
	provider: string;
	description?: string;
}

export interface MenuResult {
	action: 'select' | 'add' | 'delete' | 'cancel';
	modelId?: string;
}

export class ModelMenu {
	private screen: ReturnType<typeof blessed.screen>;
	box!: ReturnType<typeof blessed.list>;
	private items: Array<{ id: string; label: string; type: 'model' | 'separator' | 'action' }> = [];
	private resolve: ((value: MenuResult) => void) | null = null;

	constructor(screen: ReturnType<typeof blessed.screen>) {
		this.screen = screen;
		this.createMenu();
	}

	private createMenu(): void {
		this.box = blessed.list({
			parent: this.screen,
			top: 'center',
			left: 'center',
			width: 65,
			height: 16,
			tags: true,
			border: { type: 'line' },
			label: ' 🤖 模型管理 ',
			style: {
				fg: '#cdd6f4',
				bg: '#1e1e2e',
				border: { fg: '#89b4fa' },
				selected: {
					bg: '#313244',
					fg: '#89b4fa',
					bold: true
				},
				item: {
					hover: {
						bg: '#313244'
					}
				}
			},
			keys: true,
			vi: true,
			mouse: true,
			scrollable: true,
			alwaysScroll: true
		});
	}

	/**
	 * 显示模型选择菜单
	 */
	async show(models: ModelInfo[], currentModelId: string): Promise<MenuResult> {
		this.items = this.buildMenuItems(models, currentModelId);
		this.render();
		this.box.focus();

		return new Promise((resolve) => {
			this.resolve = resolve;
		});
	}

	/**
	 * 构建菜单项
	 */
	private buildMenuItems(models: ModelInfo[], currentId: string): Array<{ id: string; label: string; type: 'model' | 'separator' | 'action' }> {
		const modelItems = models.map(m => ({
			id: m.id,
			label: m.name + (m.id === currentId ? '                    {green-fg}[当前]{/green-fg}' : ''),
			type: 'model' as const
		}));

		// 添加分隔线
		const separator = {
			id: 'separator',
			label: '{gray-fg}' + '─'.repeat(58) + '{/gray-fg}',
			type: 'separator' as const
		};

		// 添加操作项
		const actions = [
			{
				id: 'add',
				label: '{green-fg}➕ 添加新模型...{/green-fg}',
				type: 'action' as const
			},
			{
				id: 'delete',
				label: '{red-fg}➖ 删除模型...{/red-fg}',
				type: 'action' as const
			}
		];

		return [...modelItems, separator, ...actions];
	}

	/**
	 * 渲染菜单
	 */
	private render(): void {
		const displayItems = this.items.map(item => `  ${item.label}`);
		this.box.setItems(displayItems);
		this.box.select(0);
		this.screen.render();
	}

	/**
	 * 设置键盘处理
	 */
	private setupKeyHandlers(): void {
		this.box.key(['up', 'k'], () => this.moveSelection(-1));
		this.box.key(['down', 'j'], () => this.moveSelection(1));
		this.box.key(['enter', 'return'], () => this.selectCurrent());
		this.box.key(['escape', 'q', 'C-c'], () => this.cancel());

		// 数字键快速选择
		for (let i = 1; i <= 9; i++) {
			this.box.key(String(i), () => this.selectByIndex(i - 1));
		}
	}

	private moveSelection(delta: number): void {
		const current = (this.box as any).selected || 0;
		let newItem = current + delta;

		// 边界检查
		if (newItem < 0) newItem = this.items.length - 1;
		if (newItem >= this.items.length) newItem = 0;

		// 跳过分隔线
		if (this.items[newItem]?.type === 'separator') {
			newItem = newItem + delta;
			if (newItem < 0) newItem = this.items.length - 1;
			if (newItem >= this.items.length) newItem = 0;
		}

		this.box.select(newItem);
		this.screen.render();
	}

	private selectCurrent(): void {
		const index = (this.box as any).selected || 0;
		const item = this.items[index];

		if (item.type === 'separator') {
			return;
		}

		this.close();
		const action = item.id === 'add' ? 'add' : item.id === 'delete' ? 'delete' : 'select';
		this.resolve?.({
			action,
			modelId: item.type === 'model' ? item.id : undefined
		});
	}

	private selectByIndex(index: number): void {
		if (index >= 0 && index < this.items.length) {
			this.box.select(index);
			this.selectCurrent();
		}
	}

	private cancel(): void {
		this.close();
		this.resolve?.({ action: 'cancel' });
	}

	private close(): void {
		this.box.destroy();
		this.screen.render();
	}

	destroy(): void {
		this.box.destroy();
	}

	// 初始化键盘处理
	init(): void {
		this.setupKeyHandlers();
	}
}
