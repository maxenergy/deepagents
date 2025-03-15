// 项目视图的 JavaScript 代码
(function() {
  // 获取 VSCode API
  const vscode = acquireVsCodeApi();
  
  // 页面加载完成后执行
  document.addEventListener('DOMContentLoaded', () => {
    // 获取 DOM 元素
    const projectsList = document.getElementById('projectsList');
    const projectDetails = document.getElementById('projectDetails');
    const createProjectBtn = document.getElementById('createProjectBtn');
    const backToListBtn = document.getElementById('backToListBtn');
    const removeProjectBtn = document.getElementById('removeProjectBtn');
    
    // 当前选中的项目 ID
    let selectedProjectId = null;
    
    // 加载项目列表
    function loadProjects() {
      vscode.postMessage({
        command: 'getProjects'
      });
    }
    
    // 显示项目列表
    function showProjectsList(projects) {
      projectsList.innerHTML = '';
      
      if (projects.length === 0) {
        projectsList.innerHTML = '<div class="empty-state">没有项目，点击"创建项目"按钮创建一个新的项目。</div>';
        return;
      }
      
      projects.forEach(project => {
        const projectItem = document.createElement('div');
        projectItem.className = 'project-item';
        projectItem.dataset.id = project.id;
        
        const statusClass = getStatusClass(project.status);
        
        projectItem.innerHTML = `
          <div class="project-header">
            <div class="project-name">${project.name}</div>
            <div class="project-status ${statusClass}">${project.status}</div>
          </div>
          <div class="project-description">${project.description || '无描述'}</div>
        `;
        
        projectItem.addEventListener('click', () => {
          selectedProjectId = project.id;
          vscode.postMessage({
            command: 'getProjectDetails',
            data: {
              id: project.id
            }
          });
        });
        
        projectsList.appendChild(projectItem);
      });
    }
    
    // 显示项目详情
    function showProjectDetails(project) {
      projectsList.style.display = 'none';
      projectDetails.style.display = 'block';
      
      document.getElementById('projectName').textContent = project.name;
      
      const detailsContent = projectDetails.querySelector('.details-content');
      detailsContent.innerHTML = '';
      
      // 添加状态
      const statusClass = getStatusClass(project.status);
      const statusItem = document.createElement('div');
      statusItem.className = 'detail-item';
      statusItem.innerHTML = `
        <div class="detail-label">状态</div>
        <div class="detail-value status ${statusClass}">${project.status}</div>
      `;
      detailsContent.appendChild(statusItem);
      
      // 添加描述
      const descriptionItem = document.createElement('div');
      descriptionItem.className = 'detail-item';
      descriptionItem.innerHTML = `
        <div class="detail-label">描述</div>
        <div class="detail-value">${project.description || '无描述'}</div>
      `;
      detailsContent.appendChild(descriptionItem);
      
      // 添加路径
      const pathItem = document.createElement('div');
      pathItem.className = 'detail-item';
      pathItem.innerHTML = `
        <div class="detail-label">路径</div>
        <div class="detail-value">${project.path || '无路径'}</div>
      `;
      detailsContent.appendChild(pathItem);
      
      // 添加创建时间
      const createdAtItem = document.createElement('div');
      createdAtItem.className = 'detail-item';
      createdAtItem.innerHTML = `
        <div class="detail-label">创建时间</div>
        <div class="detail-value">${new Date(project.createdAt).toLocaleString()}</div>
      `;
      detailsContent.appendChild(createdAtItem);
      
      // 添加更新时间
      const updatedAtItem = document.createElement('div');
      updatedAtItem.className = 'detail-item';
      updatedAtItem.innerHTML = `
        <div class="detail-label">更新时间</div>
        <div class="detail-value">${new Date(project.updatedAt).toLocaleString()}</div>
      `;
      detailsContent.appendChild(updatedAtItem);
      
      // 添加操作按钮
      const actionsItem = document.createElement('div');
      actionsItem.className = 'detail-item';
      actionsItem.innerHTML = `
        <div class="project-actions">
          <button id="openProjectBtn" class="button primary">
            <i class="codicon codicon-folder-opened"></i> 打开项目
          </button>
          <button id="generateCodeBtn" class="button secondary">
            <i class="codicon codicon-code"></i> 生成代码
          </button>
        </div>
      `;
      detailsContent.appendChild(actionsItem);
      
      // 注册操作按钮事件
      document.getElementById('openProjectBtn')?.addEventListener('click', () => {
        openProject();
      });
      
      document.getElementById('generateCodeBtn')?.addEventListener('click', () => {
        generateCode();
      });
    }
    
    // 获取状态对应的 CSS 类
    function getStatusClass(status) {
      switch (status) {
        case 'IN_PROGRESS':
          return 'status-in-progress';
        case 'COMPLETED':
          return 'status-completed';
        case 'FAILED':
          return 'status-failed';
        default:
          return 'status-pending';
      }
    }
    
    // 创建项目
    function createProject() {
      vscode.window.showInputBox({
        prompt: '输入项目名称',
        placeHolder: '例如：我的新项目'
      }).then(name => {
        if (name) {
          vscode.window.showInputBox({
            prompt: '输入项目描述',
            placeHolder: '例如：这是一个示例项目'
          }).then(description => {
            vscode.postMessage({
              command: 'createProject',
              data: {
                name,
                description: description || '',
                config: {}
              }
            });
          });
        }
      });
    }
    
    // 返回列表
    function backToList() {
      projectDetails.style.display = 'none';
      projectsList.style.display = 'block';
      selectedProjectId = null;
    }
    
    // 删除项目
    function removeProject() {
      if (selectedProjectId) {
        vscode.window.showWarningMessage('确定要删除这个项目吗？', '是', '否').then(answer => {
          if (answer === '是') {
            vscode.postMessage({
              command: 'removeProject',
              data: {
                id: selectedProjectId
              }
            });
          }
        });
      }
    }
    
    // 打开项目
    function openProject() {
      if (selectedProjectId) {
        vscode.postMessage({
          command: 'openProject',
          data: {
            id: selectedProjectId
          }
        });
      }
    }
    
    // 生成代码
    function generateCode() {
      if (selectedProjectId) {
        vscode.postMessage({
          command: 'generateCode',
          data: {
            id: selectedProjectId
          }
        });
      }
    }
    
    // 注册事件监听器
    if (createProjectBtn) {
      createProjectBtn.addEventListener('click', createProject);
    }
    
    if (backToListBtn) {
      backToListBtn.addEventListener('click', backToList);
    }
    
    if (removeProjectBtn) {
      removeProjectBtn.addEventListener('click', removeProject);
    }
    
    // 监听来自扩展的消息
    window.addEventListener('message', event => {
      const message = event.data;
      
      switch (message.command) {
        case 'projectsLoaded':
          showProjectsList(message.projects);
          break;
        case 'projectDetailsLoaded':
          showProjectDetails(message.project);
          break;
        case 'projectCreated':
          loadProjects();
          break;
        case 'projectRemoved':
          if (message.success) {
            backToList();
            loadProjects();
          }
          break;
        case 'projectOpened':
          vscode.window.showInformationMessage(`项目 ${message.name} 已打开`);
          break;
        case 'codeGenerated':
          vscode.window.showInformationMessage(`项目 ${message.name} 的代码已生成`);
          break;
        case 'error':
          vscode.window.showErrorMessage(message.message);
          break;
      }
    });
    
    // 加载项目列表
    loadProjects();
  });
})(); 