/**
 * Add Model Wizard Component
 *
 * Step-by-step wizard for adding a new model:
 * 1. 模型供应商 (Provider)
 * 2. 模型名称 (Name)
 * 3. URL
 * 4. API Key
 */

import blessed from 'blessed';

export interface AddModelResult {
	provider: string;
	name: string;
	url: string;
	apiKey: string;
}

interface WizardStep {
	id: keyof AddModelResult;
	prompt: string;
	placeholder: string;
	description: string;
	validate?: (value: string) => true | string;
	password?: boolean;
}

const PROVIDER_OPTIONS = [
	{ value: 'anthropic', label: 'Anthropic (Claude)' },
	{ value: 'openai', label: 'OpenAI (GPT)' },
	{ value: 'openai-compatible', label: 'OpenAI 兼容 API' },
	{ value: 'ollama', label: 'Ollama (本地模型)' },
	{ value: 'deepseek', label: 'DeepSeek' },
	{ value: 'custom', label: '自定义/其他' }
];

export class AddModelWizard {
	private screen: ReturnType<typeof blessed.screen>;
	private form: any;
	private currentStep: number = 0;
	private formData: Partial<AddModelResult> = {};
	private providerSelectIndex: number = 0;

	// 向导步骤定义（按指定顺序）
	private readonly steps: WizardStep[] = [
		{
			id: 'provider',
			prompt: '📦 模型供应商',
			placeholder: '使用 ↑↓ 选择供应商',
			description: '选择你的模型提供商',
			validate: (value: string) => {
				const validProviders = PROVIDER_OPTIONS.map(p => p.value);
				return validProviders.includes(value) || '请选择有效的供应商';
			}
		},
		{
			id: 'name',
			prompt: '🏷️  模型名称',
			placeholder: '例如: DeepSeek V3, GPT-4o, Claude 3.5 Sonnet',
			description: '给你的模型起一个容易识别的名称',
			validate: (value: string) => value.trim().length > 0 || '模型名称不能为空'
		},
		{
			id: 'url',
			prompt: '🌐 API 地址 (URL)',
			placeholder: '例如: https://api.deepseek.com/v1',
			description: '输入你的 API 端点地址（Ollama 本地通常是 http://localhost:11434）',
			validate: (value: string) => {
				const urlPattern = /^https?:\/\/.+/i;
				return urlPattern.test(value.trim()) || '请输入有效的 URL（以 http:// 或 https:// 开头）';
			}
		},
		{
			id: 'apiKey',
			prompt: '🔑 API 密钥',
			placeholder: '粘贴你的 API Key（输入时会隐藏显示）',
			description: '你的 API 密钥会被安全存储在本地',
			password: true,
			validate: (value: string) => value.trim().length > 5 || 'API Key 太短，请检查'
		}
	];

	constructor(screen: ReturnType<typeof blessed.screen>) {
		this.screen = screen;
		this.createWizard();
		this.setupKeyHandlers();
	}

	private createWizard(): void {
		// 创建向导容器
		const wizardBox = blessed.box({
			parent: this.screen,
			top: 'center',
			left: 'center',
			width: 75,
			height: 17,
			tags: true,
			border: { type: 'line' },
			style: {
				fg: '#cdd6f4',
				bg: '#1e1e2e',
				border: { fg: '#89b4fa' }
			}
		});

		// 进度指示器
		const progress = blessed.box({
			parent: wizardBox,
			top: 1,
			left: 2,
			width: '100%-4',
			height: 1,
			tags: true,
			content: ''
		});

		// 问题显示区域
		const questionBox = blessed.box({
			parent: wizardBox,
			top: 3,
			left: 2,
			width: '100%-4',
			height: 1,
			tags: true,
			content: ''
		});

		// 供应商选择列表（仅在第一步显示）
		const providerList = blessed.list({
			parent: wizardBox,
			top: 5,
			left: 2,
			width: '100%-4',
			height: 8,
			tags: true,
			hidden: true,
			style: {
				fg: '#cdd6f4',
				bg: '#1e1e2e',
				selected: {
					bg: '#313244',
					fg: '#89b4fa',
					bold: true
				}
			},
			keys: true,
			vi: true,
			items: PROVIDER_OPTIONS.map(p => `  ${p.label}`)
		});

		// 输入框
		const input = blessed.textbox({
			parent: wizardBox,
			top: 6,
			left: 2,
			width: '100%-4',
			height: 3,
			tags: true,
			inputOnFocus: true,
			style: {
				fg: '#cdd6f4',
				bg: '#313244',
				focus: {
					bg: '#45475a'
				}
			}
		});

		// 描述/帮助文本
		const description = blessed.box({
			parent: wizardBox,
			top: 10,
			left: 2,
			width: '100%-4',
			height: 2,
			tags: true,
			content: ''
		});

		// 错误提示
		const error = blessed.box({
			parent: wizardBox,
			top: 12,
			left: 2,
			width: '100%-4',
			height: 1,
			tags: true,
			content: '',
			style: { fg: '#f38ba8' }
		});

		// 操作提示
		const hint = blessed.box({
			parent: wizardBox,
			bottom: 1,
			left: 2,
			width: '100%-4',
			height: 1,
			tags: true,
			content: '{gray-fg}Enter 继续 • Esc 取消{/gray-fg}'
		});

		this.form = {
			box: wizardBox,
			progress,
			question: questionBox,
			providerList,
			input,
			description,
			error,
			hint,
			destroy: () => wizardBox.destroy()
		};
	}

	/**
	 * 运行向导
	 */
	async run(): Promise<AddModelResult | null> {
		this.renderStep(0);
		this.form.box.focus();

		return new Promise((resolve) => {
			(this.form as any).resolve = resolve;
		});
	}

	/**
	 * 渲染当前步骤
	 */
	private renderStep(stepIndex: number): void {
		const step = this.steps[stepIndex];

		// 更新进度
		const progressDots = this.steps.map((_, i) =>
			i === stepIndex ? '{cyan-fg}●{/cyan-fg}' :
			i < stepIndex ? '{green-fg}●{/green-fg}' :
			'{gray-fg}○{/gray-fg}'
		).join(' ');
		this.form.progress.setContent(progressDots);

		// 更新问题
		this.form.question.setContent(`{bold}${step.prompt}{/bold}`);

		// 更新描述
		this.form.description.setContent(`{gray-fg}${step.description}{/gray-fg}`);

		// 清除错误
		this.form.error.setContent('');

		// 第一步：供应商选择
		if (step.id === 'provider') {
			this.form.input.hidden = true;
			this.form.providerList.hidden = false;
			this.form.providerList.select(this.providerSelectIndex);
			this.form.providerList.focus();
		} else {
			this.form.providerList.hidden = true;
			this.form.input.hidden = false;
			this.form.input.clearValue();
			this.form.input.placeholder = step.placeholder;
			if (step.password) {
				(this.form.input as any).censor = true;
			} else {
				(this.form.input as any).censor = false;
			}
			this.form.input.focus();
		}

		// 更新提示
		let hintText = '{gray-fg}';
		if (step.id === 'provider') {
			hintText += '↑↓ 选择 • Enter 确认';
		} else {
			hintText += '输入内容后按 Enter 继续';
		}
		if (stepIndex > 0) {
			hintText += ' • ← 上一步';
		}
		hintText += ' • Esc 取消{/gray-fg}';
		this.form.hint.setContent(hintText);

		this.screen.render();
	}

	/**
	 * 设置键盘处理
	 */
	private setupKeyHandlers(): void {
		// 供应商列表键盘处理
		this.form.providerList.key(['up', 'k'], () => {
			const current = this.form.providerList.selected;
			if (current > 0) {
				this.form.providerList.select(current - 1);
				this.providerSelectIndex = current - 1;
				this.screen.render();
			}
		});

		this.form.providerList.key(['down', 'j'], () => {
			const current = this.form.providerList.selected;
			if (current < PROVIDER_OPTIONS.length - 1) {
				this.form.providerList.select(current + 1);
				this.providerSelectIndex = current + 1;
				this.screen.render();
			}
		});

		this.form.providerList.key(['enter', 'return'], () => {
			this.formData.provider = PROVIDER_OPTIONS[this.providerSelectIndex].value;
			this.nextStep();
		});

		// 输入框键盘处理
		this.form.input.key(['enter', 'return'], () => {
			this.handleInputSubmit();
		});

		this.form.input.key(['left', 'h'], () => {
			if (this.currentStep > 0) {
				// 如果在第一步（供应商选择），返回无效
				if (this.currentStep === 1) {
					this.currentStep = 0;
					this.renderStep(0);
				} else if (this.currentStep > 1) {
					this.currentStep--;
					this.renderStep(this.currentStep);
				}
			}
		});

		this.form.box.key(['escape', 'C-c'], () => {
			this.cancel();
		});
	}

	private handleInputSubmit(): void {
		const step = this.steps[this.currentStep];
		const value = this.form.input.value;

		// 验证输入
		if (step.validate) {
			const result = step.validate(value);
			if (result !== true) {
				this.form.error.setContent(`{red-fg}✗ ${result}{/red-fg}`);
				this.screen.render();
				return;
			}
		}

		// 保存数据
		this.formData[step.id] = value.trim();

		// 下一步
		if (this.currentStep < this.steps.length - 1) {
			this.currentStep++;
			this.renderStep(this.currentStep);
		} else {
			// 完成
			this.finish();
		}
	}

	private nextStep(): void {
		if (this.currentStep < this.steps.length - 1) {
			this.currentStep++;
			this.renderStep(this.currentStep);
		}
	}

	private finish(): void {
		this.form.destroy();
		this.screen.render();
		(this.form as any).resolve?.(this.formData as AddModelResult);
	}

	private cancel(): void {
		this.form.destroy();
		this.screen.render();
		(this.form as any).resolve?.(null);
	}
}
