import * as vscode from 'vscode';

/**
 * UI组件类型枚举
 */
export enum UIComponentType {
  WEBVIEW_PANEL = 'webview_panel',
  WEBVIEW_VIEW = 'webview_view',
  STATUS_BAR = 'status_bar',
  TREE_VIEW = 'tree_view',
  CUSTOM = 'custom'
}

/**
 * UI组件状态枚举
 */
export enum UIComponentState {
  INITIALIZING = 'initializing',
  READY = 'ready',
  LOADING = 'loading',
  ERROR = 'error',
  DISPOSED = 'disposed'
}

/**
 * UI组件配置接口
 */
export interface UIComponentConfig {
  id: string;
  title: string;
  type: UIComponentType;
  viewColumn?: vscode.ViewColumn;
  preserveFocus?: boolean;
  iconPath?: string | vscode.Uri | { light: string | vscode.Uri; dark: string | vscode.Uri };
  [key: string]: any;
}

/**
 * UI组件消息接口
 */
export interface UIComponentMessage {
  command: string;
  data?: any;
}

/**
 * UI组件接口
 */
export interface IUIComponent {
  /**
   * 组件ID
   */
  readonly id: string;
  
  /**
   * 组件类型
   */
  readonly type: UIComponentType;
  
  /**
   * 组件状态
   */
  readonly state: UIComponentState;
  
  /**
   * 初始化组件
   * 
   * @param context VSCode扩展上下文
   * @param config 组件配置
   */
  initialize(context: vscode.ExtensionContext, config: UIComponentConfig): Promise<void>;
  
  /**
   * 渲染组件
   * 
   * @returns 组件实例
   */
  render(): vscode.WebviewPanel | vscode.WebviewView | vscode.StatusBarItem | vscode.TreeView<any> | any;
  
  /**
   * 更新组件
   * 
   * @param data 更新数据
   */
  update(data: any): void;
  
  /**
   * 显示组件
   */
  show(): void;
  
  /**
   * 隐藏组件
   */
  hide(): void;
  
  /**
   * 发送消息到组件
   * 
   * @param message 消息
   */
  postMessage(message: UIComponentMessage): void;
  
  /**
   * 处理来自组件的消息
   * 
   * @param message 消息
   * @returns 处理结果
   */
  handleMessage(message: UIComponentMessage): Promise<any>;
  
  /**
   * 销毁组件
   */
  dispose(): void;
}
