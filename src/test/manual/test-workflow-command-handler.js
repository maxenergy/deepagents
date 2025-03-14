// 手动测试 WorkflowCommandHandler 类
const path = require('path');
const fs = require('fs');

console.log('开始测试 WorkflowCommandHandler...');

// 模拟 vscode 模块
global.vscode = {
  commands: {
    registerCommand: (command, callback) => {
      console.log(`注册命令: ${command}`);
      // 保存命令和回调函数
      if (!global.vscode.commands._commands) {
        global.vscode.commands._commands = new Map();
      }
      global.vscode.commands._commands.set(command, callback);
      return { dispose: () => {} };
    },
    _commands: new Map()
  },
  window: {
    showInformationMessage: (message) => {
      console.log(`信息: ${message}`);
      return Promise.resolve();
    },
    showErrorMessage: (message) => {
      console.log(`错误: ${message}`);
      return Promise.resolve();
    },
    showInputBox: (options) => {
      console.log(`输入框: ${options?.prompt || ''}`);
      return Promise.resolve('测试输入');
    },
    showQuickPick: (items, options) => {
      console.log(`快速选择: ${options?.placeHolder || ''}`);
      if (Array.isArray(items)) {
        console.log(`  选项: ${items.map(item => typeof item === 'string' ? item : item.label).join(', ')}`);
        return Promise.resolve(items[0]);
      }
      return Promise.resolve();
    }
  },
  Uri: {
    parse: (uri) => ({ toString: () => uri })
  },
  ExtensionMode: {
    Development: 1
  }
};

// 模拟 WorkflowManager
class MockWorkflowManager {
  constructor() {
    this.workflows = new Map();
    console.log('创建 MockWorkflowManager 实例');
  }

  async createWorkflow(name, config) {
    const id = `workflow-${Date.now()}`;
    const workflow = {
      id,
      name,
      config,
      status: 'idle',
      steps: []
    };
    this.workflows.set(id, workflow);
    console.log(`创建工作流: ${name} (${id})`);
    return workflow;
  }

  async getWorkflow(id) {
    console.log(`获取工作流: ${id}`);
    return this.workflows.get(id) || null;
  }

  async getAllWorkflows() {
    console.log(`获取所有工作流, 数量: ${this.workflows.size}`);
    return Array.from(this.workflows.values());
  }

  async updateWorkflow(id, config) {
    console.log(`更新工作流: ${id}`);
    const workflow = this.workflows.get(id);
    if (!workflow) {
      throw new Error(`工作流不存在: ${id}`);
    }
    workflow.config = config;
    return workflow;
  }

  async removeWorkflow(id) {
    console.log(`删除工作流: ${id}`);
    return this.workflows.delete(id);
  }

  async addWorkflowStep(id, step) {
    console.log(`添加工作流步骤: ${id}`);
    const workflow = this.workflows.get(id);
    if (!workflow) {
      throw new Error(`工作流不存在: ${id}`);
    }
    workflow.steps.push(step);
    return workflow;
  }

  async startWorkflow(id) {
    console.log(`启动工作流: ${id}`);
    const workflow = this.workflows.get(id);
    if (!workflow) {
      throw new Error(`工作流不存在: ${id}`);
    }
    workflow.status = 'running';
    return workflow;
  }

  async pauseWorkflow(id) {
    console.log(`暂停工作流: ${id}`);
    const workflow = this.workflows.get(id);
    if (!workflow) {
      throw new Error(`工作流不存在: ${id}`);
    }
    workflow.status = 'paused';
    return workflow;
  }

  async stopWorkflow(id) {
    console.log(`停止工作流: ${id}`);
    const workflow = this.workflows.get(id);
    if (!workflow) {
      throw new Error(`工作流不存在: ${id}`);
    }
    workflow.status = 'stopped';
    return workflow;
  }
}

// 模拟 AgentManager
class MockAgentManager {
  constructor() {
    this.agents = new Map();
    console.log('创建 MockAgentManager 实例');
  }

  async createAgent(role, config) {
    const id = `agent-${Date.now()}`;
    const agent = {
      id,
      name: config.name,
      role,
      config
    };
    this.agents.set(id, agent);
    console.log(`创建代理: ${config.name} (${id})`);
    return agent;
  }

  async getAgent(id) {
    console.log(`获取代理: ${id}`);
    return this.agents.get(id) || null;
  }

  async getAllAgents() {
    console.log(`获取所有代理, 数量: ${this.agents.size}`);
    return Array.from(this.agents.values());
  }

  async removeAgent(id) {
    console.log(`删除代理: ${id}`);
    return this.agents.delete(id);
  }

  async getAgentsByRole(role) {
    console.log(`获取角色为 ${role} 的代理`);
    return Array.from(this.agents.values()).filter(agent => agent.role === role);
  }
}

// 模拟 ExtensionContext
const mockContext = {
  subscriptions: [],
  extensionPath: '/test/path',
  storagePath: '/test/storage',
  globalState: {
    get: () => null,
    update: () => Promise.resolve()
  },
  workspaceState: {
    get: () => null,
    update: () => Promise.resolve()
  },
  secrets: {
    get: () => Promise.resolve(null),
    store: () => Promise.resolve(),
    delete: () => Promise.resolve()
  },
  extensionUri: global.vscode.Uri.parse('file:///test/path'),
  environmentVariableCollection: {},
  extensionMode: global.vscode.ExtensionMode.Development,
  globalStoragePath: '/test/global-storage',
  logPath: '/test/log',
  storageUri: global.vscode.Uri.parse('file:///test/storage'),
  globalStorageUri: global.vscode.Uri.parse('file:///test/global-storage'),
  logUri: global.vscode.Uri.parse('file:///test/log'),
  asAbsolutePath: (relativePath) => `/test/path/${relativePath}`
};

// 运行测试
async function runTest() {
  try {
    console.log('准备导入 WorkflowCommandHandler 类...');
    
    // 动态导入 WorkflowCommandHandler 类
    const WorkflowCommandHandlerPath = path.resolve(__dirname, '../../workflows/WorkflowCommandHandler.js');
    console.log(`WorkflowCommandHandler 路径: ${WorkflowCommandHandlerPath}`);
    
    // 检查文件是否存在
    if (!fs.existsSync(WorkflowCommandHandlerPath)) {
      console.error(`文件不存在: ${WorkflowCommandHandlerPath}`);
      
      // 尝试查找 .ts 文件
      const tsPath = WorkflowCommandHandlerPath.replace('.js', '.ts');
      if (fs.existsSync(tsPath)) {
        console.log(`找到 TypeScript 文件: ${tsPath}`);
        console.log('请先编译 TypeScript 文件');
      }
      
      return;
    }
    
    const { WorkflowCommandHandler } = require('../../workflows/WorkflowCommandHandler');
    
    // 创建模拟对象
    const workflowManager = new MockWorkflowManager();
    const agentManager = new MockAgentManager();
    
    // 创建 WorkflowCommandHandler 实例
    console.log('创建 WorkflowCommandHandler 实例...');
    const workflowCommandHandler = new WorkflowCommandHandler(mockContext, workflowManager, agentManager);
    
    // 获取注册的命令
    console.log('\n已注册的命令:');
    for (const [command, callback] of global.vscode.commands._commands.entries()) {
      console.log(`- ${command}`);
    }
    
    // 测试 createWorkflow 命令
    console.log('\n测试 createWorkflow 命令...');
    const createWorkflowCallback = global.vscode.commands._commands.get('deepagents.createWorkflow');
    if (createWorkflowCallback) {
      await createWorkflowCallback();
    } else {
      console.log('未找到 createWorkflow 命令');
    }
    
    // 打印工作流列表
    console.log('\n工作流列表:');
    const workflows = await workflowManager.getAllWorkflows();
    workflows.forEach(workflow => {
      console.log(`- ${workflow.name} (${workflow.id}): ${workflow.status}`);
    });
    
    console.log('\n测试完成!');
  } catch (error) {
    console.error('测试失败:', error);
    console.error(error.stack);
  }
}

// 运行测试
runTest(); 