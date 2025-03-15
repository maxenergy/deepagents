// 代理视图的 JavaScript 代码
(function() {
  // 获取 VSCode API
  const vscode = acquireVsCodeApi();
  
  // 页面加载完成后执行
  document.addEventListener('DOMContentLoaded', () => {
    // 获取 DOM 元素
    const agentsList = document.getElementById('agentsList');
    const agentDetails = document.getElementById('agentDetails');
    const createAgentBtn = document.getElementById('createAgentBtn');
    const backToListBtn = document.getElementById('backToListBtn');
    const removeAgentBtn = document.getElementById('removeAgentBtn');
    
    // 当前选中的代理 ID
    let selectedAgentId = null;
    
    // 加载代理列表
    function loadAgents() {
      vscode.postMessage({
        command: 'getAgents'
      });
    }
    
    // 显示代理列表
    function showAgentsList(agents) {
      agentsList.innerHTML = '';
      
      if (agents.length === 0) {
        agentsList.innerHTML = '<div class="empty-state">没有代理，点击"创建代理"按钮创建一个新的代理。</div>';
        return;
      }
      
      agents.forEach(agent => {
        const agentItem = document.createElement('div');
        agentItem.className = 'agent-item';
        agentItem.dataset.id = agent.id;
        
        const statusClass = getStatusClass(agent.state);
        
        agentItem.innerHTML = `
          <div class="agent-header">
            <div class="agent-name">${agent.name}</div>
            <div class="agent-status ${statusClass}">${agent.state}</div>
          </div>
          <div class="agent-role">${agent.role}</div>
        `;
        
        agentItem.addEventListener('click', () => {
          selectedAgentId = agent.id;
          vscode.postMessage({
            command: 'getAgentDetails',
            data: {
              id: agent.id
            }
          });
        });
        
        agentsList.appendChild(agentItem);
      });
    }
    
    // 显示代理详情
    function showAgentDetails(agent) {
      agentsList.style.display = 'none';
      agentDetails.style.display = 'block';
      
      document.getElementById('agentName').textContent = agent.name;
      
      const detailsContent = agentDetails.querySelector('.details-content');
      detailsContent.innerHTML = '';
      
      // 添加状态
      const statusClass = getStatusClass(agent.state);
      const statusItem = document.createElement('div');
      statusItem.className = 'detail-item';
      statusItem.innerHTML = `
        <div class="detail-label">状态</div>
        <div class="detail-value status ${statusClass}">${agent.state}</div>
      `;
      detailsContent.appendChild(statusItem);
      
      // 添加角色
      const roleItem = document.createElement('div');
      roleItem.className = 'detail-item';
      roleItem.innerHTML = `
        <div class="detail-label">角色</div>
        <div class="detail-value">${agent.role}</div>
      `;
      detailsContent.appendChild(roleItem);
      
      // 添加能力
      const capabilitiesItem = document.createElement('div');
      capabilitiesItem.className = 'detail-item';
      capabilitiesItem.innerHTML = `
        <div class="detail-label">能力</div>
        <div class="detail-value capabilities-list"></div>
      `;
      detailsContent.appendChild(capabilitiesItem);
      
      const capabilitiesList = capabilitiesItem.querySelector('.capabilities-list');
      
      if (agent.capabilities && agent.capabilities.length > 0) {
        const capabilitiesUl = document.createElement('ul');
        agent.capabilities.forEach(capability => {
          const capabilityItem = document.createElement('li');
          capabilityItem.textContent = capability;
          capabilitiesUl.appendChild(capabilityItem);
        });
        capabilitiesList.appendChild(capabilitiesUl);
      } else {
        capabilitiesList.innerHTML = '<div class="empty-state">没有能力</div>';
      }
      
      // 添加配置
      const configItem = document.createElement('div');
      configItem.className = 'detail-item';
      configItem.innerHTML = `
        <div class="detail-label">配置</div>
        <div class="detail-value">
          <pre class="config-json">${JSON.stringify(agent.config || {}, null, 2)}</pre>
        </div>
      `;
      detailsContent.appendChild(configItem);
      
      // 添加操作按钮
      const actionsItem = document.createElement('div');
      actionsItem.className = 'detail-item';
      actionsItem.innerHTML = `
        <div class="agent-actions">
          <button id="startAgentBtn" class="button primary" ${agent.state === 'RUNNING' ? 'disabled' : ''}>
            <i class="codicon codicon-play"></i> 启动
          </button>
          <button id="stopAgentBtn" class="button secondary" ${agent.state !== 'RUNNING' ? 'disabled' : ''}>
            <i class="codicon codicon-stop"></i> 停止
          </button>
        </div>
      `;
      detailsContent.appendChild(actionsItem);
      
      // 注册操作按钮事件
      document.getElementById('startAgentBtn')?.addEventListener('click', () => {
        startAgent();
      });
      
      document.getElementById('stopAgentBtn')?.addEventListener('click', () => {
        stopAgent();
      });
    }
    
    // 获取状态对应的 CSS 类
    function getStatusClass(state) {
      switch (state) {
        case 'RUNNING':
          return 'status-running';
        case 'IDLE':
          return 'status-idle';
        case 'ERROR':
          return 'status-error';
        case 'COMPLETED':
          return 'status-completed';
        default:
          return 'status-idle';
      }
    }
    
    // 创建代理
    function createAgent() {
      // 显示代理角色选择
      const roles = [
        { id: 'product_manager', name: '产品经理' },
        { id: 'architect', name: '架构师' },
        { id: 'developer', name: '开发者' },
        { id: 'tester', name: '测试员' }
      ];
      
      const quickPickItems = roles.map(role => ({
        label: role.name,
        description: role.id,
        role: role
      }));
      
      vscode.postMessage({
        command: 'showQuickPick',
        data: {
          items: quickPickItems,
          placeHolder: '选择代理角色'
        }
      });
    }
    
    // 返回列表
    function backToList() {
      agentDetails.style.display = 'none';
      agentsList.style.display = 'block';
      selectedAgentId = null;
    }
    
    // 删除代理
    function removeAgent() {
      if (selectedAgentId) {
        vscode.window.showWarningMessage('确定要删除这个代理吗？', '是', '否').then(answer => {
          if (answer === '是') {
            vscode.postMessage({
              command: 'removeAgent',
              data: {
                id: selectedAgentId
              }
            });
          }
        });
      }
    }
    
    // 启动代理
    function startAgent() {
      if (selectedAgentId) {
        vscode.postMessage({
          command: 'startAgent',
          data: {
            id: selectedAgentId
          }
        });
      }
    }
    
    // 停止代理
    function stopAgent() {
      if (selectedAgentId) {
        vscode.postMessage({
          command: 'stopAgent',
          data: {
            id: selectedAgentId
          }
        });
      }
    }
    
    // 注册事件监听器
    if (createAgentBtn) {
      createAgentBtn.addEventListener('click', createAgent);
    }
    
    if (backToListBtn) {
      backToListBtn.addEventListener('click', backToList);
    }
    
    if (removeAgentBtn) {
      removeAgentBtn.addEventListener('click', removeAgent);
    }
    
    // 监听来自扩展的消息
    window.addEventListener('message', event => {
      const message = event.data;
      
      switch (message.command) {
        case 'agentsLoaded':
          showAgentsList(message.agents);
          break;
        case 'agentDetailsLoaded':
          showAgentDetails(message.agent);
          break;
        case 'agentCreated':
          loadAgents();
          break;
        case 'agentRemoved':
          if (message.success) {
            backToList();
            loadAgents();
          }
          break;
        case 'agentStarted':
          vscode.postMessage({
            command: 'getAgentDetails',
            data: {
              id: selectedAgentId
            }
          });
          break;
        case 'agentStopped':
          vscode.postMessage({
            command: 'getAgentDetails',
            data: {
              id: selectedAgentId
            }
          });
          break;
        case 'quickPickResult':
          if (message.data && message.data.role) {
            vscode.window.showInputBox({
              prompt: '输入代理名称',
              placeHolder: `${message.data.role.name}`
            }).then(name => {
              if (name) {
                vscode.postMessage({
                  command: 'createAgent',
                  data: {
                    name,
                    role: message.data.role.id,
                    config: {}
                  }
                });
              }
            });
          }
          break;
        case 'error':
          vscode.window.showErrorMessage(message.message);
          break;
      }
    });
    
    // 加载代理列表
    loadAgents();
  });
})(); 