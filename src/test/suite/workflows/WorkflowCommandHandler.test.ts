import * as vscode from 'vscode';
import { WorkflowCommandHandler } from '../../../workflows/WorkflowCommandHandler';
import { WorkflowManager } from '../../../workflows/WorkflowManager';
import { AgentManager } from '../../../agents/AgentManager';
import { WorkflowStatus } from '../../../workflows/IWorkflow';

describe('WorkflowCommandHandler Test Suite', () => {
  let workflowCommandHandler: WorkflowCommandHandler;
  let workflowManager: any; // 使用 any 类型以便可以访问 Jest mock 方法
  let agentManager: any; // 使用 any 类型以便可以访问 Jest mock 方法
  let context: vscode.ExtensionContext;
  let mockWorkflow: any;
  
  beforeEach(() => {
    // 创建 ExtensionContext 的模拟对象
    context = {
      subscriptions: [],
      extensionPath: '/test/path',
      storagePath: '/test/storage',
      globalState: {
        get: jest.fn(),
        update: jest.fn(),
        keys: jest.fn().mockReturnValue([])
      },
      workspaceState: {
        get: jest.fn(),
        update: jest.fn(),
        keys: jest.fn().mockReturnValue([])
      },
      secrets: {
        get: jest.fn(),
        store: jest.fn(),
        delete: jest.fn()
      },
      extensionUri: vscode.Uri.parse('file:///test/path'),
      environmentVariableCollection: {} as any,
      extensionMode: vscode.ExtensionMode.Development,
      globalStoragePath: '/test/global-storage',
      logPath: '/test/log',
      storageUri: vscode.Uri.parse('file:///test/storage'),
      globalStorageUri: vscode.Uri.parse('file:///test/global-storage'),
      logUri: vscode.Uri.parse('file:///test/log'),
      asAbsolutePath: jest.fn().mockImplementation(relativePath => `/test/path/${relativePath}`)
    } as unknown as vscode.ExtensionContext;
    
    // 创建 WorkflowManager 的模拟对象
    workflowManager = {
      createWorkflow: jest.fn(),
      getWorkflow: jest.fn(),
      getAllWorkflows: jest.fn(),
      updateWorkflow: jest.fn(),
      removeWorkflow: jest.fn(),
      saveWorkflow: jest.fn(),
      addWorkflowStep: jest.fn(),
      startWorkflow: jest.fn(),
      pauseWorkflow: jest.fn(),
      stopWorkflow: jest.fn()
    };
    
    // 创建 AgentManager 的模拟对象
    agentManager = {
      createAgent: jest.fn(),
      getAgent: jest.fn(),
      getAllAgents: jest.fn(),
      removeAgent: jest.fn(),
      getAgentsByRole: jest.fn()
    };
    
    // 创建模拟工作流
    mockWorkflow = {
      id: 'test-workflow-id',
      name: 'Test Workflow',
      config: {
        name: 'Test Workflow',
        description: 'Test workflow description',
        type: 'test',
        settings: {
          autoStart: false,
          continueOnError: false,
          notifyOnCompletion: true
        },
        input: {}
      },
      status: WorkflowStatus.IDLE,
      steps: []
    };
    
    // 模拟 VSCode 命令注册
    jest.spyOn(vscode.commands, 'registerCommand').mockImplementation((command, callback) => {
      return { dispose: jest.fn() } as vscode.Disposable;
    });
    
    // 模拟 VSCode 窗口函数
    jest.spyOn(vscode.window, 'showInformationMessage').mockImplementation(() => Promise.resolve(undefined));
    jest.spyOn(vscode.window, 'showErrorMessage').mockImplementation(() => Promise.resolve(undefined));
    jest.spyOn(vscode.window, 'showInputBox').mockImplementation(() => Promise.resolve('Test Input'));
    jest.spyOn(vscode.window, 'showQuickPick').mockImplementation((items) => {
      if (Array.isArray(items)) {
        return Promise.resolve(items[0]);
      }
      return Promise.resolve(undefined);
    });
    
    // 创建 WorkflowCommandHandler 实例
    workflowCommandHandler = new WorkflowCommandHandler(context, workflowManager, agentManager);
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
  });
  
  test('constructor should register commands', () => {
    // 验证结果
    expect(vscode.commands.registerCommand).toHaveBeenCalledWith('deepagents.createWorkflow', expect.any(Function));
    expect(vscode.commands.registerCommand).toHaveBeenCalledWith('deepagents.executeWorkflow', expect.any(Function));
    expect(vscode.commands.registerCommand).toHaveBeenCalledWith('deepagents.pauseWorkflow', expect.any(Function));
    expect(vscode.commands.registerCommand).toHaveBeenCalledWith('deepagents.stopWorkflow', expect.any(Function));
    expect(vscode.commands.registerCommand).toHaveBeenCalledWith('deepagents.retryWorkflow', expect.any(Function));
    expect(vscode.commands.registerCommand).toHaveBeenCalledWith('deepagents.retryCurrentStep', expect.any(Function));
    expect(vscode.commands.registerCommand).toHaveBeenCalledWith('deepagents.skipCurrentStep', expect.any(Function));
    expect(vscode.commands.registerCommand).toHaveBeenCalledWith('deepagents.createPredefinedWorkflow', expect.any(Function));
  });
  
  test('createWorkflow command should create a workflow', async () => {
    // 模拟 createWorkflow 返回模拟工作流
    (workflowManager.createWorkflow as jest.Mock).mockResolvedValue(mockWorkflow);
    
    // 获取 createWorkflow 命令回调
    const createWorkflowCallback = (vscode.commands.registerCommand as jest.Mock).mock.calls.find(
      call => call[0] === 'deepagents.createWorkflow'
    )[1];
    
    // 执行命令回调
    await createWorkflowCallback();
    
    // 验证结果
    expect(workflowManager.createWorkflow).toHaveBeenCalled();
    expect(vscode.window.showInformationMessage).toHaveBeenCalled();
  });
  
  test('executeWorkflow command should execute the selected workflow', async () => {
    // 设置模拟返回值
    workflowManager.getAllWorkflows.mockResolvedValue([mockWorkflow]);
    
    // 获取 executeWorkflow 命令回调
    const executeWorkflowCallback = (vscode.commands.registerCommand as jest.Mock).mock.calls.find(
      call => call[0] === 'deepagents.executeWorkflow'
    )[1];
    
    // 执行命令回调
    await executeWorkflowCallback();
    
    // 验证结果
    expect(workflowManager.getAllWorkflows).toHaveBeenCalled();
    expect(vscode.window.showQuickPick).toHaveBeenCalled();
  });
  
  test('pauseWorkflow command should pause the selected workflow', async () => {
    // 设置模拟返回值
    workflowManager.getAllWorkflows.mockResolvedValue([
      { ...mockWorkflow, status: 'RUNNING' }
    ]);
    
    // 获取 pauseWorkflow 命令回调
    const pauseWorkflowCallback = (vscode.commands.registerCommand as jest.Mock).mock.calls.find(
      call => call[0] === 'deepagents.pauseWorkflow'
    )[1];
    
    // 执行命令回调
    await pauseWorkflowCallback();
    
    // 验证结果
    expect(workflowManager.getAllWorkflows).toHaveBeenCalled();
    expect(vscode.window.showQuickPick).toHaveBeenCalled();
  });
  
  test('stopWorkflow command should stop the selected workflow', async () => {
    // 设置模拟返回值
    workflowManager.getAllWorkflows.mockResolvedValue([
      { ...mockWorkflow, status: 'RUNNING' }
    ]);
    
    // 获取 stopWorkflow 命令回调
    const stopWorkflowCallback = (vscode.commands.registerCommand as jest.Mock).mock.calls.find(
      call => call[0] === 'deepagents.stopWorkflow'
    )[1];
    
    // 执行命令回调
    await stopWorkflowCallback();
    
    // 验证结果
    expect(workflowManager.getAllWorkflows).toHaveBeenCalled();
    expect(vscode.window.showQuickPick).toHaveBeenCalled();
  });
  
  test('createPredefinedWorkflow command should create a predefined workflow', async () => {
    // 模拟 createWorkflow 返回模拟工作流
    (workflowManager.createWorkflow as jest.Mock).mockResolvedValue(mockWorkflow);
    
    // 获取 createPredefinedWorkflow 命令回调
    const createPredefinedWorkflowCallback = (vscode.commands.registerCommand as jest.Mock).mock.calls.find(
      call => call[0] === 'deepagents.createPredefinedWorkflow'
    )[1];
    
    // 执行命令回调
    await createPredefinedWorkflowCallback();
    
    // 验证结果
    expect(vscode.window.showQuickPick).toHaveBeenCalled();
    expect(vscode.window.showInputBox).toHaveBeenCalled();
  });
  
  test('retryWorkflow command should retry the selected workflow', async () => {
    // 设置模拟返回值
    workflowManager.getAllWorkflows.mockResolvedValue([
      { ...mockWorkflow, status: 'ERROR' }
    ]);
    
    // 获取 retryWorkflow 命令回调
    const retryWorkflowCallback = (vscode.commands.registerCommand as jest.Mock).mock.calls.find(
      call => call[0] === 'deepagents.retryWorkflow'
    )[1];
    
    // 执行命令回调
    await retryWorkflowCallback();
    
    // 验证结果
    expect(workflowManager.getAllWorkflows).toHaveBeenCalled();
    expect(vscode.window.showQuickPick).toHaveBeenCalled();
  });
  
  test('retryCurrentStep command should retry the current step of the selected workflow', async () => {
    // 设置模拟返回值
    workflowManager.getAllWorkflows.mockResolvedValue([
      { ...mockWorkflow, status: 'ERROR' }
    ]);
    
    // 获取 retryCurrentStep 命令回调
    const retryCurrentStepCallback = (vscode.commands.registerCommand as jest.Mock).mock.calls.find(
      call => call[0] === 'deepagents.retryCurrentStep'
    )[1];
    
    // 执行命令回调
    await retryCurrentStepCallback();
    
    // 验证结果
    expect(workflowManager.getAllWorkflows).toHaveBeenCalled();
    expect(vscode.window.showQuickPick).toHaveBeenCalled();
  });
  
  test('skipCurrentStep command should skip the current step of the selected workflow', async () => {
    // 设置模拟返回值
    workflowManager.getAllWorkflows.mockResolvedValue([
      { ...mockWorkflow, status: 'ERROR' }
    ]);
    
    // 获取 skipCurrentStep 命令回调
    const skipCurrentStepCallback = (vscode.commands.registerCommand as jest.Mock).mock.calls.find(
      call => call[0] === 'deepagents.skipCurrentStep'
    )[1];
    
    // 执行命令回调
    await skipCurrentStepCallback();
    
    // 验证结果
    expect(workflowManager.getAllWorkflows).toHaveBeenCalled();
    expect(vscode.window.showQuickPick).toHaveBeenCalled();
  });
}); 