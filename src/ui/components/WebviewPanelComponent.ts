import * as vscode from 'vscode';
import { BaseUIComponent } from '../BaseUIComponent';
import { UIComponentType, UIComponentState, UIComponentMessage, UIComponentConfig } from '../IUIComponent';

/**
 * WebView面板组件配置
 */
export interface WebviewPanelConfig extends UIComponentConfig {
  viewColumn?: vscode.ViewColumn;
  preserveFocus?: boolean;
  enableScripts?: boolean;
  retainContextWhenHidden?: boolean;
  localResourceRoots?: string[];
  enableFindWidget?: boolean;
}

/**
 * WebView面板组件类
 * 
 * 提供WebView面板功能的UI组件
 */
export class WebviewPanelComponent extends BaseUIComponent {
  protected _panel: vscode.WebviewPanel | undefined;
  protected _html: string = '';
  
  /**
   * 构造函数
   */
  constructor() {
    super();
    this._type = UIComponentType.WEBVIEW_PANEL;
  }
  
  /**
   * 初始化回调
   */
  protected async onInitialize(): Promise<void> {
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
   * 渲染组件
   * 
   * @returns WebView面板
   */
  public render(): vscode.WebviewPanel {
    if (this._panel) {
      this._panel.reveal(this.getViewColumn(), this.getPreserveFocus());
      return this._panel;
    }
    
    // 创建WebView面板
    this._panel = vscode.window.createWebviewPanel(
      this._id,
      this.getTitle(),
      this.getViewColumn(),
      this.getWebviewOptions()
    );
    
    // 设置HTML内容
    this._panel.webview.html = this.getHtml();
    
    // 注册消息处理
    this._panel.webview.onDidReceiveMessage(
      async (message: UIComponentMessage) => {
        await this.handleMessage(message);
      },
      null,
      this._disposables
    );
    
    // 注册面板关闭事件
    this._panel.onDidDispose(
      () => {
        this._panel = undefined;
      },
      null,
      this._disposables
    );
    
    return this._panel;
  }
  
  /**
   * 获取标题
   * 
   * @returns 标题
   */
  protected getTitle(): string {
    return this._config.title;
  }
  
  /**
   * 获取视图列
   * 
   * @returns 视图列
   */
  protected getViewColumn(): vscode.ViewColumn {
    return this.getConfigValue<vscode.ViewColumn>('viewColumn', vscode.ViewColumn.Active);
  }
  
  /**
   * 获取是否保持焦点
   * 
   * @returns 是否保持焦点
   */
  protected getPreserveFocus(): boolean {
    return this.getConfigValue<boolean>('preserveFocus', false);
  }
  
  /**
   * 获取WebView选项
   * 
   * @returns WebView选项
   */
  protected getWebviewOptions(): vscode.WebviewOptions {
    const enableScripts = this.getConfigValue<boolean>('enableScripts', true);
    const retainContextWhenHidden = this.getConfigValue<boolean>('retainContextWhenHidden', true);
    const enableFindWidget = this.getConfigValue<boolean>('enableFindWidget', true);
    
    // 获取本地资源根目录
    const localResourceRoots = this.getLocalResourceRoots();
    
    return {
      enableScripts,
      retainContextWhenHidden,
      enableFindWidget,
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
        <title>${this.getTitle()}</title>
        <style>
          body {
            padding: 0;
            margin: 0;
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
          }
          .container {
            padding: 20px;
          }
          h1 {
            color: var(--vscode-editor-foreground);
            font-size: 1.5em;
            margin-bottom: 20px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>${this.getTitle()}</h1>
          <p>这是一个WebView面板组件。</p>
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
    if (this._panel) {
      this._panel.webview.html = html;
    }
  }
  
  /**
   * 获取WebView
   * 
   * @returns WebView
   */
  protected getWebview(): vscode.Webview | undefined {
    return this._panel?.webview;
  }
  
  /**
   * 显示回调
   */
  protected onShow(): void {
    this.render();
  }
  
  /**
   * 隐藏回调
   */
  protected onHide(): void {
    this._panel?.dispose();
    this._panel = undefined;
  }
  
  /**
   * 发送消息回调
   * 
   * @param message 消息
   */
  protected onPostMessage(message: UIComponentMessage): void {
    if (this._panel) {
      this._panel.webview.postMessage(message);
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
    console.log(`收到WebView消息 (${this._id}):`, message);
    return null;
  }
  
  /**
   * 销毁回调
   */
  protected onDispose(): void {
    this._panel?.dispose();
    this._panel = undefined;
  }
  
  /**
   * 获取资源URI的WebView版本
   * 
   * @param path 资源路径
   * @returns WebView资源URI
   */
  protected getWebviewUri(path: string): vscode.Uri | undefined {
    if (!this._panel) {
      return undefined;
    }
    
    const resourceUri = this.getResourceUri(path);
    return this._panel.webview.asWebviewUri(resourceUri);
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
