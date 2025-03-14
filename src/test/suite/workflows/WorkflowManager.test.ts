import * as assert from 'assert';
import * as vscode from 'vscode';
import { WorkflowManager } from '../../../workflows/WorkflowManager';
import { StorageManager, StorageNamespace } from '../../../storage/StorageManager';
import { IWorkflow, WorkflowStatus, IWorkflowStep } from '../../../workflows/IWorkflow';

describe('WorkflowManager Test Suite', () => {
  let workflowManager: WorkflowManager;
  let storageManager: StorageManager;
  let storageStub: any;
  
  beforeEach(() => {
    // 创建 StorageManager 的模拟对象
    storageManager = new StorageManager({} as vscode.ExtensionContext);
    
    // 创建存储的模拟对象
    storageStub = {
      get: jest.fn(),
      set: jest.fn().mockResolvedValue(true),
      delete: jest.fn().mockResolvedValue(true),
      getAll: jest.fn().mockResolvedValue(new Map()),
      clear: jest.fn().mockResolvedValue(true)
    };
    
    // 模拟 getStorage 方法返回模拟的存储对象
    jest.spyOn(storageManager, 'getStorage').mockReturnValue(storageStub);
    
    // 创建 WorkflowManager 实例
    workflowManager = new WorkflowManager(storageManager);
  });
  
  afterEach(() => {
    // 恢复所有模拟
    jest.restoreAllMocks();
  });
  
  test('createWorkflow should create a new workflow', async () => {
    // 准备测试数据
    const name = 'Test Workflow';
    const config = {
      name,
      description: 'Test workflow description',
      type: 'test',
      settings: {
        autoStart: false,
        continueOnError: false,
        notifyOnCompletion: true
      },
      input: {}
    };
    
    // 执行测试
    const workflow = await workflowManager.createWorkflow(name, config);
    
    // 验证结果
    expect(workflow.name).toBe(name);
    expect(workflow.config.description).toBe(config.description);
    expect(workflow.config.type).toBe(config.type);
    expect(workflow.status).toBe(WorkflowStatus.IDLE);
    expect(workflow.steps.length).toBe(0);
    
    // 验证存储调用
    expect(storageStub.set).toHaveBeenCalledTimes(1);
  });
  
  test('getWorkflow should return a workflow by id', async () => {
    // 准备测试数据
    const workflowId = 'test-workflow-id';
    const workflowData = {
      id: workflowId,
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
    
    // 模拟存储返回工作流数据
    storageStub.get.mockImplementation((id: string) => {
      if (id === workflowId) {
        return Promise.resolve(workflowData);
      }
      return Promise.resolve(null);
    });
    
    // 执行测试
    const workflow = await workflowManager.getWorkflow(workflowId);
    
    // 验证结果
    expect(workflow).not.toBeNull();
    if (workflow) {
      expect(workflow.id).toBe(workflowId);
      expect(workflow.name).toBe(workflowData.name);
      expect(workflow.status).toBe(WorkflowStatus.IDLE);
    }
  });
  
  test('getWorkflow should return null for non-existent workflow', async () => {
    // 模拟存储返回 null
    storageStub.get.mockResolvedValue(null);
    
    // 执行测试
    const workflow = await workflowManager.getWorkflow('non-existent-id');
    
    // 验证结果
    expect(workflow).toBeNull();
  });
  
  test('getAllWorkflows should return all workflows', async () => {
    // 准备测试数据
    const workflowsMap = new Map();
    workflowsMap.set('workflow-1', {
      id: 'workflow-1',
      name: 'Workflow 1',
      config: {
        name: 'Workflow 1',
        description: 'Workflow 1 description',
        type: 'test',
        settings: {},
        input: {}
      },
      status: WorkflowStatus.IDLE,
      steps: []
    });
    workflowsMap.set('workflow-2', {
      id: 'workflow-2',
      name: 'Workflow 2',
      config: {
        name: 'Workflow 2',
        description: 'Workflow 2 description',
        type: 'test',
        settings: {},
        input: {}
      },
      status: WorkflowStatus.COMPLETED,
      steps: []
    });
    
    // 模拟存储返回所有工作流
    storageStub.getAll.mockResolvedValue(workflowsMap);
    
    // 执行测试
    const workflows = await workflowManager.getAllWorkflows();
    
    // 验证结果
    expect(workflows.length).toBe(2);
    expect(workflows[0].id).toBe('workflow-1');
    expect(workflows[1].id).toBe('workflow-2');
  });
  
  test('updateWorkflow should update an existing workflow', async () => {
    // 准备测试数据
    const workflowId = 'test-workflow-id';
    const existingWorkflow = {
      id: workflowId,
      name: 'Test Workflow',
      config: {
        name: 'Test Workflow',
        description: 'Original description',
        type: 'test',
        settings: {},
        input: {}
      },
      status: WorkflowStatus.IDLE,
      steps: []
    };
    
    const updatedConfig = {
      name: 'Updated Workflow',
      description: 'Updated description',
      type: 'test',
      settings: {},
      input: {}
    };
    
    // 模拟存储返回现有工作流
    storageStub.get.mockResolvedValue(existingWorkflow);
    
    // 执行测试
    const updatedWorkflow = await workflowManager.updateWorkflow(workflowId, updatedConfig);
    
    // 验证结果
    expect(updatedWorkflow.name).toBe(updatedConfig.name);
    expect(updatedWorkflow.config.description).toBe(updatedConfig.description);
    
    // 验证存储调用
    expect(storageStub.set).toHaveBeenCalledTimes(1);
  });
  
  test('removeWorkflow should remove a workflow', async () => {
    // 准备测试数据
    const workflowId = 'test-workflow-id';
    
    // 模拟存储返回 true 表示删除成功
    storageStub.delete.mockResolvedValue(true);
    
    // 执行测试
    const result = await workflowManager.removeWorkflow(workflowId);
    
    // 验证结果
    expect(result).toBe(true);
    
    // 验证存储调用
    expect(storageStub.delete).toHaveBeenCalledTimes(1);
    expect(storageStub.delete).toHaveBeenCalledWith(workflowId);
  });
  
  test('addWorkflowStep should add a step to a workflow', async () => {
    // 准备测试数据
    const workflowId = 'test-workflow-id';
    const existingWorkflow = {
      id: workflowId,
      name: 'Test Workflow',
      config: {
        name: 'Test Workflow',
        description: 'Test description',
        type: 'test',
        settings: {},
        input: {}
      },
      status: WorkflowStatus.IDLE,
      steps: []
    };
    
    const step: IWorkflowStep = {
      id: 'step-1',
      name: 'Test Step',
      description: 'Test step description',
      completed: false,
      active: false,
      execute: async () => { /* 返回 void */ }
    };
    
    // 模拟存储返回现有工作流
    storageStub.get.mockResolvedValue(existingWorkflow);
    
    // 执行测试
    const updatedWorkflow = await workflowManager.addWorkflowStep(workflowId, step);
    
    // 验证结果
    expect(updatedWorkflow.steps.length).toBe(1);
    expect(updatedWorkflow.steps[0].id).toBe(step.id);
    expect(updatedWorkflow.steps[0].name).toBe(step.name);
    
    // 验证存储调用
    expect(storageStub.set).toHaveBeenCalledTimes(1);
  });
  
  test('startWorkflow should start a workflow', async () => {
    // 准备测试数据
    const workflowId = 'test-workflow-id';
    const existingWorkflow = {
      id: workflowId,
      name: 'Test Workflow',
      config: {
        name: 'Test Workflow',
        description: 'Test description',
        type: 'test',
        settings: {},
        input: {}
      },
      status: WorkflowStatus.IDLE,
      steps: [],
      start: async () => {}
    };
    
    // 模拟存储返回现有工作流
    storageStub.get.mockResolvedValue(existingWorkflow);
    
    // 执行测试
    const startedWorkflow = await workflowManager.startWorkflow(workflowId);
    
    // 验证结果
    expect(startedWorkflow.status).toBe(WorkflowStatus.RUNNING);
    
    // 验证存储调用
    expect(storageStub.set).toHaveBeenCalledTimes(1);
  });
}); 