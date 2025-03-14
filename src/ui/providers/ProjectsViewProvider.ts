import * as vscode from 'vscode';
import { ProjectManager } from '../../projects/ProjectManager';
import { IUIComponent, UIComponentType, UIComponentState, UIComponentConfig, UIComponentMessage } from '../IUIComponent';
import { ProjectStatus } from '../../projects/IProject';

/**
 * 项目视图提供器类
 * 
 * 负责提供项目管理视图
 */
export class ProjectsViewProvider implements vscode.WebviewViewProvider, IUIComponent {
  public static readonly viewType = 'deepagents.projectsView';
  public readonly id = 'projects_view';
  public readonly type = UIComponentType.WEBVIEW_VIEW;
  public readonly state: UIComponentState = UIComponentState.INITIALIZING;
  
  private context: vscode.ExtensionContext;
  private projectManager: ProjectManager;
  private view?: vscode.WebviewView;
  private config?: UIComponentConfig;

  /**
   * 构造函数
   * 
   * @param context VSCode 扩展上下文
   * @param projectManager 项目管理器
   */
  constructor(context: vscode.ExtensionContext, projectManager: ProjectManager) {
    this.context = context;
    this.projectManager = projectManager;
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
      case 'getProjects':
        const projects = await this.projectManager.getAllProjects();
        this.view.webview.postMessage({ command: 'projectsLoaded', projects });
        break;
      case 'createProject':
        try {
          const project = await this.projectManager.createProject(message.data.name, message.data.config);
          this.view.webview.postMessage({ command: 'projectCreated', project });
        } catch (error) {
          this.view.webview.postMessage({ 
            command: 'error', 
            message: error instanceof Error ? error.message : String(error) 
          });
        }
        break;
      case 'removeProject':
        try {
          const result = await this.projectManager.removeProject(message.data.id);
          this.view.webview.postMessage({ command: 'projectRemoved', id: message.data.id, success: result });
        } catch (error) {
          this.view.webview.postMessage({ 
            command: 'error', 
            message: error instanceof Error ? error.message : String(error) 
          });
        }
        break;
      case 'getProjectDetails':
        try {
          const project = await this.projectManager.getProject(message.data.id);
          if (project) {
            this.view.webview.postMessage({ command: 'projectDetailsLoaded', project });
          } else {
            throw new Error(`项目 ${message.data.id} 不存在`);
          }
        } catch (error) {
          this.view.webview.postMessage({ 
            command: 'error', 
            message: error instanceof Error ? error.message : String(error) 
          });
        }
        break;
      case 'updateProjectConfig':
        try {
          const project = await this.projectManager.getProject(message.data.id);
          if (project) {
            await this.projectManager.updateProject(message.data.id, message.data.config);
            this.view.webview.postMessage({ command: 'projectUpdated', id: message.data.id });
          } else {
            throw new Error(`项目 ${message.data.id} 不存在`);
          }
        } catch (error) {
          this.view.webview.postMessage({ 
            command: 'error', 
            message: error instanceof Error ? error.message : String(error) 
          });
        }
        break;
      case 'openProject':
        try {
          const project = await this.projectManager.getProject(message.data.id);
          if (project) {
            await this.projectManager.openProject(message.data.id);
            this.view.webview.postMessage({ command: 'projectOpened', id: message.data.id });
          } else {
            throw new Error(`项目 ${message.data.id} 不存在`);
          }
        } catch (error) {
          this.view.webview.postMessage({ 
            command: 'error', 
            message: error instanceof Error ? error.message : String(error) 
          });
        }
        break;
      case 'closeProject':
        try {
          const project = await this.projectManager.getProject(message.data.id);
          if (project) {
            await this.projectManager.closeProject(message.data.id);
            this.view.webview.postMessage({ command: 'projectClosed', id: message.data.id });
          } else {
            throw new Error(`项目 ${message.data.id} 不存在`);
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
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'projects.js'));
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'projects.css'));
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
        <title>项目管理</title>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>项目管理</h2>
            <button id="createProjectBtn" class="button primary">
              <i class="codicon codicon-add"></i> 创建项目
            </button>
          </div>
          
          <div class="projects-list" id="projectsList">
            <div class="loading">加载中...</div>
          </div>
          
          <div class="project-details" id="projectDetails" style="display: none;">
            <div class="details-header">
              <h3 id="projectName">项目详情</h3>
              <div class="actions">
                <button id="backToListBtn" class="button secondary">
                  <i class="codicon codicon-arrow-left"></i> 返回
                </button>
                <button id="removeProjectBtn" class="button danger">
                  <i class="codicon codicon-trash"></i> 删除
                </button>
              </div>
            </div>
            
            <div class="details-content">
              <div class="detail-item">
                <label>ID:</label>
                <span id="projectId"></span>
              </div>
              <div class="detail-item">
                <label>路径:</label>
                <span id="projectPath"></span>
              </div>
              <div class="detail-item">
                <label>状态:</label>
                <span id="projectStatus"></span>
              </div>
              
              <div class="project-controls">
                <button id="openProjectBtn" class="button primary">
                  <i class="codicon codicon-folder-opened"></i> 打开项目
                </button>
                <button id="closeProjectBtn" class="button warning">
                  <i class="codicon codicon-folder"></i> 关闭项目
                </button>
              </div>
              
              <div class="config-section">
                <h4>配置</h4>
                <div id="projectConfig"></div>
                <button id="saveConfigBtn" class="button primary">
                  <i class="codicon codicon-save"></i> 保存配置
                </button>
              </div>
              
              <div class="files-section">
                <h4>文件</h4>
                <div id="projectFiles"></div>
              </div>
            </div>
          </div>
          
          <div class="create-project-form" id="createProjectForm" style="display: none;">
            <div class="form-header">
              <h3>创建新项目</h3>
              <button id="cancelCreateBtn" class="button secondary">
                <i class="codicon codicon-close"></i> 取消
              </button>
            </div>
            
            <div class="form-content">
              <div class="form-group">
                <label for="projectNameInput">名称:</label>
                <input type="text" id="projectNameInput" class="form-control" placeholder="输入项目名称">
              </div>
              
              <div class="form-group">
                <label for="projectDescInput">描述:</label>
                <textarea id="projectDescInput" class="form-control" placeholder="输入项目描述"></textarea>
              </div>
              
              <div class="form-group">
                <label for="projectPathInput">路径:</label>
                <div class="path-input-container">
                  <input type="text" id="projectPathInput" class="form-control" placeholder="输入项目路径">
                  <button id="browsePathBtn" class="button secondary">
                    <i class="codicon codicon-folder"></i> 浏览
                  </button>
                </div>
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
            
            // 初始化时获取项目列表
            window.addEventListener('load', () => {
              vscode.postMessage({ command: 'getProjects' });
            });
            
            // 处理来自扩展的消息
            window.addEventListener('message', event => {
              const message = event.data;
              
              switch (message.command) {
                case 'projectsLoaded':
                  renderProjectsList(message.projects);
                  break;
                case 'projectCreated':
                  vscode.postMessage({ command: 'getProjects' });
                  showProjectsList();
                  break;
                case 'projectRemoved':
                  if (message.success) {
                    vscode.postMessage({ command: 'getProjects' });
                    showProjectsList();
                  }
                  break;
                case 'projectDetailsLoaded':
                  renderProjectDetails(message.project);
                  break;
                case 'projectUpdated':
                case 'projectOpened':
                case 'projectClosed':
                  vscode.postMessage({ command: 'getProjectDetails', data: { id: message.id } });
                  break;
                case 'error':
                  showError(message.message);
                  break;
              }
            });
            
            // 渲染项目列表
            function renderProjectsList(projects) {
              const projectsList = document.getElementById('projectsList');
              
              if (!projects || projects.length === 0) {
                projectsList.innerHTML = '<div class="empty-state">没有项目，点击"创建项目"按钮创建一个新项目。</div>';
                return;
              }
              
              let html = '';
              projects.forEach(project => {
                html += \`
                  <div class="project-card" data-id="\${project.id}">
                    <div class="project-info">
                      <div class="project-name">\${project.name}</div>
                      <div class="project-path">\${project.path}</div>
                      <div class="project-status \${getStatusClass(project.status)}">\${getStatusName(project.status)}</div>
                    </div>
                    <div class="project-actions">
                      <button class="button view-project" data-id="\${project.id}">
                        <i class="codicon codicon-eye"></i>
                      </button>
                    </div>
                  </div>
                \`;
              });
              
              projectsList.innerHTML = html;
              
              // 添加查看项目详情的事件监听器
              document.querySelectorAll('.view-project').forEach(button => {
                button.addEventListener('click', (e) => {
                  const projectId = e.currentTarget.getAttribute('data-id');
                  vscode.postMessage({ command: 'getProjectDetails', data: { id: projectId } });
                  showProjectDetails();
                });
              });
            }
            
            // 渲染项目详情
            function renderProjectDetails(project) {
              document.getElementById('projectName').textContent = project.name;
              document.getElementById('projectId').textContent = project.id;
              document.getElementById('projectPath').textContent = project.path;
              document.getElementById('projectStatus').textContent = getStatusName(project.status);
              
              // 根据项目状态启用/禁用控制按钮
              const openBtn = document.getElementById('openProjectBtn');
              const closeBtn = document.getElementById('closeProjectBtn');
              
              openBtn.disabled = project.status === ProjectStatus.OPEN;
              closeBtn.disabled = project.status !== ProjectStatus.OPEN;
              
              // 渲染配置
              const configContainer = document.getElementById('projectConfig');
              configContainer.innerHTML = '';
              
              if (project.config) {
                const configEditor = document.createElement('textarea');
                configEditor.id = 'configEditor';
                configEditor.className = 'config-editor';
                configEditor.value = JSON.stringify(project.config, null, 2);
                configContainer.appendChild(configEditor);
              } else {
                configContainer.textContent = '无配置';
              }
              
              // 渲染文件列表
              const filesContainer = document.getElementById('projectFiles');
              filesContainer.innerHTML = '';
              
              if (project.files && project.files.length > 0) {
                const filesList = document.createElement('ul');
                filesList.className = 'files-list';
                
                project.files.forEach(file => {
                  const fileItem = document.createElement('li');
                  fileItem.className = 'file-item';
                  
                  const icon = file.isDirectory ? 'folder' : 'file';
                  
                  fileItem.innerHTML = \`
                    <i class="codicon codicon-\${icon}"></i>
                    <span class="file-name">\${file.name}</span>
                  \`;
                  
                  filesList.appendChild(fileItem);
                });
                
                filesContainer.appendChild(filesList);
              } else {
                filesContainer.textContent = '无文件';
              }
              
              // 保存当前项目 ID
              document.getElementById('removeProjectBtn').setAttribute('data-id', project.id);
              document.getElementById('openProjectBtn').setAttribute('data-id', project.id);
              document.getElementById('closeProjectBtn').setAttribute('data-id', project.id);
              document.getElementById('saveConfigBtn').setAttribute('data-id', project.id);
            }
            
            // 显示项目列表
            function showProjectsList() {
              document.getElementById('projectsList').style.display = 'block';
              document.getElementById('projectDetails').style.display = 'none';
              document.getElementById('createProjectForm').style.display = 'none';
            }
            
            // 显示项目详情
            function showProjectDetails() {
              document.getElementById('projectsList').style.display = 'none';
              document.getElementById('projectDetails').style.display = 'block';
              document.getElementById('createProjectForm').style.display = 'none';
            }
            
            // 显示创建项目表单
            function showCreateProjectForm() {
              document.getElementById('projectsList').style.display = 'none';
              document.getElementById('projectDetails').style.display = 'none';
              document.getElementById('createProjectForm').style.display = 'block';
            }
            
            // 显示错误信息
            function showError(message) {
              vscode.postMessage({ 
                command: 'showNotification', 
                data: { message }
              });
            }
            
            // 获取状态名称
            function getStatusName(status) {
              const statusNames = {
                [ProjectStatus.CLOSED]: '已关闭',
                [ProjectStatus.OPEN]: '已打开',
                [ProjectStatus.CREATING]: '创建中',
                [ProjectStatus.ERROR]: '错误'
              };
              return statusNames[status] || status;
            }
            
            // 获取状态类名
            function getStatusClass(status) {
              const statusClasses = {
                [ProjectStatus.CLOSED]: 'status-closed',
                [ProjectStatus.OPEN]: 'status-open',
                [ProjectStatus.CREATING]: 'status-creating',
                [ProjectStatus.ERROR]: 'status-error'
              };
              return statusClasses[status] || '';
            }
            
            // 事件监听器
            document.getElementById('createProjectBtn').addEventListener('click', () => {
              showCreateProjectForm();
            });
            
            document.getElementById('backToListBtn').addEventListener('click', () => {
              showProjectsList();
            });
            
            document.getElementById('removeProjectBtn').addEventListener('click', (e) => {
              const projectId = e.currentTarget.getAttribute('data-id');
              if (confirm('确定要删除此项目吗？')) {
                vscode.postMessage({ command: 'removeProject', data: { id: projectId } });
              }
            });
            
            document.getElementById('openProjectBtn').addEventListener('click', (e) => {
              const projectId = e.currentTarget.getAttribute('data-id');
              vscode.postMessage({ command: 'openProject', data: { id: projectId } });
            });
            
            document.getElementById('closeProjectBtn').addEventListener('click', (e) => {
              const projectId = e.currentTarget.getAttribute('data-id');
              vscode.postMessage({ command: 'closeProject', data: { id: projectId } });
            });
            
            document.getElementById('saveConfigBtn').addEventListener('click', (e) => {
              const projectId = e.currentTarget.getAttribute('data-id');
              const configEditor = document.getElementById('configEditor');
              
              try {
                const config = JSON.parse(configEditor.value);
                vscode.postMessage({ command: 'updateProjectConfig', data: { id: projectId, config } });
              } catch (error) {
                showError('配置格式无效，请检查 JSON 格式');
              }
            });
            
            document.getElementById('cancelCreateBtn').addEventListener('click', () => {
              showProjectsList();
            });
            
            document.getElementById('browsePathBtn').addEventListener('click', () => {
              vscode.postMessage({ command: 'browsePath' });
            });
            
            document.getElementById('submitCreateBtn').addEventListener('click', () => {
              const name = document.getElementById('projectNameInput').value;
              const description = document.getElementById('projectDescInput').value;
              const path = document.getElementById('projectPathInput').value;
              
              if (!name) {
                showError('请输入项目名称');
                return;
              }
              
              if (!path) {
                showError('请输入项目路径');
                return;
              }
              
              const config = {
                name,
                description,
                path
              };
              
              vscode.postMessage({ command: 'createProject', data: { name, config } });
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
    vscode.commands.executeCommand('deepagents.projectsView.focus');
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