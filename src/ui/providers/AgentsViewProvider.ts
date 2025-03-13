import * as vscode from 'vscode';
import { AgentManager } from '../../agents/AgentManager';
import { IUIComponent } from '../UIManager';

/**
 * 代理视图提供器类
 * 
 * 负责提供代理管理视图
 */
export class AgentsViewProvider implements vscode.WebviewViewProvider, IUIComponent {
  public static readonly viewType = 'deepagents.agentsView';
  public readonly id = 'agents_view';
  
  private context: vscode.ExtensionContext;
  private agentManager: AgentManager;
  private view?: vscode.WebviewView;

  /**
   * 构造函数
   * 
   * @param context VSCode 扩展上下文
   * @param agentManager 代理管理器
   */
  constructor(context: vscode.ExtensionContext, agentManager: AgentManager) {
    this.context = context;
    this.agentManager = agentManager;
  }

  /**
   * 解析 WebView
   * 
   * @param webviewView WebView 视图
   */
  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void | Thenable<void> {
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.context.extensionUri]
    };

    webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);

    // 处理来自 WebView 的消息
    webviewView.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case 'getAgents':
            const agents = this.agentManager.getAllAgents();
            webviewView.webview.postMessage({ command: 'agentsLoaded', agents });
            break;
          case 'createAgent':
            try {
              const agent = await this.agentManager.createAgent(message.role, message.config);
              webviewView.webview.postMessage({ command: 'agentCreated', agent });
            } catch (error) {
              webviewView.webview.postMessage({ 
                command: 'error', 
                message: error instanceof Error ? error.message : String(error) 
              });
            }
            break;
          case 'removeAgent':
            try {
              const result = await this.agentManager.removeAgent(message.id);
              webviewView.webview.postMessage({ command: 'agentRemoved', id: message.id, success: result });
            } catch (error) {
              webviewView.webview.postMessage({ 
                command: 'error', 
                message: error instanceof Error ? error.message : String(error) 
              });
            }
            break;
        }
      },
      undefined,
      this.context.subscriptions
    );
  }

  /**
   * 获取 WebView 的 HTML
   * 
   * @param webview WebView
   * @returns HTML 字符串
   */
  private getHtmlForWebview(webview: vscode.Webview): string {
    // 这里将在后续实现具体的 HTML 内容
    // 目前只是返回一个简单的占位符
    return `
      <!DOCTYPE html>
      <html lang="zh-CN">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>代理管理</title>
        <style>
          body {
            padding: 10px;
            color: var(--vscode-foreground);
            font-family: var(--vscode-font-family);
            background-color: var(--vscode-editor-background);
          }
          .agent-list {
            margin-top: 10px;
          }
          .agent-item {
            padding: 8px;
            margin-bottom: 8px;
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border-radius: 4px;
          }
          button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 6px 12px;
            border-radius: 2px;
            cursor: pointer;
          }
          button:hover {
            background-color: var(--vscode-button-hoverBackground);
          }
        </style>
      </head>
      <body>
        <h2>代理管理</h2>
        <button id="createAgentBtn">创建代理</button>
        <div class="agent-list" id="agentList">
          <p>加载中...</p>
        </div>
        
        <script>
          (function() {
            const vscode = acquireVsCodeApi();
            
            // 加载代理列表
            vscode.postMessage({ command: 'getAgents' });
            
            // 创建代理按钮点击事件
            document.getElementById('createAgentBtn').addEventListener('click', () => {
              vscode.postMessage({ 
                command: 'createAgent',
                role: 'developer',
                config: {
                  name: '开发者代理',
                  role: 'developer',
                  capabilities: ['code_generation', 'code_review']
                }
              });
            });
            
            // 处理来自扩展的消息
            window.addEventListener('message', event => {
              const message = event.data;
              
              switch (message.command) {
                case 'agentsLoaded':
                  updateAgentList(message.agents);
                  break;
                case 'agentCreated':
                  vscode.postMessage({ command: 'getAgents' });
                  break;
                case 'agentRemoved':
                  if (message.success) {
                    vscode.postMessage({ command: 'getAgents' });
                  }
                  break;
                case 'error':
                  showError(message.message);
                  break;
              }
            });
            
            // 更新代理列表
            function updateAgentList(agents) {
              const agentList = document.getElementById('agentList');
              
              if (agents.length === 0) {
                agentList.innerHTML = '<p>暂无代理</p>';
                return;
              }
              
              let html = '';
              agents.forEach(agent => {
                html += \`
                  <div class="agent-item">
                    <h3>\${agent.name}</h3>
                    <p>角色: \${agent.role}</p>
                    <p>状态: \${agent.state}</p>
                    <button class="remove-btn" data-id="\${agent.id}">移除</button>
                  </div>
                \`;
              });
              
              agentList.innerHTML = html;
              
              // 添加移除按钮点击事件
              document.querySelectorAll('.remove-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                  const id = btn.getAttribute('data-id');
                  vscode.postMessage({ command: 'removeAgent', id });
                });
              });
            }
            
            // 显示错误信息
            function showError(message) {
              const agentList = document.getElementById('agentList');
              agentList.innerHTML = \`<p style="color: red;">错误: \${message}</p>\`;
            }
          }());
        </script>
      </body>
      </html>
    `;
  }

  /**
   * 渲染组件
   * 
   * @returns WebView 视图
   */
  public render(): vscode.WebviewView {
    if (!this.view) {
      throw new Error('WebView 视图尚未初始化');
    }
    return this.view;
  }

  /**
   * 更新组件
   * 
   * @param data 数据
   */
  public update(data: any): void {
    if (this.view) {
      this.view.webview.postMessage({ command: 'update', data });
    }
  }

  /**
   * 销毁组件
   */
  public dispose(): void {
    // 这里不需要做任何事情，因为 WebView 视图由 VSCode 管理
  }
}