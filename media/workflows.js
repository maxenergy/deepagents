// 工作流视图的 JavaScript 代码
(function() {
  // 获取 VSCode API
  const vscode = acquireVsCodeApi();
  
  // 页面加载完成后执行
  document.addEventListener('DOMContentLoaded', () => {
    // 获取 DOM 元素
    const workflowsList = document.getElementById('workflowsList');
    const workflowDetails = document.getElementById('workflowDetails');
    const createWorkflowBtn = document.getElementById('createWorkflowBtn');
    const backToListBtn = document.getElementById('backToListBtn');
    const removeWorkflowBtn = document.getElementById('removeWorkflowBtn');
    const startWorkflowBtn = document.getElementById('startWorkflowBtn');
    const pauseWorkflowBtn = document.getElementById('pauseWorkflowBtn');
    const stopWorkflowBtn = document.getElementById('stopWorkflowBtn');
    
    // 当前选中的工作流 ID
    let selectedWorkflowId = null;
    
    // 加载工作流列表
    function loadWorkflows() {
      vscode.postMessage({
        command: 'getWorkflows'
      });
    }
    
    // 显示工作流列表
    function showWorkflowsList(workflows) {
      workflowsList.innerHTML = '';
      
      if (workflows.length === 0) {
        workflowsList.innerHTML = '<div class="empty-state">没有工作流，点击"创建工作流"按钮创建一个新的工作流。</div>';
        return;
      }
      
      workflows.forEach(workflow => {
        const workflowItem = document.createElement('div');
        workflowItem.className = 'workflow-item';
        workflowItem.dataset.id = workflow.id;
        
        const statusClass = getStatusClass(workflow.status);
        
        workflowItem.innerHTML = `
          <div class="workflow-header">
            <div class="workflow-name">${workflow.name}</div>
            <div class="workflow-status ${statusClass}">${workflow.status}</div>
          </div>
          <div class="workflow-description">${workflow.description || '无描述'}</div>
        `;
        
        workflowItem.addEventListener('click', () => {
          selectedWorkflowId = workflow.id;
          vscode.postMessage({
            command: 'getWorkflowDetails',
            data: {
              id: workflow.id
            }
          });
        });
        
        workflowsList.appendChild(workflowItem);
      });
    }
    
    // 显示工作流详情
    function showWorkflowDetails(workflow) {
      workflowsList.style.display = 'none';
      workflowDetails.style.display = 'block';
      
      document.getElementById('workflowName').textContent = workflow.name;
      
      const detailsContent = workflowDetails.querySelector('.details-content');
      detailsContent.innerHTML = '';
      
      // 添加状态
      const statusClass = getStatusClass(workflow.status);
      const statusItem = document.createElement('div');
      statusItem.className = 'detail-item';
      statusItem.innerHTML = `
        <div class="detail-label">状态</div>
        <div class="detail-value status ${statusClass}">${workflow.status}</div>
      `;
      detailsContent.appendChild(statusItem);
      
      // 添加描述
      const descriptionItem = document.createElement('div');
      descriptionItem.className = 'detail-item';
      descriptionItem.innerHTML = `
        <div class="detail-label">描述</div>
        <div class="detail-value">${workflow.description || '无描述'}</div>
      `;
      detailsContent.appendChild(descriptionItem);
      
      // 添加阶段
      const stagesItem = document.createElement('div');
      stagesItem.className = 'detail-item';
      stagesItem.innerHTML = `
        <div class="detail-label">阶段</div>
        <div class="detail-value stages-list"></div>
      `;
      detailsContent.appendChild(stagesItem);
      
      const stagesList = stagesItem.querySelector('.stages-list');
      
      if (workflow.stages && workflow.stages.length > 0) {
        workflow.stages.forEach(stage => {
          const stageItem = document.createElement('div');
          stageItem.className = 'stage-item';
          const stageStatusClass = getStatusClass(stage.status);
          stageItem.innerHTML = `
            <div class="stage-header">
              <div class="stage-name">${stage.name}</div>
              <div class="stage-status ${stageStatusClass}">${stage.status}</div>
            </div>
            <div class="stage-description">${stage.description || '无描述'}</div>
          `;
          stagesList.appendChild(stageItem);
        });
      } else {
        stagesList.innerHTML = '<div class="empty-state">没有阶段</div>';
      }
      
      // 更新按钮状态
      updateButtonsState(workflow.status);
    }
    
    // 更新按钮状态
    function updateButtonsState(status) {
      if (startWorkflowBtn) {
        startWorkflowBtn.disabled = status === 'RUNNING';
      }
      
      if (pauseWorkflowBtn) {
        pauseWorkflowBtn.disabled = status !== 'RUNNING';
      }
      
      if (stopWorkflowBtn) {
        stopWorkflowBtn.disabled = status === 'COMPLETED' || status === 'FAILED';
      }
    }
    
    // 获取状态对应的 CSS 类
    function getStatusClass(status) {
      switch (status) {
        case 'RUNNING':
          return 'status-running';
        case 'PAUSED':
          return 'status-paused';
        case 'COMPLETED':
          return 'status-completed';
        case 'FAILED':
          return 'status-failed';
        default:
          return 'status-pending';
      }
    }
    
    // 创建工作流
    function createWorkflow() {
      vscode.window.showInputBox({
        prompt: '输入工作流名称',
        placeHolder: '例如：我的新项目'
      }).then(name => {
        if (name) {
          vscode.postMessage({
            command: 'createWorkflow',
            data: {
              name,
              config: {
                description: '',
                template: 'default'
              }
            }
          });
        }
      });
    }
    
    // 返回列表
    function backToList() {
      workflowDetails.style.display = 'none';
      workflowsList.style.display = 'block';
      selectedWorkflowId = null;
    }
    
    // 删除工作流
    function removeWorkflow() {
      if (selectedWorkflowId) {
        vscode.window.showWarningMessage('确定要删除这个工作流吗？', '是', '否').then(answer => {
          if (answer === '是') {
            vscode.postMessage({
              command: 'removeWorkflow',
              data: {
                id: selectedWorkflowId
              }
            });
          }
        });
      }
    }
    
    // 启动工作流
    function startWorkflow() {
      if (selectedWorkflowId) {
        vscode.postMessage({
          command: 'startWorkflow',
          data: {
            id: selectedWorkflowId
          }
        });
      }
    }
    
    // 暂停工作流
    function pauseWorkflow() {
      if (selectedWorkflowId) {
        vscode.postMessage({
          command: 'pauseWorkflow',
          data: {
            id: selectedWorkflowId
          }
        });
      }
    }
    
    // 停止工作流
    function stopWorkflow() {
      if (selectedWorkflowId) {
        vscode.postMessage({
          command: 'stopWorkflow',
          data: {
            id: selectedWorkflowId
          }
        });
      }
    }
    
    // 注册事件监听器
    if (createWorkflowBtn) {
      createWorkflowBtn.addEventListener('click', createWorkflow);
    }
    
    if (backToListBtn) {
      backToListBtn.addEventListener('click', backToList);
    }
    
    if (removeWorkflowBtn) {
      removeWorkflowBtn.addEventListener('click', removeWorkflow);
    }
    
    if (startWorkflowBtn) {
      startWorkflowBtn.addEventListener('click', startWorkflow);
    }
    
    if (pauseWorkflowBtn) {
      pauseWorkflowBtn.addEventListener('click', pauseWorkflow);
    }
    
    if (stopWorkflowBtn) {
      stopWorkflowBtn.addEventListener('click', stopWorkflow);
    }
    
    // 监听来自扩展的消息
    window.addEventListener('message', event => {
      const message = event.data;
      
      switch (message.command) {
        case 'workflowsLoaded':
          showWorkflowsList(message.workflows);
          break;
        case 'workflowDetailsLoaded':
          showWorkflowDetails(message.workflow);
          break;
        case 'workflowCreated':
          loadWorkflows();
          break;
        case 'workflowRemoved':
          if (message.success) {
            backToList();
            loadWorkflows();
          }
          break;
        case 'workflowStarted':
          vscode.postMessage({
            command: 'getWorkflowDetails',
            data: {
              id: selectedWorkflowId
            }
          });
          break;
        case 'workflowPaused':
          vscode.postMessage({
            command: 'getWorkflowDetails',
            data: {
              id: selectedWorkflowId
            }
          });
          break;
        case 'workflowStopped':
          vscode.postMessage({
            command: 'getWorkflowDetails',
            data: {
              id: selectedWorkflowId
            }
          });
          break;
        case 'error':
          vscode.window.showErrorMessage(message.message);
          break;
      }
    });
    
    // 加载工作流列表
    loadWorkflows();
  });
})(); 