import * as vscode from 'vscode';
import { AgentManager } from '../../agents/AgentManager';
import { WorkflowEngine } from '../../workflow/WorkflowEngine';
import { LLMManager } from '../../llm/LLMManager';
import { IUIComponent } from '../UIManager';

/**
 * 主面板提供器类
 * 
 * 负责提供主交互面板
 */
export class MainPanelProvider implements IUIComponent {
  public readonly id = 'main_panel';
  
  private context: vscode.ExtensionContext;
  private agentManager: AgentManager;
  private workflowEngine: WorkflowEngine;
  private llmManager: LLMManager;
  private panel?: vscode.WebviewPanel;

  /**
   * 构造函数
   * 
   * @param context VSCode 扩展上下文
   * @param agentManager 代理管理器
   * @param workflowEngine 工作流引擎
   * @param llmManager LLM 管理器
   */
  constructor(
    context: vscode.ExtensionContext,
    agentManager: AgentManager,
    workflowEngine: WorkflowEngine,
    llmManager: LLMManager
  ) {
    this.context = context;
    this.agentManager = agentManager;
    this.workflowEngine = workflowEngine;
    this.llmManager = llmManager;
  }

  /**
   * 创建或显示面板
   */
  private createOrShowPanel(): vscode.WebviewPanel {
    // 如果面板已经存在，则显示它
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.One);
      return this.panel;
    }

    // 创建新的面板
    this.panel = vscode.window.createWebviewPanel(
      'deepagents.mainPanel',
      'DeepAgents',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [this.context.extensionUri]
      }
    );

    // 设置 HTML 内容
    this.panel.webview.html = this.getHtmlForWebview(this.panel.webview);

    // 处理面板关闭事件
    this.panel.onDidDispose(
      () => {
        this.panel = undefined;
      },
      null,
      this.context.subscriptions
    );

    // 处理来自 WebView 的消息
    this.panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case 'sendMessage':
            try {
              // 这里应该处理用户消息并调用代理
              // 目前只是返回一个示例响应
              this.panel?.webview.postMessage({ 
                command: 'receiveMessage', 
                message: {
                  id: Date.now().toString(),
                  sender: 'agent',
                  content: `收到您的消息: ${message.text}`,
                  timestamp: new Date().toISOString()
                }
              });
            } catch (error) {
              this.panel?.webview.postMessage({ 
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

    return this.panel;
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
        <title>DeepAgents</title>
        <style>
          body {
            padding: 0;
            margin: 0;
            color: var(--vscode-foreground);
            font-family: var(--vscode-font-family);
            background-color: var(--vscode-editor-background);
            display: flex;
            flex-direction: column;
            height: 100vh;
          }
          .header {
            padding: 10px;
            border-bottom: 1px solid var(--vscode-panel-border);
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .main {
            display: flex;
            flex: 1;
            overflow: hidden;
          }
          .chat-container {
            display: flex;
            flex-direction: column;
            flex: 1;
            padding: 10px;
            overflow: hidden;
          }
          .messages {
            flex: 1;
            overflow-y: auto;
            padding: 10px;
          }
          .message {
            margin-bottom: 10px;
            padding: 8px 12px;
            border-radius: 6px;
            max-width: 80%;
          }
          .message.user {
            align-self: flex-end;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            margin-left: auto;
          }
          .message.agent {
            align-self: flex-start;
            background-color: var(--vscode-editor-inactiveSelectionBackground);
          }
          .input-container {
            display: flex;
            padding: 10px;
            border-top: 1px solid var(--vscode-panel-border);
          }
          .message-input {
            flex: 1;
            padding: 8px;
            border: 1px solid var(--vscode-input-border);
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border-radius: 4px;
            resize: none;
          }
          .send-button {
            margin-left: 10px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 0 16px;
            border-radius: 2px;
            cursor: pointer;
          }
          .send-button:hover {
            background-color: var(--vscode-button-hoverBackground);
          }
          .sidebar {
            width: 250px;
            border-left: 1px solid var(--vscode-panel-border);
            padding: 10px;
            overflow-y: auto;
          }
          .agent-item {
            padding: 8px;
            margin-bottom: 8px;
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border-radius: 4px;
            cursor: pointer;
          }
          .agent-item:hover {
            background-color: var(--vscode-list-hoverBackground);
          }
          .agent-item.active {
            background-color: var(--vscode-list-activeSelectionBackground);
            color: var(--vscode-list-activeSelectionForeground);
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>DeepAgents</h2>
          <div>
            <button id="settingsBtn">设置</button>
          </div>
        </div>
        <div class="main">
          <div class="chat-container">
            <div class="messages" id="messages">
              <div class="message agent">
                <p>你好！我是 DeepAgents 助手。我可以帮助你完成软件开发任务。请告诉我你需要什么帮助？</p>
              </div>
            </div>
            <div class="input-container">
              <textarea class="message-input" id="messageInput" placeholder="输入消息..." rows="3"></textarea>
              <button class="send-button" id="sendBtn">发送</button>
            </div>
          </div>
          <div class="sidebar">
            <h3>活跃代理</h3>
            <div id="agentList">
              <div class="agent-item active">
                <h4>助手</h4>
                <p>通用助手代理</p>
              </div>
            </div>
          </div>
        </div>
        
        <script>
          (function() {
            const vscode = acquireVsCodeApi();
            const messagesContainer = document.getElementById('messages');
            const messageInput = document.getElementById('messageInput');
            const sendButton = document.getElementById('sendBtn');
            const settingsButton = document.getElementById('settingsBtn');
            
            // 发送消息
            function sendMessage() {
              const text = messageInput.value.trim();
              if (!text) return;
              
              // 添加用户消息到界面
              addMessage({
                id: Date.now().toString(),
                sender: 'user',
                content: text,
                timestamp: new Date().toISOString()
              });
              
              // 发送消息到扩展
              vscode.postMessage({ 
                command: 'sendMessage', 
                text 
              });
              
              // 清空输入框
              messageInput.value = '';
            }
            
            // 添加消息到界面
            function addMessage(message) {
              const messageElement = document.createElement('div');
              messageElement.className = \`message \${message.sender}\`;
              messageElement.innerHTML = \`<p>\${message.content}</p>\`;
              
              messagesContainer.appendChild(messageElement);
              
              // 滚动到底部
              messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
            
            // 发送按钮点击事件
            sendButton.addEventListener('click', sendMessage);
            
            // 输入框回车事件
            messageInput.addEventListener('keydown', (event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                sendMessage();
              }
            });
            
            // 设置按钮点击事件
            settingsButton.addEventListener('click', () => {
              vscode.postMessage({ command: 'openSettings' });
            });
            
            // 处理来自扩展的消息
            window.addEventListener('message', event => {
              const message = event.data;
              
              switch (message.command) {
                case 'receiveMessage':
                  addMessage(message.message);
                  break;
                case 'error':
                  // 显示错误消息
                  addMessage({
                    id: Date.now().toString(),
                    sender: 'agent',
                    content: \`错误: \${message.message}\`,
                    timestamp: new Date().toISOString()
                  });
                  break;
              }
            });
          }());
        </script>
      </body>
      </html>
    `;
  }

  /**
   * 渲染组件
   * 
   * @returns WebView 面板
   */
  public render(): vscode.WebviewPanel {
    return this.createOrShowPanel();
  }

  /**
   * 更新组件
   * 
   * @param data 数据
   */
  public update(data: any): void {
    if (this.panel) {
      this.panel.webview.postMessage({ command: 'update', data });
    }
  }

  /**
   * 销毁组件
   */
  public dispose(): void {
    if (this.panel) {
      this.panel.dispose();
      this.panel = undefined;
    }
  }
}