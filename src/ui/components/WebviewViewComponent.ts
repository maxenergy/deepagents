import * as vscode from 'vscode';
import { BaseUIComponent } from '../BaseUIComponent';
import { UIComponentType, UIComponentState, UIComponentMessage, UIComponentConfig } from '../IUIComponent';

/**
 * WebView视图组件配置
 */
export interface WebviewViewConfig extends UIComponentConfig {
  viewId: string;
  enableScripts?: boolean;
  retainContextWhenHidden?: boolean;
  localResourceRoots?: string[];
}

/**
 * WebView视图组件类
 * 
 * 提供WebView视图功能的UI组件
 */
export class WebviewViewComponent extends BaseUIComponent implements vscode.WebviewViewProvider {
  protected _view: vscode.WebviewView | undefined;
  protected _html: string = '';
  protected _viewId: string;
  
  /**
   * 构造函数
   */
  constructor() {
    super();
    this._type = UIComponentType.WEBVIEW_VIEW;
    this._viewId = '';
  }
  
  /**
   * 初始化回调
   */
  protected async onInitialize(): Promise<void> {
    this._viewId = this.getConfigValue<string>('viewId', this._id);
    
    // 注册WebView视图提供器
    const viewProvider = vscode.window.registerWebviewViewProvider(this._viewId, this);
    this.registerDisposable(viewProvider);
    
    // 注册消息处理器
    this.registerMessageHandlers();
  }
  
  /**
   * 注册消息处理器
   */
  protected registerMessageHandlers(): void {
    // 子类可以重写此方法以注册自定义消息处理器
  }
  
  /**
   * 解析WebView视图
   * 
   * @param webviewView WebView视图
   */
  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    token: vscode.CancellationToken
  ): void | Thenable<void> {
    this._view = webviewView;
    
    // 配置WebView
    webviewView.webview.options = this.getWebviewOptions();
    
    // 设置HTML内容
    webviewView.webview.html = this.getHtml();
    
    // 注册消息处理
    webviewView.webview.onDidReceiveMessage(
      async (message: UIComponentMessage) => {
        await this.handleMessage(message);
      },
      null,
      this._disposables
    );
    
    // 注册视图状态变化事件
    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) {
        this.onVisible();
      } else {
        this.onHidden();
      }
    });
    
    // 注册视图关闭事件
    webviewView.onDidDispose(() => {
      this._view = undefined;
    }, null, this._disposables);
  }
  
  /**
   * 渲染组件
   * 
   * @returns WebView视图
   */
  public render(): vscode.WebviewView | undefined {
    // WebView视图由VSCode管理，无法直接创建
    // 返回当前视图（如果存在）
    return this._view;
  }
  
  /**
   * 获取WebView选项
   * 
   * @returns WebView选项
   */
  protected getWebviewOptions(): vscode.WebviewOptions {
    const enableScripts = this.getConfigValue<boolean>('enableScripts', true);
    const retainContextWhenHidden = this.getConfigValue<boolean>('retainContextWhenHidden', true);
    
    // 获取本地资源根目录
    const localResourceRoots = this.getLocalResourceRoots();
    
    return {
      enableScripts,
      retainContextWhenHidden,
      localResourceRoots
    };
  }
  
  /**
   * 获取本地资源根目录
   * 
   * @returns 本地资源根目录
   */
  protected getLocalResourceRoots(): vscode.Uri[] {
    const localResourceRoots = this.getConfigValue<string[]>('localResourceRoots', []);
    
    // 添加扩展目录作为资源根目录
    const roots = [this._context.extensionUri];
    
    // 添加配置中的资源根目录
    for (const root of localResourceRoots) {
      roots.push(this.getResourceUri(root));
    }
    
    return roots;
  }
  
  /**
   * 获取HTML内容
   * 
   * @returns HTML内容
   */
  protected getHtml(): string {
    if (!this._html) {
      this._html = this.generateHtml();
    }
    return this._html;
  }
  
  /**
   * 生成HTML内容
   * 
   * @returns HTML内容
   */
  protected generateHtml(): string {
    // 子类应该重写此方法以提供自定义HTML内容
    return `
      <!DOCTYPE html>
      <html lang="zh-CN">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${this._config.title}</title>
        <style>
          body {
            padding: 0;
            margin: 0;
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
          }
          .container {
            padding: 10px;
          }
          h2 {
            color: var(--vscode-editor-foreground);
            font-size: 1.2em;
            margin-bottom: 10px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>${this._config.title}</h2>
          <p>这是一个WebView视图组件。</p>
        </div>
      </body>
      </html>
    `;
  }
  
  /**
   * 更新HTML内容
   * 
   * @param html HTML内容
   */
  protected updateHtml(html: string): void {
    this._html = html;
    if (this._view) {
      this._view.webview.html = html;
    }
  }
  
  /**
   * 获取WebView
   * 
   * @returns WebView
   */
  protected getWebview(): vscode.Webview | undefined {
    return this._view?.webview;
  }
  
  /**
   * 视图可见时的回调
   */
  protected onVisible(): void {
    // 子类可以重写此方法以提供自定义可见逻辑
  }
  
  /**
   * 视图隐藏时的回调
   */
  protected onHidden(): void {
    // 子类可以重写此方法以提供自定义隐藏逻辑
  }
  
  /**
   * 显示回调
   */
  protected onShow(): void {
    // 尝试显示视图
    vscode.commands.executeCommand(`${this._viewId}.focus`);
  }
  
  /**
   * 隐藏回调
   */
  protected onHide(): void {
    // WebView视图无法直接隐藏，由VSCode管理
  }
  
  /**
   * 发送消息回调
   * 
   * @param message 消息
   */
  protected onPostMessage(message: UIComponentMessage): void {
    if (this._view) {
      this._view.webview.postMessage(message);
    }
  }
  
  /**
   * 处理消息回调
   * 
   * @param message 消息
   * @returns 处理结果
   */
  protected async onHandleMessage(message: UIComponentMessage): Promise<any> {
    // 子类应该重写此方法以提供自定义消息处理逻辑
    console.log(`收到WebView视图消息 (${this._id}):`, message);
    return null;
  }
  
  /**
   * 销毁回调
   */
  protected onDispose(): void {
    this._view = undefined;
  }
  
  /**
   * 获取资源URI的WebView版本
   * 
   * @param path 资源路径
   * @returns WebView资源URI
   */
  protected getWebviewUri(path: string): vscode.Uri | undefined {
    if (!this._view) {
      return undefined;
    }
    
    const resourceUri = this.getResourceUri(path);
    return this._view.webview.asWebviewUri(resourceUri);
  }
  
  /**
   * 获取随机nonce
   * 
   * @returns 随机nonce
   */
  protected getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }
}
