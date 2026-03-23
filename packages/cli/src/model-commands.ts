/**
 * Model Management Commands
 *
 * Interactive model management using TUI components.
 * All old implementation has been removed and replaced.
 */

import blessed from 'blessed';
import { ConfigManager } from './config.js';
import { ModelMenu, AddModelWizard, DeleteModelDialog } from '@devboost/tui';

export class ModelCommands {
	constructor(private configManager: ConfigManager) {}

	/**
	 * Handle /model command - show interactive menu
	 */
	async handleModelCommand(screen: ReturnType<typeof blessed.screen>): Promise<string> {
		// 获取所有模型
		const models = await this.configManager.getAllModels();
		const currentModel = await this.configManager.getCurrentModel();

		// 如果没有模型，显示引导
		if (models.length === 0) {
			return await this.showFirstTimeWizard(screen);
		}

		// 显示模型菜单
		const menu = new ModelMenu(screen);
		menu.init();
		const result = await menu.show(
			models.map(m => ({
				id: m.id,
				name: m.modelName,
				provider: m.provider,
				description: m.baseUrl
			})),
			currentModel?.id || ''
		);

		// 处理结果
		switch (result.action) {
			case 'select':
				return await this.handleModelSelect(result.modelId!);

			case 'add':
				return await this.showAddModelWizard(screen);

			case 'delete':
				return await this.showDeleteModelDialog(screen, models);

			case 'cancel':
				return '操作已取消';
		}
	}

	/**
	 * 首次使用向导
	 */
	private async showFirstTimeWizard(screen: ReturnType<typeof blessed.screen>): Promise<string> {
		const welcomeBox = blessed.box({
			parent: screen,
			top: 'center',
			left: 'center',
			width: 60,
			height: 12,
			tags: true,
			border: { type: 'line' },
			label: ' 🎉 欢迎使用 DevBoost ',
			style: {
				fg: '#cdd6f4',
				bg: '#1e1e2e',
				border: { fg: '#89b4fa' }
			}
		});

		const content = blessed.box({
			parent: welcomeBox,
			top: 2,
			left: 2,
			width: '100%-4',
			height: 6,
			tags: true,
			content: `
{bold}{cyan-fg}还没有配置任何模型{/cyan-fg}{/bold}

为了让 DevBoost 工作，你需要添加至少一个模型。

{green-fg}按任意键继续，或按 Esc 取消{/green-fg}
`
		});

		screen.render();

		// 等待用户按键
		return new Promise((resolve) => {
			const keyHandler = (_ch: any, key: any) => {
				if (key.name === 'escape') {
					welcomeBox.destroy();
					screen.render();
					screen.removeKey('escape', keyHandler);
					screen.removeKey('a', keyHandler);
					screen.removeKey('A', keyHandler);
					screen.removeKey('enter', keyHandler);
					screen.removeKey('return', keyHandler);
					resolve('操作已取消');
				} else {
					welcomeBox.destroy();
					screen.render();
					screen.removeKey('escape', keyHandler);
					screen.removeKey('a', keyHandler);
					screen.removeKey('A', keyHandler);
					screen.removeKey('enter', keyHandler);
					screen.removeKey('return', keyHandler);
					// 直接进入添加向导
					this.showAddModelWizard(screen).then(resolve);
				}
			};

			screen.key(['escape', 'a', 'A', 'enter', 'return'], keyHandler);
		});
	}

	/**
	 * 显示添加模型向导
	 */
	private async showAddModelWizard(screen: ReturnType<typeof blessed.screen>): Promise<string> {
		const wizard = new AddModelWizard(screen);
		const result = await wizard.run();

		if (!result) {
			return '操作已取消';
		}

		try {
			// 验证 URL 格式
			let baseUrl = result.url.trim();
			if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
				baseUrl = 'https://' + baseUrl;
			}

			// 添加模型
			const model = await this.configManager.addModel({
				provider: result.provider,
				modelName: result.name,
				apiKey: result.apiKey,
				baseUrl: baseUrl,
				maxTokens: 4096,
				temperature: 0.7
			});

			return `✓ 模型添加成功！

{bold}模型信息{/bold}
  ID: {cyan-fg}${model.id}{/cyan-fg}
  名称: ${result.name}
  供应商: ${result.provider}
  URL: ${baseUrl}

模型已就绪，可以开始使用。`;
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return `✗ 添加模型失败: ${message}`;
		}
	}

	/**
	 * 显示删除模型对话框
	 */
	private async showDeleteModelDialog(
		screen: ReturnType<typeof blessed.screen>,
		models: Array<{ id: string; modelName: string }>
	): Promise<string> {
		const dialog = new DeleteModelDialog(screen);
		const modelId = await dialog.show(
			models.map(m => ({ id: m.id, name: m.modelName }))
		);

		if (!modelId) {
			return '操作已取消';
		}

		const model = models.find(m => m.id === modelId);
		const success = await this.configManager.removeModel(modelId);

		if (success) {
			return `✓ 已删除模型: ${model?.modelName || modelId}`;
		}
		return `✗ 删除模型失败`;
	}

	/**
	 * 处理模型选择
	 */
	private async handleModelSelect(modelId: string): Promise<string> {
		const success = await this.configManager.switchModel(modelId);

		if (!success) {
			return `✗ 切换模型失败: ${modelId}`;
		}

		const model = await this.configManager.getModel(modelId);
		return `✓ 已切换到: ${model?.modelName || modelId}`;
	}
}
