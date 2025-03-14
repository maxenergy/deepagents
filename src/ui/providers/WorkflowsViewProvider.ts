import * as vscode from 'vscode';
import { WorkflowManager } from '../../workflows/WorkflowManager';
import { IUIComponent, UIComponentType, UIComponentState, UIComponentConfig, UIComponentMessage } from '../IUIComponent';
import { WorkflowStatus } from '../../workflows/IWorkflow';

/**
 * 工作流视图提供器类
 * 
 * 负责提供工作流管理视图
 */
export class WorkflowsViewProvider implements vscode.WebviewViewProvider, IUIComponent {
  public static readonly viewType = 'deepagents.workflowsView';
  public readonly id = 'workflows_view';
  public readonly type = UIComponentType.WEBVIEW_VIEW;
  public readonly state: UIComponentState = UIComponentState.INITIALIZING;
  
  private context: vscode.ExtensionContext;
  private workflowManager: WorkflowManager;
  private view?: vscode.WebviewView;
  private config?: UIComponentConfig;

  /**
   * 构造函数
   * 
   * @param context VSCode 扩展上下文
   * @param workflowManager 工作流管理器
   */
  constructor(context: vscode.ExtensionContext, workflowManager: WorkflowManager) {
    this.context = context;
    this.workflowManager = workflowManager;
  }

  /**
   * 初始化组件
   * 
   * @param context VSCode 扩展上下文
   * @param config 组件配置
   */
  public async initialize(context: vscode.ExtensionContext, config: UIComponentConfig): Promise<void> {
    this.context = context;
    this.config = config;
    (this as any).state = UIComponentState.READY;
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
        await this.handleMessage(message);
      },
      undefined,
      this.context.subscriptions
    );
  }

  /**
   * 处理来自组件的消息
   * 
   * @param message 消息
   * @returns 处理结果
   */
  public async handleMessage(message: UIComponentMessage): Promise<any> {
    if (!this.view) {
      return;
    }

    switch (message.command) {
      case 'getWorkflows':
        const workflows = await this.workflowManager.getAllWorkflows();
        this.view.webview.postMessage({ command: 'workflowsLoaded', workflows });
        break;
      case 'createWorkflow':
        try {
          const workflow = await this.workflowManager.createWorkflow(message.data.name, message.data.config);
          this.view.webview.postMessage({ command: 'workflowCreated', workflow });
        } catch (error) {
          this.view.webview.postMessage({ 
            command: 'error', 
            message: error instanceof Error ? error.message : String(error) 
          });
        }
        break;
      case 'removeWorkflow':
        try {
          const result = await this.workflowManager.removeWorkflow(message.data.id);
          this.view.webview.postMessage({ command: 'workflowRemoved', id: message.data.id, success: result });
        } catch (error) {
          this.view.webview.postMessage({ 
            command: 'error', 
            message: error instanceof Error ? error.message : String(error) 
          });
        }
        break;
      case 'getWorkflowDetails':
        try {
          const workflow = await this.workflowManager.getWorkflow(message.data.id);
          if (workflow) {
            this.view.webview.postMessage({ command: 'workflowDetailsLoaded', workflow });
          } else {
            throw new Error(`工作流 ${message.data.id} 不存在`);
          }
        } catch (error) {
          this.view.webview.postMessage({ 
            command: 'error', 
            message: error instanceof Error ? error.message : String(error) 
          });
        }
        break;
      case 'startWorkflow':
        try {
          const workflow = await this.workflowManager.getWorkflow(message.data.id);
          if (workflow) {
            await this.workflowManager.startWorkflow(message.data.id);
            this.view.webview.postMessage({ command: 'workflowStarted', id: message.data.id });
          } else {
            throw new Error(`工作流 ${message.data.id} 不存在`);
          }
        } catch (error) {
          this.view.webview.postMessage({ 
            command: 'error', 
            message: error instanceof Error ? error.message : String(error) 
          });
        }
        break;
      case 'pauseWorkflow':
        try {
          const workflow = await this.workflowManager.getWorkflow(message.data.id);
          if (workflow) {
            await this.workflowManager.pauseWorkflow(message.data.id);
            this.view.webview.postMessage({ command: 'workflowPaused', id: message.data.id });
          } else {
            throw new Error(`工作流 ${message.data.id} 不存在`);
          }
        } catch (error) {
          this.view.webview.postMessage({ 
            command: 'error', 
            message: error instanceof Error ? error.message : String(error) 
          });
        }
        break;
      case 'stopWorkflow':
        try {
          const workflow = await this.workflowManager.getWorkflow(message.data.id);
          if (workflow) {
            await this.workflowManager.stopWorkflow(message.data.id);
            this.view.webview.postMessage({ command: 'workflowStopped', id: message.data.id });
          } else {
            throw new Error(`工作流 ${message.data.id} 不存在`);
          }
        } catch (error) {
          this.view.webview.postMessage({ 
            command: 'error', 
            message: error instanceof Error ? error.message : String(error) 
          });
        }
        break;
      case 'updateWorkflowConfig':
        try {
          const workflow = await this.workflowManager.getWorkflow(message.data.id);
          if (workflow) {
            await this.workflowManager.updateWorkflow(message.data.id, message.data.config);
            this.view.webview.postMessage({ command: 'workflowUpdated', id: message.data.id });
          } else {
            throw new Error(`工作流 ${message.data.id} 不存在`);
          }
        } catch (error) {
          this.view.webview.postMessage({ 
            command: 'error', 
            message: error instanceof Error ? error.message : String(error) 
          });
        }
        break;
      case 'showNotification':
        vscode.window.showInformationMessage(message.data.message);
        break;
    }
  }

  /**
   * 获取 WebView 的 HTML
   * 
   * @param webview WebView
   * @returns HTML 字符串
   */
  private getHtmlForWebview(webview: vscode.Webview): string {
    // 获取资源路径
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'workflows.js'));
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'workflows.css'));
    const codiconsUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'node_modules', '@vscode/codicons', 'dist', 'codicon.css'));
    
    // 获取 nonce 用于内容安全策略
    const nonce = this.getNonce();
    
    return `
      <!DOCTYPE html>
      <html lang="zh-CN">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; font-src ${webview.cspSource};">
        <link href="${styleUri}" rel="stylesheet">
        <link href="${codiconsUri}" rel="stylesheet">
        <title>工作流管理</title>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>工作流管理</h2>
            <button id="createWorkflowBtn" class="button primary">
              <i class="codicon codicon-add"></i> 创建工作流
            </button>
          </div>
          
          <div class="workflows-list" id="workflowsList">
            <div class="loading">加载中...</div>
          </div>
          
          <div class="workflow-details" id="workflowDetails" style="display: none;">
            <div class="details-header">
              <h3 id="workflowName">工作流详情</h3>
              <div class="actions">
                <button id="backToListBtn" class="button secondary">
                  <i class="codicon codicon-arrow-left"></i> 返回
                </button>
                <button id="removeWorkflowBtn" class="button danger">
                  <i class="codicon codicon-trash"></i> 删除
                </button>
              </div>
            </div>
            
            <div class="details-content">
              <div class="detail-item">
                <label>ID:</label>
                <span id="workflowId"></span>
              </div>
              <div class="detail-item">
                <label>状态:</label>
                <span id="workflowStatus"></span>
              </div>
              
              <div class="workflow-controls">
                <button id="startWorkflowBtn" class="button primary">
                  <i class="codicon codicon-play"></i> 启动
                </button>
                <button id="pauseWorkflowBtn" class="button warning">
                  <i class="codicon codicon-debug-pause"></i> 暂停
                </button>
                <button id="stopWorkflowBtn" class="button danger">
                  <i class="codicon codicon-debug-stop"></i> 停止
                </button>
              </div>
              
              <div class="config-section">
                <h4>配置</h4>
                <div id="workflowConfig"></div>
                <button id="saveConfigBtn" class="button primary">
                  <i class="codicon codicon-save"></i> 保存配置
                </button>
              </div>
              
              <div class="steps-section">
                <h4>步骤</h4>
                <div id="workflowSteps"></div>
              </div>
            </div>
          </div>
          
          <div class="create-workflow-form" id="createWorkflowForm" style="display: none;">
            <div class="form-header">
              <h3>创建新工作流</h3>
              <button id="cancelCreateBtn" class="button secondary">
                <i class="codicon codicon-close"></i> 取消
              </button>
            </div>
            
            <div class="form-content">
              <div class="form-group">
                <label for="workflowNameInput">名称:</label>
                <input type="text" id="workflowNameInput" class="form-control" placeholder="输入工作流名称">
              </div>
              
              <div class="form-group">
                <label for="workflowDescInput">描述:</label>
                <textarea id="workflowDescInput" class="form-control" placeholder="输入工作流描述"></textarea>
              </div>
              
              <div class="form-group">
                <label for="workflowTypeSelect">类型:</label>
                <select id="workflowTypeSelect" class="form-control">
                  <option value="development">开发</option>
                  <option value="testing">测试</option>
                  <option value="deployment">部署</option>
                  <option value="custom">自定义</option>
                </select>
              </div>
              
              <button id="submitCreateBtn" class="button primary">
                <i class="codicon codicon-check"></i> 创建
              </button>
            </div>
          </div>
        </div>
        
        <script nonce="${nonce}">
          (function() {
            const vscode = acquireVsCodeApi();
            
            // 初始化时获取工作流列表
            window.addEventListener('load', () => {
              vscode.postMessage({ command: 'getWorkflows' });
            });
            
            // 处理来自扩展的消息
            window.addEventListener('message', event => {
              const message = event.data;
              
              switch (message.command) {
                case 'workflowsLoaded':
                  renderWorkflowsList(message.workflows);
                  break;
                case 'workflowCreated':
                  vscode.postMessage({ command: 'getWorkflows' });
                  showWorkflowsList();
                  break;
                case 'workflowRemoved':
                  if (message.success) {
                    vscode.postMessage({ command: 'getWorkflows' });
                    showWorkflowsList();
                  }
                  break;
                case 'workflowDetailsLoaded':
                  renderWorkflowDetails(message.workflow);
                  break;
                case 'workflowStarted':
                case 'workflowPaused':
                case 'workflowStopped':
                case 'workflowUpdated':
                  vscode.postMessage({ command: 'getWorkflowDetails', data: { id: message.id } });
                  break;
                case 'error':
                  showError(message.message);
                  break;
              }
            });
            
            // 渲染工作流列表
            function renderWorkflowsList(workflows) {
              const workflowsList = document.getElementById('workflowsList');
              
              if (!workflows || workflows.length === 0) {
                workflowsList.innerHTML = '<div class="empty-state">没有工作流，点击"创建工作流"按钮创建一个新工作流。</div>';
                return;
              }
              
              let html = '';
              workflows.forEach(workflow => {
                html += \`
                  <div class="workflow-card" data-id="\${workflow.id}">
                    <div class="workflow-info">
                      <div class="workflow-name">\${workflow.name}</div>
                      <div class="workflow-type">\${getTypeName(workflow.type)}</div>
                      <div class="workflow-status \${getStatusClass(workflow.status)}">\${getStatusName(workflow.status)}</div>
                    </div>
                    <div class="workflow-actions">
                      <button class="button view-workflow" data-id="\${workflow.id}">
                        <i class="codicon codicon-eye"></i>
                      </button>
                    </div>
                  </div>
                \`;
              });
              
              workflowsList.innerHTML = html;
              
              // 添加查看工作流详情的事件监听器
              document.querySelectorAll('.view-workflow').forEach(button => {
                button.addEventListener('click', (e) => {
                  const workflowId = e.currentTarget.getAttribute('data-id');
                  vscode.postMessage({ command: 'getWorkflowDetails', data: { id: workflowId } });
                  showWorkflowDetails();
                });
              });
            }
            
            // 渲染工作流详情
            function renderWorkflowDetails(workflow) {
              document.getElementById('workflowName').textContent = workflow.name;
              document.getElementById('workflowId').textContent = workflow.id;
              document.getElementById('workflowStatus').textContent = getStatusName(workflow.status);
              
              // 根据工作流状态启用/禁用控制按钮
              const startBtn = document.getElementById('startWorkflowBtn');
              const pauseBtn = document.getElementById('pauseWorkflowBtn');
              const stopBtn = document.getElementById('stopWorkflowBtn');
              
              startBtn.disabled = workflow.status === WorkflowStatus.RUNNING;
              pauseBtn.disabled = workflow.status !== WorkflowStatus.RUNNING;
              stopBtn.disabled = workflow.status === WorkflowStatus.STOPPED;
              
              // 渲染配置
              const configContainer = document.getElementById('workflowConfig');
              configContainer.innerHTML = '';
              
              if (workflow.config) {
                const configEditor = document.createElement('textarea');
                configEditor.id = 'configEditor';
                configEditor.className = 'config-editor';
                configEditor.value = JSON.stringify(workflow.config, null, 2);
                configContainer.appendChild(configEditor);
              } else {
                configContainer.textContent = '无配置';
              }
              
              // 渲染步骤列表
              const stepsContainer = document.getElementById('workflowSteps');
              stepsContainer.innerHTML = '';
              
              if (workflow.steps && workflow.steps.length > 0) {
                const stepsList = document.createElement('ul');
                stepsList.className = 'steps-list';
                
                workflow.steps.forEach((step, index) => {
                  const stepItem = document.createElement('li');
                  stepItem.className = 'step-item';
                  
                  const statusClass = step.completed ? 'step-completed' : 
                                     step.active ? 'step-active' : 'step-pending';
                  
                  stepItem.innerHTML = \`
                    <div class="step-number \${statusClass}">\${index + 1}</div>
                    <div class="step-content">
                      <div class="step-name">\${step.name}</div>
                      <div class="step-description">\${step.description || ''}</div>
                    </div>
                  \`;
                  
                  stepsList.appendChild(stepItem);
                });
                
                stepsContainer.appendChild(stepsList);
              } else {
                stepsContainer.textContent = '无步骤';
              }
              
              // 保存当前工作流 ID
              document.getElementById('removeWorkflowBtn').setAttribute('data-id', workflow.id);
              document.getElementById('startWorkflowBtn').setAttribute('data-id', workflow.id);
              document.getElementById('pauseWorkflowBtn').setAttribute('data-id', workflow.id);
              document.getElementById('stopWorkflowBtn').setAttribute('data-id', workflow.id);
              document.getElementById('saveConfigBtn').setAttribute('data-id', workflow.id);
            }
            
            // 显示工作流列表
            function showWorkflowsList() {
              document.getElementById('workflowsList').style.display = 'block';
              document.getElementById('workflowDetails').style.display = 'none';
              document.getElementById('createWorkflowForm').style.display = 'none';
            }
            
            // 显示工作流详情
            function showWorkflowDetails() {
              document.getElementById('workflowsList').style.display = 'none';
              document.getElementById('workflowDetails').style.display = 'block';
              document.getElementById('createWorkflowForm').style.display = 'none';
            }
            
            // 显示创建工作流表单
            function showCreateWorkflowForm() {
              document.getElementById('workflowsList').style.display = 'none';
              document.getElementById('workflowDetails').style.display = 'none';
              document.getElementById('createWorkflowForm').style.display = 'block';
            }
            
            // 显示错误信息
            function showError(message) {
              vscode.postMessage({ 
                command: 'showNotification', 
                data: { message }
              });
            }
            
            // 获取类型名称
            function getTypeName(type) {
              const typeNames = {
                'development': '开发',
                'testing': '测试',
                'deployment': '部署',
                'custom': '自定义'
              };
              return typeNames[type] || type;
            }
            
            // 获取状态名称
            function getStatusName(status) {
              const statusNames = {
                [WorkflowStatus.IDLE]: '空闲',
                [WorkflowStatus.RUNNING]: '运行中',
                [WorkflowStatus.PAUSED]: '已暂停',
                [WorkflowStatus.STOPPED]: '已停止',
                [WorkflowStatus.COMPLETED]: '已完成',
                [WorkflowStatus.ERROR]: '错误'
              };
              return statusNames[status] || status;
            }
            
            // 获取状态类名
            function getStatusClass(status) {
              const statusClasses = {
                [WorkflowStatus.IDLE]: 'status-idle',
                [WorkflowStatus.RUNNING]: 'status-running',
                [WorkflowStatus.PAUSED]: 'status-paused',
                [WorkflowStatus.STOPPED]: 'status-stopped',
                [WorkflowStatus.COMPLETED]: 'status-completed',
                [WorkflowStatus.ERROR]: 'status-error'
              };
              return statusClasses[status] || '';
            }
            
            // 事件监听器
            document.getElementById('createWorkflowBtn').addEventListener('click', () => {
              showCreateWorkflowForm();
            });
            
            document.getElementById('backToListBtn').addEventListener('click', () => {
              showWorkflowsList();
            });
            
            document.getElementById('removeWorkflowBtn').addEventListener('click', (e) => {
              const workflowId = e.currentTarget.getAttribute('data-id');
              if (confirm('确定要删除此工作流吗？')) {
                vscode.postMessage({ command: 'removeWorkflow', data: { id: workflowId } });
              }
            });
            
            document.getElementById('startWorkflowBtn').addEventListener('click', (e) => {
              const workflowId = e.currentTarget.getAttribute('data-id');
              vscode.postMessage({ command: 'startWorkflow', data: { id: workflowId } });
            });
            
            document.getElementById('pauseWorkflowBtn').addEventListener('click', (e) => {
              const workflowId = e.currentTarget.getAttribute('data-id');
              vscode.postMessage({ command: 'pauseWorkflow', data: { id: workflowId } });
            });
            
            document.getElementById('stopWorkflowBtn').addEventListener('click', (e) => {
              const workflowId = e.currentTarget.getAttribute('data-id');
              vscode.postMessage({ command: 'stopWorkflow', data: { id: workflowId } });
            });
            
            document.getElementById('saveConfigBtn').addEventListener('click', (e) => {
              const workflowId = e.currentTarget.getAttribute('data-id');
              const configEditor = document.getElementById('configEditor');
              
              try {
                const config = JSON.parse(configEditor.value);
                vscode.postMessage({ command: 'updateWorkflowConfig', data: { id: workflowId, config } });
              } catch (error) {
                showError('配置格式无效，请检查 JSON 格式');
              }
            });
            
            document.getElementById('cancelCreateBtn').addEventListener('click', () => {
              showWorkflowsList();
            });
            
            document.getElementById('submitCreateBtn').addEventListener('click', () => {
              const name = document.getElementById('workflowNameInput').value;
              const description = document.getElementById('workflowDescInput').value;
              const type = document.getElementById('workflowTypeSelect').value;
              
              if (!name) {
                showError('请输入工作流名称');
                return;
              }
              
              const config = {
                name,
                description,
                type
              };
              
              vscode.postMessage({ command: 'createWorkflow', data: { name, config } });
            });
          })();
        </script>
      </body>
      </html>
    `;
  }

  /**
   * 生成随机 nonce
   * @returns nonce 字符串
   */
  private getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  /**
   * 渲染组件
   * @returns WebView 视图
   */
  public render(): vscode.WebviewView | undefined {
    return this.view;
  }

  /**
   * 更新组件
   * @param data 更新数据
   */
  public update(data: any): void {
    if (this.view) {
      this.view.webview.postMessage({ command: 'update', data });
    }
  }

  /**
   * 显示组件
   */
  public show(): void {
    vscode.commands.executeCommand('deepagents.workflowsView.focus');
  }

  /**
   * 隐藏组件
   */
  public hide(): void {
    // WebView 视图无法直接隐藏，但可以通过关闭视图来实现
    // 这里不做任何操作，因为 VSCode 会管理视图的可见性
  }

  /**
   * 发送消息到组件
   * @param message 消息
   */
  public postMessage(message: UIComponentMessage): void {
    if (this.view) {
      this.view.webview.postMessage(message);
    }
  }

  /**
   * 释放资源
   */
  public dispose(): void {
    // 释放资源
  }
} 