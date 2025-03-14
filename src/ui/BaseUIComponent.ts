import * as vscode from 'vscode';
import { IUIComponent, UIComponentConfig, UIComponentType, UIComponentState, UIComponentMessage } from './IUIComponent';

/**
 * 基础UI组件类
 * 
 * 实现IUIComponent接口的基础类，提供通用功能
 */
export abstract class BaseUIComponent implements IUIComponent {
  protected _id: string;
  protected _type: UIComponentType;
  protected _state: UIComponentState = UIComponentState.INITIALIZING;
  protected _context: vscode.ExtensionContext;
  protected _config: UIComponentConfig;
  protected _disposables: vscode.Disposable[] = [];
  
  /**
   * 获取组件ID
   */
  public get id(): string {
    return this._id;
  }
  
  /**
   * 获取组件类型
   */
  public get type(): UIComponentType {
    return this._type;
  }
  
  /**
   * 获取组件状态
   */
  public get state(): UIComponentState {
    return this._state;
  }
  
  /**
   * 初始化组件
   * 
   * @param context VSCode扩展上下文
   * @param config 组件配置
   */
  public async initialize(context: vscode.ExtensionContext, config: UIComponentConfig): Promise<void> {
    this._context = context;
    this._config = config;
    this._id = config.id;
    this._type = config.type;
    
    try {
      await this.onInitialize();
      this._state = UIComponentState.READY;
    } catch (error) {
      this._state = UIComponentState.ERROR;
      console.error(`初始化组件失败 (${this._id}):`, error);
      throw error;
    }
  }
  
  /**
   * 初始化回调
   * 
   * 子类可以重写此方法以提供自定义初始化逻辑
   */
  protected async onInitialize(): Promise<void> {
    // 默认实现为空
  }
  
  /**
   * 渲染组件
   * 
   * @returns 组件实例
   */
  public abstract render(): vscode.WebviewPanel | vscode.WebviewView | vscode.StatusBarItem | vscode.TreeView<any> | any;
  
  /**
   * 更新组件
   * 
   * @param data 更新数据
   */
  public update(data: any): void {
    this.onUpdate(data);
  }
  
  /**
   * 更新回调
   * 
   * 子类可以重写此方法以提供自定义更新逻辑
   * 
   * @param data 更新数据
   */
  protected onUpdate(data: any): void {
    // 默认实现为空
  }
  
  /**
   * 显示组件
   */
  public show(): void {
    this.onShow();
  }
  
  /**
   * 显示回调
   * 
   * 子类可以重写此方法以提供自定义显示逻辑
   */
  protected onShow(): void {
    // 默认实现为空
  }
  
  /**
   * 隐藏组件
   */
  public hide(): void {
    this.onHide();
  }
  
  /**
   * 隐藏回调
   * 
   * 子类可以重写此方法以提供自定义隐藏逻辑
   */
  protected onHide(): void {
    // 默认实现为空
  }
  
  /**
   * 发送消息到组件
   * 
   * @param message 消息
   */
  public postMessage(message: UIComponentMessage): void {
    this.onPostMessage(message);
  }
  
  /**
   * 发送消息回调
   * 
   * 子类可以重写此方法以提供自定义消息发送逻辑
   * 
   * @param message 消息
   */
  protected onPostMessage(message: UIComponentMessage): void {
    // 默认实现为空
  }
  
  /**
   * 处理来自组件的消息
   * 
   * @param message 消息
   * @returns 处理结果
   */
  public async handleMessage(message: UIComponentMessage): Promise<any> {
    return this.onHandleMessage(message);
  }
  
  /**
   * 处理消息回调
   * 
   * 子类可以重写此方法以提供自定义消息处理逻辑
   * 
   * @param message 消息
   * @returns 处理结果
   */
  protected async onHandleMessage(message: UIComponentMessage): Promise<any> {
    // 默认实现为空
    return null;
  }
  
  /**
   * 销毁组件
   */
  public dispose(): void {
    this._state = UIComponentState.DISPOSED;
    
    // 销毁所有可销毁对象
    for (const disposable of this._disposables) {
      disposable.dispose();
    }
    this._disposables = [];
    
    this.onDispose();
  }
  
  /**
   * 销毁回调
   * 
   * 子类可以重写此方法以提供自定义销毁逻辑
   */
  protected onDispose(): void {
    // 默认实现为空
  }
  
  /**
   * 注册可销毁对象
   * 
   * @param disposable 可销毁对象
   */
  protected registerDisposable(disposable: vscode.Disposable): void {
    this._disposables.push(disposable);
  }
  
  /**
   * 获取资源URI
   * 
   * @param path 资源路径
   * @returns 资源URI
   */
  protected getResourceUri(path: string): vscode.Uri {
    return vscode.Uri.joinPath(this._context.extensionUri, path);
  }
  
  /**
   * 获取配置值
   * 
   * @param key 配置键
   * @param defaultValue 默认值
   * @returns 配置值
   */
  protected getConfigValue<T>(key: string, defaultValue?: T): T {
    return this._config[key] !== undefined ? this._config[key] : defaultValue;
  }
}
