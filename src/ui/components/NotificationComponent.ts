import * as vscode from 'vscode';
import { BaseUIComponent } from '../BaseUIComponent';
import { UIComponentType, UIComponentState, UIComponentMessage, UIComponentConfig } from '../IUIComponent';

// 扩展UIComponentType枚举
// 注意：这是一个临时解决方案，实际应该在IUIComponent.ts中添加NOTIFICATION类型
declare module '../IUIComponent' {
  export enum UIComponentType {
    NOTIFICATION = 'notification'
  }
}

/**
 * 通知类型枚举
 */
export enum NotificationType {
  INFORMATION = 'information',
  WARNING = 'warning',
  ERROR = 'error',
  PROGRESS = 'progress'
}

/**
 * 通知配置接口
 */
export interface NotificationConfig extends Omit<UIComponentConfig, 'title'> {
  type: NotificationType;
  message: string;
  detail?: string;
  duration?: number; // 持续时间（毫秒），仅用于非进度类型通知
  buttons?: Array<{
    id: string;
    title: string;
  }>;
  cancellable?: boolean; // 仅用于进度类型通知
  location?: vscode.ProgressLocation; // 仅用于进度类型通知
  increment?: number; // 仅用于进度类型通知
}

/**
 * 通知组件类
 * 
 * 提供各种类型的通知功能
 */
export class NotificationComponent extends BaseUIComponent {
  protected _notification: vscode.Disposable | undefined;
  protected _progress: vscode.Progress<{ message?: string; increment?: number }> | undefined;
  protected _token: vscode.CancellationTokenSource | undefined;
  protected _isShowing: boolean = false;
  
  /**
   * 构造函数
   */
  constructor() {
    super();
    this._type = UIComponentType.NOTIFICATION;
  }
  
  /**
   * 初始化回调
   */
  protected async onInitialize(): Promise<void> {
    // 通知不需要特殊初始化
  }
  
  /**
   * 渲染通知
   * 
   * @returns 通知实例
   */
  public async render(): Promise<vscode.Disposable | undefined> {
    const type = this.getConfigValue<NotificationType>('type', NotificationType.INFORMATION);
    
    switch (type) {
      case NotificationType.INFORMATION:
        return this.showInformationNotification();
      case NotificationType.WARNING:
        return this.showWarningNotification();
      case NotificationType.ERROR:
        return this.showErrorNotification();
      case NotificationType.PROGRESS:
        return this.showProgressNotification();
      default:
        return undefined;
    }
  }
  
  /**
   * 显示信息通知
   * 
   * @returns 通知实例
   */
  protected async showInformationNotification(): Promise<vscode.Disposable | undefined> {
    const message = this.getConfigValue<string>('message', '');
    const buttons = this.getConfigValue<Array<{ id: string; title: string }>>('buttons', []);
    const buttonTitles = buttons.map(button => button.title);
    
    this._isShowing = true;
    
    // 显示通知
    const notification = vscode.window.showInformationMessage(message, ...buttonTitles).then(selection => {
      this._isShowing = false;
      
      if (selection) {
        const button = buttons.find(btn => btn.title === selection);
        if (button) {
          // 触发按钮点击事件
          this.emit('buttonClick', { buttonId: button.id });
        }
      }
    });
    
    // 返回一个可释放的对象
    return {
      dispose: () => {
        this._isShowing = false;
      }
    };
  }
  
  /**
   * 显示警告通知
   * 
   * @returns 通知实例
   */
  protected async showWarningNotification(): Promise<vscode.Disposable | undefined> {
    const message = this.getConfigValue<string>('message', '');
    const buttons = this.getConfigValue<Array<{ id: string; title: string }>>('buttons', []);
    const buttonTitles = buttons.map(button => button.title);
    
    this._isShowing = true;
    
    // 显示通知
    const notification = vscode.window.showWarningMessage(message, ...buttonTitles).then(selection => {
      this._isShowing = false;
      
      if (selection) {
        const button = buttons.find(btn => btn.title === selection);
        if (button) {
          // 触发按钮点击事件
          this.emit('buttonClick', { buttonId: button.id });
        }
      }
    });
    
    // 返回一个可释放的对象
    return {
      dispose: () => {
        this._isShowing = false;
      }
    };
  }
  
  /**
   * 显示错误通知
   * 
   * @returns 通知实例
   */
  protected async showErrorNotification(): Promise<vscode.Disposable | undefined> {
    const message = this.getConfigValue<string>('message', '');
    const buttons = this.getConfigValue<Array<{ id: string; title: string }>>('buttons', []);
    const buttonTitles = buttons.map(button => button.title);
    
    this._isShowing = true;
    
    // 显示通知
    const notification = vscode.window.showErrorMessage(message, ...buttonTitles).then(selection => {
      this._isShowing = false;
      
      if (selection) {
        const button = buttons.find(btn => btn.title === selection);
        if (button) {
          // 触发按钮点击事件
          this.emit('buttonClick', { buttonId: button.id });
        }
      }
    });
    
    // 返回一个可释放的对象
    return {
      dispose: () => {
        this._isShowing = false;
      }
    };
  }
  
  /**
   * 显示进度通知
   * 
   * @returns 通知实例
   */
  protected async showProgressNotification(): Promise<vscode.Disposable | undefined> {
    const message = this.getConfigValue<string>('message', '');
    const location = this.getConfigValue<vscode.ProgressLocation>('location', vscode.ProgressLocation.Notification);
    const cancellable = this.getConfigValue<boolean>('cancellable', true);
    
    this._isShowing = true;
    this._token = new vscode.CancellationTokenSource();
    
    // 创建进度通知
    const progressPromise = vscode.window.withProgress({
      location,
      title: message,
      cancellable
    }, (progress, token) => {
      this._progress = progress;
      
      // 初始进度报告
      progress.report({ message });
      
      // 监听取消事件
      token.onCancellationRequested(() => {
        this._isShowing = false;
        this.emit('cancelled');
      });
      
      // 返回一个永不解决的Promise，直到手动释放
      return new Promise<void>(resolve => {
        // 存储resolve函数，以便在dispose时调用
        (this as any)._resolveProgress = resolve;
      });
    });
    
    // 返回一个可释放的对象
    return {
      dispose: () => {
        if (this._isShowing) {
          this._isShowing = false;
          
          // 解决进度Promise
          if ((this as any)._resolveProgress) {
            (this as any)._resolveProgress();
            (this as any)._resolveProgress = undefined;
          }
          
          // 取消令牌
          if (this._token) {
            this._token.dispose();
            this._token = undefined;
          }
          
          this._progress = undefined;
        }
      }
    };
  }
  
  /**
   * 更新进度
   * 
   * @param increment 增量
   * @param message 消息
   */
  public updateProgress(increment?: number, message?: string): void {
    if (this._progress && this._isShowing) {
      this._progress.report({ increment, message });
    }
  }
  
  /**
   * 更新回调
   * 
   * @param data 更新数据
   */
  protected onUpdate(data: any): void {
    if (this._isShowing && this.getConfigValue<NotificationType>('type', NotificationType.INFORMATION) === NotificationType.PROGRESS) {
      // 更新进度
      const increment = data.increment !== undefined ? data.increment : this.getConfigValue<number>('increment', 0);
      const message = data.message || this.getConfigValue<string>('message', '');
      
      this.updateProgress(increment, message);
    }
  }
  
  /**
   * 显示回调
   */
  protected onShow(): void {
    if (!this._isShowing) {
      this.render().then(notification => {
        this._notification = notification;
      });
    }
  }
  
  /**
   * 隐藏回调
   */
  protected onHide(): void {
    if (this._isShowing && this._notification) {
      this._notification.dispose();
      this._notification = undefined;
      this._isShowing = false;
    }
  }
  
  /**
   * 发送消息回调
   * 
   * @param message 消息
   */
  protected onPostMessage(message: UIComponentMessage): void {
    // 通知不支持消息
  }
  
  /**
   * 处理消息回调
   * 
   * @param message 消息
   * @returns 处理结果
   */
  protected async onHandleMessage(message: UIComponentMessage): Promise<any> {
    // 通知不支持消息
    return null;
  }
  
  /**
   * 销毁回调
   */
  protected onDispose(): void {
    this.onHide();
  }
  
  /**
   * 是否正在显示
   */
  public isShowing(): boolean {
    return this._isShowing;
  }
  
  /**
   * 触发事件
   * 
   * @param event 事件名称
   * @param data 事件数据
   */
  protected emit(event: string, data?: any): void {
    // 这里可以实现事件发射逻辑
    // 在实际实现中，可能需要一个事件发射器
  }
}
