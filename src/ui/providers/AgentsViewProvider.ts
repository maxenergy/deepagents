import * as vscode from 'vscode';
import { AgentManager } from '../../agents/AgentManager';
import { IUIComponent, UIComponentType, UIComponentState, UIComponentConfig, UIComponentMessage } from '../IUIComponent';
import { AgentRole, AgentCapability, AgentState } from '../../agents/IAgent';

/**
 * 代理视图提供器类
 * 
 * 负责提供代理管理视图
 */
export class AgentsViewProvider implements vscode.WebviewViewProvider, IUIComponent {
  public static readonly viewType = 'deepagents.agentsView';
  public readonly id = 'agents_view';
  public readonly type = UIComponentType.WEBVIEW_VIEW;
  public readonly state: UIComponentState = UIComponentState.INITIALIZING;
  
  private context: vscode.ExtensionContext;
  private agentManager: AgentManager;
  private view?: vscode.WebviewView;
  private config?: UIComponentConfig;

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
      case 'getAgents':
        const agents = this.agentManager.getAllAgents();
        this.view.webview.postMessage({ command: 'agentsLoaded', agents });
        break;
      case 'createAgent':
        try {
          const agent = await this.agentManager.createAgent(message.data.role, message.data.config);
          this.view.webview.postMessage({ command: 'agentCreated', agent });
        } catch (error) {
          this.view.webview.postMessage({ 
            command: 'error', 
            message: error instanceof Error ? error.message : String(error) 
          });
        }
        break;
      case 'removeAgent':
        try {
          const result = await this.agentManager.removeAgent(message.data.id);
          this.view.webview.postMessage({ command: 'agentRemoved', id: message.data.id, success: result });
        } catch (error) {
          this.view.webview.postMessage({ 
            command: 'error', 
            message: error instanceof Error ? error.message : String(error) 
          });
        }
        break;
      case 'getAgentDetails':
        try {
          const agent = this.agentManager.getAgent(message.data.id);
          if (agent) {
            this.view.webview.postMessage({ command: 'agentDetailsLoaded', agent });
          } else {
            throw new Error(`代理 ${message.data.id} 不存在`);
          }
        } catch (error) {
          this.view.webview.postMessage({ 
            command: 'error', 
            message: error instanceof Error ? error.message : String(error) 
          });
        }
        break;
      case 'updateAgentConfig':
        try {
          const agent = this.agentManager.getAgent(message.data.id);
          if (agent) {
            await agent.initialize(message.data.config);
            this.view.webview.postMessage({ command: 'agentUpdated', agent });
          } else {
            throw new Error(`代理 ${message.data.id} 不存在`);
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
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'agents.js'));
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'agents.css'));
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
        <title>代理管理</title>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>代理管理</h2>
            <button id="createAgentBtn" class="button primary">
              <i class="codicon codicon-add"></i> 创建代理
            </button>
          </div>
          
          <div class="agents-list" id="agentsList">
            <div class="loading">加载中...</div>
          </div>
          
          <div class="agent-details" id="agentDetails" style="display: none;">
            <div class="details-header">
              <h3 id="agentName">代理详情</h3>
              <div class="actions">
                <button id="backToListBtn" class="button secondary">
                  <i class="codicon codicon-arrow-left"></i> 返回
                </button>
                <button id="removeAgentBtn" class="button danger">
                  <i class="codicon codicon-trash"></i> 删除
                </button>
              </div>
            </div>
            
            <div class="details-content">
              <div class="detail-item">
                <label>ID:</label>
                <span id="agentId"></span>
              </div>
              <div class="detail-item">
                <label>角色:</label>
                <span id="agentRole"></span>
              </div>
              <div class="detail-item">
                <label>状态:</label>
                <span id="agentState"></span>
              </div>
              <div class="detail-item">
                <label>能力:</label>
                <div id="agentCapabilities"></div>
              </div>
              
              <div class="config-section">
                <h4>配置</h4>
                <div id="agentConfig"></div>
                <button id="saveConfigBtn" class="button primary">
                  <i class="codicon codicon-save"></i> 保存配置
                </button>
              </div>
            </div>
          </div>
          
          <div class="create-agent-form" id="createAgentForm" style="display: none;">
            <div class="form-header">
              <h3>创建新代理</h3>
              <button id="cancelCreateBtn" class="button secondary">
                <i class="codicon codicon-close"></i> 取消
              </button>
            </div>
            
            <div class="form-content">
              <div class="form-group">
                <label for="agentRoleSelect">角色:</label>
                <select id="agentRoleSelect" class="form-control">
                  <option value="${AgentRole.PRODUCT_MANAGER}">产品经理</option>
                  <option value="${AgentRole.ARCHITECT}">架构师</option>
                  <option value="${AgentRole.DEVELOPER}">开发者</option>
                  <option value="${AgentRole.TESTER}">测试员</option>
                  <option value="${AgentRole.DEVOPS}">开发运维</option>
                </select>
              </div>
              
              <div class="form-group">
                <label for="agentNameInput">名称:</label>
                <input type="text" id="agentNameInput" class="form-control" placeholder="输入代理名称">
              </div>
              
              <div class="form-group">
                <label for="agentModelSelect">模型:</label>
                <select id="agentModelSelect" class="form-control">
                  <option value="gpt-4o">GPT-4o</option>
                  <option value="gpt-4-turbo">GPT-4 Turbo</option>
                  <option value="claude-3-opus-20240229">Claude 3 Opus</option>
                  <option value="claude-3-sonnet-20240229">Claude 3 Sonnet</option>
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
            
            // 初始化时获取代理列表
            window.addEventListener('load', () => {
              vscode.postMessage({ command: 'getAgents' });
            });
            
            // 处理来自扩展的消息
            window.addEventListener('message', event => {
              const message = event.data;
              
              switch (message.command) {
                case 'agentsLoaded':
                  renderAgentsList(message.agents);
                  break;
                case 'agentCreated':
                  vscode.postMessage({ command: 'getAgents' });
                  showAgentsList();
                  break;
                case 'agentRemoved':
                  if (message.success) {
                    vscode.postMessage({ command: 'getAgents' });
                    showAgentsList();
                  }
                  break;
                case 'agentDetailsLoaded':
                  renderAgentDetails(message.agent);
                  break;
                case 'agentUpdated':
                  renderAgentDetails(message.agent);
                  break;
                case 'error':
                  showError(message.message);
                  break;
              }
            });
            
            // 渲染代理列表
            function renderAgentsList(agents) {
              const agentsList = document.getElementById('agentsList');
              
              if (!agents || agents.length === 0) {
                agentsList.innerHTML = '<div class="empty-state">没有代理，点击"创建代理"按钮创建一个新代理。</div>';
                return;
              }
              
              let html = '';
              agents.forEach(agent => {
                html += \`
                  <div class="agent-card" data-id="\${agent.id}">
                    <div class="agent-info">
                      <div class="agent-name">\${agent.name}</div>
                      <div class="agent-role">\${getRoleName(agent.role)}</div>
                      <div class="agent-state \${getStateClass(agent.state)}">\${getStateName(agent.state)}</div>
                    </div>
                    <div class="agent-actions">
                      <button class="button view-agent" data-id="\${agent.id}">
                        <i class="codicon codicon-eye"></i>
                      </button>
                    </div>
                  </div>
                \`;
              });
              
              agentsList.innerHTML = html;
              
              // 添加查看代理详情的事件监听器
              document.querySelectorAll('.view-agent').forEach(button => {
                button.addEventListener('click', (e) => {
                  const agentId = e.currentTarget.getAttribute('data-id');
                  vscode.postMessage({ command: 'getAgentDetails', id: agentId });
                  showAgentDetails();
                });
              });
            }
            
            // 渲染代理详情
            function renderAgentDetails(agent) {
              document.getElementById('agentName').textContent = agent.name;
              document.getElementById('agentId').textContent = agent.id;
              document.getElementById('agentRole').textContent = getRoleName(agent.role);
              document.getElementById('agentState').textContent = getStateName(agent.state);
              
              // 渲染能力
              const capabilitiesContainer = document.getElementById('agentCapabilities');
              capabilitiesContainer.innerHTML = '';
              
              if (agent.capabilities && agent.capabilities.length > 0) {
                agent.capabilities.forEach(capability => {
                  const badge = document.createElement('span');
                  badge.className = 'badge';
                  badge.textContent = getCapabilityName(capability);
                  capabilitiesContainer.appendChild(badge);
                });
              } else {
                capabilitiesContainer.textContent = '无';
              }
              
              // 渲染配置
              const configContainer = document.getElementById('agentConfig');
              configContainer.innerHTML = '';
              
              if (agent._config) {
                const configEditor = document.createElement('textarea');
                configEditor.id = 'configEditor';
                configEditor.className = 'config-editor';
                configEditor.value = JSON.stringify(agent._config, null, 2);
                configContainer.appendChild(configEditor);
              } else {
                configContainer.textContent = '无配置';
              }
              
              // 保存当前代理 ID
              document.getElementById('removeAgentBtn').setAttribute('data-id', agent.id);
              document.getElementById('saveConfigBtn').setAttribute('data-id', agent.id);
            }
            
            // 显示代理列表
            function showAgentsList() {
              document.getElementById('agentsList').style.display = 'block';
              document.getElementById('agentDetails').style.display = 'none';
              document.getElementById('createAgentForm').style.display = 'none';
            }
            
            // 显示代理详情
            function showAgentDetails() {
              document.getElementById('agentsList').style.display = 'none';
              document.getElementById('agentDetails').style.display = 'block';
              document.getElementById('createAgentForm').style.display = 'none';
            }
            
            // 显示创建代理表单
            function showCreateAgentForm() {
              document.getElementById('agentsList').style.display = 'none';
              document.getElementById('agentDetails').style.display = 'none';
              document.getElementById('createAgentForm').style.display = 'block';
            }
            
            // 显示错误信息
            function showError(message) {
              vscode.postMessage({ 
                command: 'showNotification', 
                message
              });
            }
            
            // 获取角色名称
            function getRoleName(role) {
              const roleNames = {
                [AgentRole.PRODUCT_MANAGER]: '产品经理',
                [AgentRole.ARCHITECT]: '架构师',
                [AgentRole.DEVELOPER]: '开发者',
                [AgentRole.TESTER]: '测试员',
                [AgentRole.DEVOPS]: '开发运维',
                [AgentRole.DOCUMENTATION]: '文档编写'
              };
              return roleNames[role] || role;
            }
            
            // 获取状态名称
            function getStateName(state) {
              const stateNames = {
                [AgentState.IDLE]: '空闲',
                [AgentState.INITIALIZING]: '初始化中',
                [AgentState.PROCESSING]: '处理中',
                [AgentState.ERROR]: '错误'
              };
              return stateNames[state] || state;
            }
            
            // 获取状态类名
            function getStateClass(state) {
              const stateClasses = {
                [AgentState.IDLE]: 'state-idle',
                [AgentState.INITIALIZING]: 'state-initializing',
                [AgentState.PROCESSING]: 'state-processing',
                [AgentState.ERROR]: 'state-error'
              };
              return stateClasses[state] || '';
            }
            
            // 获取能力名称
            function getCapabilityName(capability) {
              const capabilityNames = {
                [AgentCapability.REQUIREMENTS_ANALYSIS]: '需求分析',
                [AgentCapability.SYSTEM_DESIGN]: '系统设计',
                [AgentCapability.CODE_GENERATION]: '代码生成',
                [AgentCapability.TESTING]: '测试',
                [AgentCapability.DEPLOYMENT]: '部署',
                [AgentCapability.DOCUMENTATION]: '文档编写'
              };
              return capabilityNames[capability] || capability;
            }
            
            // 事件监听器
            document.getElementById('createAgentBtn').addEventListener('click', () => {
              showCreateAgentForm();
            });
            
            document.getElementById('backToListBtn').addEventListener('click', () => {
              showAgentsList();
            });
            
            document.getElementById('removeAgentBtn').addEventListener('click', (e) => {
              const agentId = e.currentTarget.getAttribute('data-id');
              if (confirm('确定要删除此代理吗？')) {
                vscode.postMessage({ command: 'removeAgent', id: agentId });
              }
            });
            
            document.getElementById('saveConfigBtn').addEventListener('click', (e) => {
              const agentId = e.currentTarget.getAttribute('data-id');
              const configEditor = document.getElementById('configEditor');
              
              try {
                const config = JSON.parse(configEditor.value);
                vscode.postMessage({ command: 'updateAgentConfig', id: agentId, config });
              } catch (error) {
                showError('配置格式无效，请检查 JSON 格式');
              }
            });
            
            document.getElementById('cancelCreateBtn').addEventListener('click', () => {
              showAgentsList();
            });
            
            document.getElementById('submitCreateBtn').addEventListener('click', () => {
              const role = document.getElementById('agentRoleSelect').value;
              const name = document.getElementById('agentNameInput').value;
              const model = document.getElementById('agentModelSelect').value;
              
              if (!name) {
                showError('请输入代理名称');
                return;
              }
              
              const config = {
                name,
                role,
                model
              };
              
              vscode.postMessage({ command: 'createAgent', role, config });
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
    vscode.commands.executeCommand('deepagents.agentsView.focus');
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