import * as vscode from 'vscode';
import { LLMManager, LLMProvider } from '../../llm/LLMManager';
import { IUIComponent } from '../UIManager';

/**
 * 配置面板提供器类
 * 
 * 负责提供配置设置面板
 */
export class ConfigPanelProvider implements IUIComponent {
  public readonly id = 'config_panel';
  
  private context: vscode.ExtensionContext;
  private llmManager: LLMManager;
  private panel?: vscode.WebviewPanel;

  /**
   * 构造函数
   * 
   * @param context VSCode 扩展上下文
   * @param llmManager LLM 管理器
   */
  constructor(context: vscode.ExtensionContext, llmManager: LLMManager) {
    this.context = context;
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
      'deepagents.configPanel',
      'DeepAgents 配置',
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
          case 'getConfig':
            // 获取当前配置
            const config = vscode.workspace.getConfiguration('deepagents');
            this.panel?.webview.postMessage({ 
              command: 'configLoaded', 
              config: {
                llmProvider: config.get('llmProvider'),
                apiKey: config.get('apiKey'),
                workflowTemplate: config.get('workflowTemplate')
              }
            });
            break;
          case 'saveConfig':
            try {
              // 保存配置
              await vscode.workspace.getConfiguration('deepagents').update('llmProvider', message.config.llmProvider, true);
              await vscode.workspace.getConfiguration('deepagents').update('apiKey', message.config.apiKey, true);
              await vscode.workspace.getConfiguration('deepagents').update('workflowTemplate', message.config.workflowTemplate, true);
              
              // 设置默认提供商
              await this.llmManager.setDefaultProvider(message.config.llmProvider);
              
              this.panel?.webview.postMessage({ command: 'configSaved' });
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
        <title>DeepAgents 配置</title>
        <style>
          body {
            padding: 20px;
            color: var(--vscode-foreground);
            font-family: var(--vscode-font-family);
            background-color: var(--vscode-editor-background);
          }
          .form-group {
            margin-bottom: 16px;
          }
          label {
            display: block;
            margin-bottom: 6px;
          }
          input, select {
            width: 100%;
            padding: 8px;
            border: 1px solid var(--vscode-input-border);
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border-radius: 4px;
          }
          button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            border-radius: 2px;
            cursor: pointer;
          }
          button:hover {
            background-color: var(--vscode-button-hoverBackground);
          }
          .error {
            color: red;
            margin-top: 10px;
          }
          .success {
            color: green;
            margin-top: 10px;
          }
        </style>
      </head>
      <body>
        <h2>DeepAgents 配置</h2>
        
        <form id="configForm">
          <div class="form-group">
            <label for="llmProvider">LLM 提供商</label>
            <select id="llmProvider" name="llmProvider">
              <option value="openai">OpenAI (GPT-4, GPT-3.5)</option>
              <option value="anthropic">Anthropic (Claude)</option>
              <option value="deepseek">DeepSeek</option>
              <option value="gemini">Google Gemini</option>
              <option value="local">本地模型 (Qwen)</option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="apiKey">API 密钥</label>
            <input type="password" id="apiKey" name="apiKey" placeholder="输入 API 密钥">
          </div>
          
          <div class="form-group">
            <label for="workflowTemplate">工作流模板</label>
            <select id="workflowTemplate" name="workflowTemplate">
              <option value="default">默认工作流</option>
              <option value="frontend">前端开发工作流</option>
              <option value="backend">后端开发工作流</option>
              <option value="fullstack">全栈开发工作流</option>
              <option value="custom">自定义工作流</option>
            </select>
          </div>
          
          <button type="submit">保存配置</button>
        </form>
        
        <div id="message"></div>
        
        <script>
          (function() {
            const vscode = acquireVsCodeApi();
            const configForm = document.getElementById('configForm');
            const messageElement = document.getElementById('message');
            
            // 加载配置
            vscode.postMessage({ command: 'getConfig' });
            
            // 表单提交事件
            configForm.addEventListener('submit', (event) => {
              event.preventDefault();
              
              const formData = new FormData(configForm);
              const config = {
                llmProvider: formData.get('llmProvider'),
                apiKey: formData.get('apiKey'),
                workflowTemplate: formData.get('workflowTemplate')
              };
              
              vscode.postMessage({ 
                command: 'saveConfig', 
                config 
              });
            });
            
            // 处理来自扩展的消息
            window.addEventListener('message', event => {
              const message = event.data;
              
              switch (message.command) {
                case 'configLoaded':
                  // 填充表单
                  document.getElementById('llmProvider').value = message.config.llmProvider || 'openai';
                  document.getElementById('apiKey').value = message.config.apiKey || '';
                  document.getElementById('workflowTemplate').value = message.config.workflowTemplate || 'default';
                  break;
                case 'configSaved':
                  messageElement.className = 'success';
                  messageElement.textContent = '配置已保存';
                  break;
                case 'error':
                  messageElement.className = 'error';
                  messageElement.textContent = \`错误: \${message.message}\`;
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