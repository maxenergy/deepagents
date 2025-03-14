import * as vscode from 'vscode';
import { WorkflowExecutor } from '../../../workflows/WorkflowExecutor';
import { WorkflowManager } from '../../../workflows/WorkflowManager';
import { IWorkflow, WorkflowStatus, IWorkflowStep } from '../../../workflows/IWorkflow';

describe('WorkflowExecutor Test Suite', () => {
  let workflowExecutor: WorkflowExecutor;
  let workflowManager: WorkflowManager;
  let mockWorkflow: any;
  
  beforeEach(() => {
    // 创建 WorkflowManager 的模拟对象
    workflowManager = {
      getWorkflow: jest.fn(),
      updateWorkflow: jest.fn(),
      getAllWorkflows: jest.fn(),
      createWorkflow: jest.fn(),
      removeWorkflow: jest.fn(),
      addWorkflowStep: jest.fn(),
      startWorkflow: jest.fn(),
      pauseWorkflow: jest.fn(),
      stopWorkflow: jest.fn()
    } as unknown as WorkflowManager;
    
    // 创建 WorkflowExecutor 实例
    workflowExecutor = new WorkflowExecutor(workflowManager);
    
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
      steps: [],
      start: jest.fn().mockImplementation(async () => {
        mockWorkflow.status = WorkflowStatus.RUNNING;
      }),
      pause: jest.fn().mockImplementation(async () => {
        mockWorkflow.status = WorkflowStatus.PAUSED;
      }),
      stop: jest.fn().mockImplementation(async () => {
        mockWorkflow.status = WorkflowStatus.STOPPED;
      }),
      getCurrentStep: jest.fn()
    };
    
    // 模拟 VSCode 窗口函数
    jest.spyOn(vscode.window, 'showInformationMessage').mockImplementation(() => Promise.resolve(undefined));
    jest.spyOn(vscode.window, 'showErrorMessage').mockImplementation(() => Promise.resolve(undefined));
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
  });
  
  test('executeWorkflow should start a workflow', async () => {
    // 模拟 getWorkflow 返回模拟工作流
    (workflowManager.getWorkflow as jest.Mock).mockResolvedValue(mockWorkflow);
    
    // 执行测试
    await workflowExecutor.executeWorkflow('test-workflow-id');
    
    // 验证结果
    expect(workflowManager.getWorkflow).toHaveBeenCalledWith('test-workflow-id');
    expect(mockWorkflow.start).toHaveBeenCalled();
    expect(workflowManager.updateWorkflow).toHaveBeenCalled();
    expect(vscode.window.showInformationMessage).toHaveBeenCalled();
  });
  
  test('executeWorkflow should throw error if workflow not found', async () => {
    // 模拟 getWorkflow 返回 null
    (workflowManager.getWorkflow as jest.Mock).mockResolvedValue(null);
    
    // 执行测试并验证结果
    await expect(workflowExecutor.executeWorkflow('non-existent-id')).rejects.toThrow();
  });
  
  test('executeWorkflow should throw error if workflow is already running', async () => {
    // 设置工作流状态为运行中
    mockWorkflow.status = WorkflowStatus.RUNNING;
    
    // 模拟 getWorkflow 返回模拟工作流
    (workflowManager.getWorkflow as jest.Mock).mockResolvedValue(mockWorkflow);
    
    // 执行测试并验证结果
    await expect(workflowExecutor.executeWorkflow('test-workflow-id')).rejects.toThrow();
  });
  
  test('pauseWorkflow should pause a running workflow', async () => {
    // 设置工作流状态为运行中
    mockWorkflow.status = WorkflowStatus.RUNNING;
    
    // 模拟 getWorkflow 返回模拟工作流
    (workflowManager.getWorkflow as jest.Mock).mockResolvedValue(mockWorkflow);
    
    // 执行测试
    await workflowExecutor.pauseWorkflow('test-workflow-id');
    
    // 验证结果
    expect(workflowManager.getWorkflow).toHaveBeenCalledWith('test-workflow-id');
    expect(mockWorkflow.pause).toHaveBeenCalled();
    expect(workflowManager.updateWorkflow).toHaveBeenCalled();
    expect(vscode.window.showInformationMessage).toHaveBeenCalled();
  });
  
  test('pauseWorkflow should throw error if workflow not found', async () => {
    // 模拟 getWorkflow 返回 null
    (workflowManager.getWorkflow as jest.Mock).mockResolvedValue(null);
    
    // 执行测试并验证结果
    await expect(workflowExecutor.pauseWorkflow('non-existent-id')).rejects.toThrow();
  });
  
  test('pauseWorkflow should throw error if workflow is not running', async () => {
    // 设置工作流状态为空闲
    mockWorkflow.status = WorkflowStatus.IDLE;
    
    // 模拟 getWorkflow 返回模拟工作流
    (workflowManager.getWorkflow as jest.Mock).mockResolvedValue(mockWorkflow);
    
    // 执行测试并验证结果
    await expect(workflowExecutor.pauseWorkflow('test-workflow-id')).rejects.toThrow();
  });
  
  test('stopWorkflow should stop a running workflow', async () => {
    // 设置工作流状态为运行中
    mockWorkflow.status = WorkflowStatus.RUNNING;
    
    // 模拟 getWorkflow 返回模拟工作流
    (workflowManager.getWorkflow as jest.Mock).mockResolvedValue(mockWorkflow);
    
    // 执行测试
    await workflowExecutor.stopWorkflow('test-workflow-id');
    
    // 验证结果
    expect(workflowManager.getWorkflow).toHaveBeenCalledWith('test-workflow-id');
    expect(mockWorkflow.stop).toHaveBeenCalled();
    expect(workflowManager.updateWorkflow).toHaveBeenCalled();
    expect(vscode.window.showInformationMessage).toHaveBeenCalled();
  });
  
  test('stopWorkflow should stop a paused workflow', async () => {
    // 设置工作流状态为暂停
    mockWorkflow.status = WorkflowStatus.PAUSED;
    
    // 模拟 getWorkflow 返回模拟工作流
    (workflowManager.getWorkflow as jest.Mock).mockResolvedValue(mockWorkflow);
    
    // 执行测试
    await workflowExecutor.stopWorkflow('test-workflow-id');
    
    // 验证结果
    expect(workflowManager.getWorkflow).toHaveBeenCalledWith('test-workflow-id');
    expect(mockWorkflow.stop).toHaveBeenCalled();
    expect(workflowManager.updateWorkflow).toHaveBeenCalled();
    expect(vscode.window.showInformationMessage).toHaveBeenCalled();
  });
  
  test('stopWorkflow should throw error if workflow not found', async () => {
    // 模拟 getWorkflow 返回 null
    (workflowManager.getWorkflow as jest.Mock).mockResolvedValue(null);
    
    // 执行测试并验证结果
    await expect(workflowExecutor.stopWorkflow('non-existent-id')).rejects.toThrow();
  });
  
  test('stopWorkflow should throw error if workflow is not running or paused', async () => {
    // 设置工作流状态为空闲
    mockWorkflow.status = WorkflowStatus.IDLE;
    
    // 模拟 getWorkflow 返回模拟工作流
    (workflowManager.getWorkflow as jest.Mock).mockResolvedValue(mockWorkflow);
    
    // 执行测试并验证结果
    await expect(workflowExecutor.stopWorkflow('test-workflow-id')).rejects.toThrow();
  });
  
  test('executeWorkflowSteps should execute workflow steps', async () => {
    // 创建模拟步骤
    const mockStep: IWorkflowStep = {
      id: 'step-1',
      name: 'Test Step',
      description: 'Test step description',
      completed: false,
      active: false,
      execute: jest.fn().mockResolvedValue({})
    };
    
    // 添加步骤到工作流
    mockWorkflow.steps = [mockStep];
    mockWorkflow.getCurrentStep = jest.fn().mockReturnValue(mockStep);
    mockWorkflow.status = WorkflowStatus.RUNNING;
    
    // 模拟 getWorkflow 返回模拟工作流
    (workflowManager.getWorkflow as jest.Mock).mockResolvedValue(mockWorkflow);
    
    // 执行测试
    await workflowExecutor.executeWorkflow('test-workflow-id');
    
    // 等待异步操作完成
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // 验证结果
    expect(mockWorkflow.getCurrentStep).toHaveBeenCalled();
    expect(mockStep.active).toBe(true);
    expect(mockStep.execute).toHaveBeenCalled();
    expect(workflowManager.updateWorkflow).toHaveBeenCalled();
  });
}); 