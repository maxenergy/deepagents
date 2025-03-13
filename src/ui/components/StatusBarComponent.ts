import * as vscode from 'vscode';
import { BaseUIComponent } from '../BaseUIComponent';
import { UIComponentType, UIComponentState, UIComponentMessage, UIComponentConfig } from '../IUIComponent';

/**
 * 状态栏组件配置
 */
export interface StatusBarConfig extends UIComponentConfig {
  alignment?: 'left' | 'right';
  priority?: number;
  text?: string;
  tooltip?: string;
  command?: string;
  color?: string;
  backgroundColor?: string;
}

/**
 * 状态栏组件类
 * 
 * 提供状态栏功能的UI组件
 */
export class StatusBarComponent extends BaseUIComponent {
  protected _statusBarItem: vscode.StatusBarItem | undefined;
  
  /**
   * 构造函数
   */
  constructor() {
    super();
    this._type = UIComponentType.STATUS_BAR;
  }
  
  /**
   * 初始化回调
   */
  protected async onInitialize(): Promise<void> {
    // 创建状态栏项
    this._statusBarItem = this.createStatusBarItem();
    this.registerDisposable(this._statusBarItem);
    
    // 更新状态栏项
    this.updateStatusBarItem();
  }
  
  /**
   * 创建状态栏项
   * 
   * @returns 状态栏项
   */
  protected createStatusBarItem(): vscode.StatusBarItem {
    const alignment = this.getAlignment();
    const priority = this.getPriority();
    
    return vscode.window.createStatusBarItem(alignment, priority);
  }
  
  /**
   * 获取对齐方式
   * 
   * @returns 对齐方式
   */
  protected getAlignment(): vscode.StatusBarAlignment {
    const alignment = this.getConfigValue<'left' | 'right'>('alignment', 'left');
    return alignment === 'left' ? vscode.StatusBarAlignment.Left : vscode.StatusBarAlignment.Right;
  }
  
  /**
   * 获取优先级
   * 
   * @returns 优先级
   */
  protected getPriority(): number {
    return this.getConfigValue<number>('priority', 100);
  }
  
  /**
   * 更新状态栏项
   */
  protected updateStatusBarItem(): void {
    if (!this._statusBarItem) {
      return;
    }
    
    // 设置文本
    this._statusBarItem.text = this.getText();
    
    // 设置提示
    this._statusBarItem.tooltip = this.getTooltip();
    
    // 设置命令
    const command = this.getCommand();
    if (command) {
      this._statusBarItem.command = command;
    }
    
    // 设置颜色
    const color = this.getColor();
    if (color) {
      this._statusBarItem.color = color;
    }
    
    // 设置背景颜色
    const backgroundColor = this.getBackgroundColor();
    if (backgroundColor) {
      this._statusBarItem.backgroundColor = new vscode.ThemeColor(backgroundColor);
    }
  }
  
  /**
   * 获取文本
   * 
   * @returns 文本
   */
  protected getText(): string {
    return this.getConfigValue<string>('text', this._config.title);
  }
  
  /**
   * 获取提示
   * 
   * @returns 提示
   */
  protected getTooltip(): string {
    return this.getConfigValue<string>('tooltip', '');
  }
  
  /**
   * 获取命令
   * 
   * @returns 命令
   */
  protected getCommand(): string {
    return this.getConfigValue<string>('command', '');
  }
  
  /**
   * 获取颜色
   * 
   * @returns 颜色
   */
  protected getColor(): string {
    return this.getConfigValue<string>('color', '');
  }
  
  /**
   * 获取背景颜色
   * 
   * @returns 背景颜色
   */
  protected getBackgroundColor(): string {
    return this.getConfigValue<string>('backgroundColor', '');
  }
  
  /**
   * 渲染组件
   * 
   * @returns 状态栏项
   */
  public render(): vscode.StatusBarItem | undefined {
    if (this._statusBarItem) {
      this._statusBarItem.show();
    }
    return this._statusBarItem;
  }
  
  /**
   * 更新回调
   * 
   * @param data 更新数据
   */
  protected onUpdate(data: any): void {
    // 更新配置
    if (data) {
      for (const [key, value] of Object.entries(data)) {
        this._config[key] = value;
      }
    }
    
    // 更新状态栏项
    this.updateStatusBarItem();
  }
  
  /**
   * 显示回调
   */
  protected onShow(): void {
    this._statusBarItem?.show();
  }
  
  /**
   * 隐藏回调
   */
  protected onHide(): void {
    this._statusBarItem?.hide();
  }
  
  /**
   * 发送消息回调
   * 
   * @param message 消息
   */
  protected onPostMessage(message: UIComponentMessage): void {
    // 状态栏项不支持消息
  }
  
  /**
   * 处理消息回调
   * 
   * @param message 消息
   * @returns 处理结果
   */
  protected async onHandleMessage(message: UIComponentMessage): Promise<any> {
    // 状态栏项不支持消息
    return null;
  }
  
  /**
   * 销毁回调
   */
  protected onDispose(): void {
    this._statusBarItem?.dispose();
    this._statusBarItem = undefined;
  }
}
