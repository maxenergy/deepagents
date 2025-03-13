import * as vscode from 'vscode';
import { WorkflowEngine, StageStatus } from '../../workflow/WorkflowEngine';
import { IUIComponent } from '../UIManager';

/**
 * 工作流视图提供器类
 * 
 * 负责提供工作流管理视图
 */
export class WorkflowViewProvider implements vscode.WebviewViewProvider, IUIComponent {
  public static readonly viewType = 'deepagents.workflowView';
  public readonly id = 'workflow_view';
  
  private context: vscode.ExtensionContext;
  private workflowEngine: WorkflowEngine;
  private view?: vscode.WebviewView;

  /**
   * 构造函数
   * 
   * @param context VSCode 扩展上下文
   * @param workflowEngine 工作流引擎
   */
  constructor(context: vscode.ExtensionContext, workflowEngine: WorkflowEngine) {
    this.context = context;
    this.workflowEngine = workflowEngine;
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
          case 'getWorkflows':
            // 这里应该从工作流引擎获取工作流列表
            // 目前只是返回一个示例工作流
            const workflow = await this.workflowEngine.createDefaultWorkflow();
            const status = this.workflowEngine.monitorWorkflow(workflow);
            webviewView.webview.postMessage({ 
              command: 'workflowsLoaded', 
              workflows: [{ id: workflow.id, name: workflow.name, status }] 
            });
            break;
          case 'executeStage':
            try {
              const workflow = this.workflowEngine.getWorkflow(message.workflowId);
              if (!workflow) {
                throw new Error(`工作流 ${message.workflowId} 不存在`);
              }
              
              const stage = workflow.getCurrentStage();
              const result = await this.workflowEngine.executeStage(workflow, stage);
              
              webviewView.webview.postMessage({ 
                command: 'stageExecuted', 
                workflowId: message.workflowId,
                stageId: stage.id,
                result 
              });
              
              // 更新工作流状态
              const status = this.workflowEngine.monitorWorkflow(workflow);
              webviewView.webview.postMessage({ 
                command: 'workflowUpdated', 
                workflowId: message.workflowId,
                status 
              });
            } catch (error) {
              webviewView.webview.postMessage({ 
                command: 'error', 
                message: error instanceof Error ? error.message : String(error) 
              });
            }
            break;
          case 'moveToNextStage':
            try {
              const workflow = this.workflowEngine.getWorkflow(message.workflowId);
              if (!workflow) {
                throw new Error(`工作流 ${message.workflowId} 不存在`);
              }
              
              const result = await workflow.moveToNextStage();
              if (!result) {
                throw new Error('没有下一个阶段');
              }
              
              // 更新工作流状态
              const status = this.workflowEngine.monitorWorkflow(workflow);
              webviewView.webview.postMessage({ 
                command: 'workflowUpdated', 
                workflowId: message.workflowId,
                status 
              });
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
        <title>工作流</title>
        <style>
          body {
            padding: 10px;
            color: var(--vscode-foreground);
            font-family: var(--vscode-font-family);
            background-color: var(--vscode-editor-background);
          }
          .workflow-list {
            margin-top: 10px;
          }
          .workflow-item {
            padding: 8px;
            margin-bottom: 16px;
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border-radius: 4px;
          }
          .stage-list {
            margin-top: 8px;
          }
          .stage-item {
            padding: 6px;
            margin-bottom: 6px;
            background-color: var(--vscode-editor-background);
            border-radius: 4px;
            border-left: 3px solid #666;
          }
          .stage-item.current {
            border-left-color: #0078d4;
            background-color: rgba(0, 120, 212, 0.1);
          }
          .stage-item.completed {
            border-left-color: #107c10;
          }
          .stage-item.blocked {
            border-left-color: #d83b01;
          }
          .progress-bar {
            height: 6px;
            background-color: #333;
            border-radius: 3px;
            margin-top: 4px;
          }
          .progress-value {
            height: 100%;
            background-color: #0078d4;
            border-radius: 3px;
          }
          button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 6px 12px;
            border-radius: 2px;
            cursor: pointer;
            margin-right: 6px;
          }
          button:hover {
            background-color: var(--vscode-button-hoverBackground);
          }
          button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
        </style>
      </head>
      <body>
        <h2>工作流</h2>
        <button id="createWorkflowBtn">创建工作流</button>
        <div class="workflow-list" id="workflowList">
          <p>加载中...</p>
        </div>
        
        <script>
          (function() {
            const vscode = acquireVsCodeApi();
            
            // 加载工作流列表
            vscode.postMessage({ command: 'getWorkflows' });
            
            // 创建工作流按钮点击事件
            document.getElementById('createWorkflowBtn').addEventListener('click', () => {
              // 目前只是重新加载工作流列表
              vscode.postMessage({ command: 'getWorkflows' });
            });
            
            // 处理来自扩展的消息
            window.addEventListener('message', event => {
              const message = event.data;
              
              switch (message.command) {
                case 'workflowsLoaded':
                  updateWorkflowList(message.workflows);
                  break;
                case 'stageExecuted':
                  // 显示阶段执行结果
                  showStageResult(message.workflowId, message.stageId, message.result);
                  break;
                case 'workflowUpdated':
                  // 更新工作流状态
                  updateWorkflowStatus(message.workflowId, message.status);
                  break;
                case 'error':
                  showError(message.message);
                  break;
              }
            });
            
            // 更新工作流列表
            function updateWorkflowList(workflows) {
              const workflowList = document.getElementById('workflowList');
              
              if (workflows.length === 0) {
                workflowList.innerHTML = '<p>暂无工作流</p>';
                return;
              }
              
              let html = '';
              workflows.forEach(workflow => {
                const progress = workflow.status.progress.toFixed(0);
                
                html += \`
                  <div class="workflow-item" id="workflow-\${workflow.id}">
                    <h3>\${workflow.name}</h3>
                    <div class="progress-bar">
                      <div class="progress-value" style="width: \${progress}%"></div>
                    </div>
                    <p>进度: \${progress}%</p>
                    <p>当前阶段: \${workflow.status.currentStage}</p>
                    <div class="stage-list" id="stages-\${workflow.id}">
                \`;
                
                // 添加阶段列表
                Array.from(workflow.status.stages.entries()).forEach(([stageId, status]) => {
                  const isCurrent = stageId === workflow.status.currentStage;
                  const stageClass = isCurrent ? 'current' : 
                                    status === 'completed' ? 'completed' : 
                                    status === 'blocked' ? 'blocked' : '';
                  
                  html += \`
                    <div class="stage-item \${stageClass}" id="stage-\${stageId}">
                      <h4>\${stageId}</h4>
                      <p>状态: \${status}</p>
                      \${isCurrent ? \`
                        <button class="execute-btn" data-workflow="\${workflow.id}" data-stage="\${stageId}">
                          执行阶段
                        </button>
                        <button class="next-btn" data-workflow="\${workflow.id}">
                          下一阶段
                        </button>
                      \` : ''}
                    </div>
                  \`;
                });
                
                html += \`
                    </div>
                  </div>
                \`;
              });
              
              workflowList.innerHTML = html;
              
              // 添加执行阶段按钮点击事件
              document.querySelectorAll('.execute-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                  const workflowId = btn.getAttribute('data-workflow');
                  const stageId = btn.getAttribute('data-stage');
                  vscode.postMessage({ 
                    command: 'executeStage', 
                    workflowId,
                    stageId
                  });
                });
              });
              
              // 添加下一阶段按钮点击事件
              document.querySelectorAll('.next-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                  const workflowId = btn.getAttribute('data-workflow');
                  vscode.postMessage({ 
                    command: 'moveToNextStage', 
                    workflowId
                  });
                });
              });
            }
            
            // 显示阶段执行结果
            function showStageResult(workflowId, stageId, result) {
              const stageElement = document.getElementById(\`stage-\${stageId}\`);
              if (stageElement) {
                const resultHtml = \`
                  <div class="stage-result">
                    <p>完成任务: \${result.completedTasks} / \${result.totalTasks}</p>
                    \${result.errors.length > 0 ? \`
                      <p style="color: red;">错误:</p>
                      <ul>
                        \${result.errors.map(error => \`<li>\${error}</li>\`).join('')}
                      </ul>
                    \` : ''}
                  </div>
                \`;
                
                // 添加结果到阶段元素
                const resultContainer = stageElement.querySelector('.stage-result');
                if (resultContainer) {
                  resultContainer.innerHTML = resultHtml;
                } else {
                  stageElement.insertAdjacentHTML('beforeend', resultHtml);
                }
              }
            }
            
            // 更新工作流状态
            function updateWorkflowStatus(workflowId, status) {
              // 重新加载工作流列表
              vscode.postMessage({ command: 'getWorkflows' });
            }
            
            // 显示错误信息
            function showError(message) {
              const workflowList = document.getElementById('workflowList');
              workflowList.innerHTML = \`<p style="color: red;">错误: \${message}</p>\`;
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