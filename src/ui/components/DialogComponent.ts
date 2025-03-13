import * as vscode from 'vscode';
import { BaseUIComponent } from '../BaseUIComponent';
import { UIComponentType, UIComponentState, UIComponentMessage, UIComponentConfig } from '../IUIComponent';

// 扩展UIComponentType枚举
// 注意：这是一个临时解决方案，实际应该在IUIComponent.ts中添加DIALOG类型
declare module '../IUIComponent' {
  export enum UIComponentType {
    DIALOG = 'dialog'
  }
}

/**
 * 对话框类型枚举
 */
export enum DialogType {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  QUESTION = 'question',
  INPUT = 'input',
  QUICK_PICK = 'quickPick',
  MULTI_STEP = 'multiStep'
}

/**
 * 对话框按钮接口
 */
export interface DialogButton {
  id: string;
  label: string;
  isDefault?: boolean;
}

/**
 * 对话框选项接口
 */
export interface DialogOption {
  id: string;
  label: string;
  description?: string;
  detail?: string;
  picked?: boolean;
}

/**
 * 对话框配置接口
 */
export interface DialogConfig extends Omit<UIComponentConfig, 'title'> {
  type: DialogType;
  title?: string;
  message: string;
  detail?: string;
  buttons?: DialogButton[];
  options?: DialogOption[];
  placeholder?: string;
  ignoreFocusOut?: boolean;
  password?: boolean;
  canPickMany?: boolean;
  step?: number;
  totalSteps?: number;
}

/**
 * 对话框组件类
 * 
 * 提供各种类型的对话框功能
 */
export class DialogComponent extends BaseUIComponent {
  protected _result: any;
  protected _isOpen: boolean = false;
  
  /**
   * 构造函数
   */
  constructor() {
    super();
    this._type = UIComponentType.DIALOG;
  }
  
  /**
   * 初始化回调
   */
  protected async onInitialize(): Promise<void> {
    // 对话框不需要特殊初始化
  }
  
  /**
   * 渲染对话框
   * 
   * @returns 对话框结果
   */
  public async render(): Promise<any> {
    const type = this.getConfigValue<DialogType>('type', DialogType.INFO);
    
    switch (type) {
      case DialogType.INFO:
        return this.showInformationMessage();
      case DialogType.WARNING:
        return this.showWarningMessage();
      case DialogType.ERROR:
        return this.showErrorMessage();
      case DialogType.QUESTION:
        return this.showQuestionMessage();
      case DialogType.INPUT:
        return this.showInputBox();
      case DialogType.QUICK_PICK:
        return this.showQuickPick();
      case DialogType.MULTI_STEP:
        return this.showMultiStepInput();
      default:
        return undefined;
    }
  }
  
  /**
   * 显示信息消息对话框
   * 
   * @returns 选择的按钮ID
   */
  protected async showInformationMessage(): Promise<string | undefined> {
    const message = this.getConfigValue<string>('message', '');
    const buttons = this.getConfigValue<DialogButton[]>('buttons', []);
    const buttonLabels = buttons.map(button => button.label);
    
    this._isOpen = true;
    const result = await vscode.window.showInformationMessage(message, ...buttonLabels);
    this._isOpen = false;
    
    if (!result) {
      return undefined;
    }
    
    const selectedButton = buttons.find(button => button.label === result);
    return selectedButton?.id;
  }
  
  /**
   * 显示警告消息对话框
   * 
   * @returns 选择的按钮ID
   */
  protected async showWarningMessage(): Promise<string | undefined> {
    const message = this.getConfigValue<string>('message', '');
    const buttons = this.getConfigValue<DialogButton[]>('buttons', []);
    const buttonLabels = buttons.map(button => button.label);
    
    this._isOpen = true;
    const result = await vscode.window.showWarningMessage(message, ...buttonLabels);
    this._isOpen = false;
    
    if (!result) {
      return undefined;
    }
    
    const selectedButton = buttons.find(button => button.label === result);
    return selectedButton?.id;
  }
  
  /**
   * 显示错误消息对话框
   * 
   * @returns 选择的按钮ID
   */
  protected async showErrorMessage(): Promise<string | undefined> {
    const message = this.getConfigValue<string>('message', '');
    const buttons = this.getConfigValue<DialogButton[]>('buttons', []);
    const buttonLabels = buttons.map(button => button.label);
    
    this._isOpen = true;
    const result = await vscode.window.showErrorMessage(message, ...buttonLabels);
    this._isOpen = false;
    
    if (!result) {
      return undefined;
    }
    
    const selectedButton = buttons.find(button => button.label === result);
    return selectedButton?.id;
  }
  
  /**
   * 显示问题消息对话框
   * 
   * @returns 选择的按钮ID
   */
  protected async showQuestionMessage(): Promise<string | undefined> {
    // VSCode没有专门的问题对话框，使用信息对话框代替
    return this.showInformationMessage();
  }
  
  /**
   * 显示输入框对话框
   * 
   * @returns 输入的文本
   */
  protected async showInputBox(): Promise<string | undefined> {
    const message = this.getConfigValue<string>('message', '');
    const placeholder = this.getConfigValue<string>('placeholder', '');
    const password = this.getConfigValue<boolean>('password', false);
    const ignoreFocusOut = this.getConfigValue<boolean>('ignoreFocusOut', false);
    
    this._isOpen = true;
    const result = await vscode.window.showInputBox({
      prompt: message,
      placeHolder: placeholder,
      password,
      ignoreFocusOut
    });
    this._isOpen = false;
    
    return result;
  }
  
  /**
   * 显示快速选择对话框
   * 
   * @returns 选择的选项ID或ID数组
   */
  protected async showQuickPick(): Promise<string | string[] | undefined> {
    const title = this.getConfigValue<string>('title', '');
    const placeholder = this.getConfigValue<string>('placeholder', '');
    const ignoreFocusOut = this.getConfigValue<boolean>('ignoreFocusOut', false);
    const canPickMany = this.getConfigValue<boolean>('canPickMany', false);
    const options = this.getConfigValue<DialogOption[]>('options', []);
    
    const quickPickOptions: vscode.QuickPickItem[] = options.map(option => ({
      label: option.label,
      description: option.description,
      detail: option.detail,
      picked: option.picked
    }));
    
    this._isOpen = true;
    const result = await vscode.window.showQuickPick(quickPickOptions, {
      title,
      placeHolder: placeholder,
      ignoreFocusOut,
      canPickMany
    });
    this._isOpen = false;
    
    if (!result) {
      return undefined;
    }
    
    if (Array.isArray(result)) {
      // 多选模式
      return result.map(item => {
        const option = options.find(o => o.label === item.label);
        return option?.id || '';
      }).filter(id => id !== '');
    } else {
      // 单选模式
      const option = options.find(o => o.label === result.label);
      return option?.id;
    }
  }
  
  /**
   * 显示多步骤输入对话框
   * 
   * @returns 当前步骤的结果
   */
  protected async showMultiStepInput(): Promise<any> {
    // 简单实现，实际应用中可能需要更复杂的多步骤输入逻辑
    const step = this.getConfigValue<number>('step', 1);
    const totalSteps = this.getConfigValue<number>('totalSteps', 1);
    const title = this.getConfigValue<string>('title', '');
    const message = this.getConfigValue<string>('message', '');
    
    // 根据当前步骤类型显示不同的输入界面
    const type = this.getConfigValue<DialogType>('type', DialogType.INPUT);
    
    // 创建输入框标题，包含步骤信息
    const stepTitle = totalSteps > 1 ? `${title} (${step}/${totalSteps})` : title;
    
    // 更新配置
    this._config = {
      ...this._config,
      title: stepTitle
    };
    
    // 根据类型显示不同的输入界面
    if (type === DialogType.INPUT) {
      return this.showInputBox();
    } else if (type === DialogType.QUICK_PICK) {
      return this.showQuickPick();
    } else {
      return this.showInformationMessage();
    }
  }
  
  /**
   * 更新回调
   * 
   * @param data 更新数据
   */
  protected onUpdate(data: any): void {
    // 对话框通常不需要更新，因为它们是一次性的
  }
  
  /**
   * 显示回调
   */
  protected onShow(): void {
    // 对话框通过render方法显示
  }
  
  /**
   * 隐藏回调
   */
  protected onHide(): void {
    // 对话框无法手动隐藏
  }
  
  /**
   * 发送消息回调
   * 
   * @param message 消息
   */
  protected onPostMessage(message: UIComponentMessage): void {
    // 对话框不支持消息
  }
  
  /**
   * 处理消息回调
   * 
   * @param message 消息
   * @returns 处理结果
   */
  protected async onHandleMessage(message: UIComponentMessage): Promise<any> {
    // 对话框不支持消息
    return null;
  }
  
  /**
   * 销毁回调
   */
  protected onDispose(): void {
    // 对话框不需要特殊销毁逻辑
  }
  
  /**
   * 是否打开
   */
  public isOpen(): boolean {
    return this._isOpen;
  }
}
