import { WorkflowTemplateFactory } from '../../../workflows/WorkflowTemplateFactory';
import { WorkflowManager } from '../../../workflows/WorkflowManager';
import { AgentManager } from '../../../agents/AgentManager';
import { WorkflowStatus } from '../../../workflows/IWorkflow';

describe('WorkflowTemplateFactory Test Suite', () => {
  let workflowTemplateFactory: WorkflowTemplateFactory;
  let workflowManager: WorkflowManager;
  let agentManager: AgentManager;
  let mockWorkflow: any;
  
  beforeEach(() => {
    // 创建 WorkflowManager 的模拟对象
    workflowManager = {
      createWorkflow: jest.fn(),
      addWorkflowStep: jest.fn(),
      getWorkflow: jest.fn(),
      updateWorkflow: jest.fn(),
      getAllWorkflows: jest.fn(),
      removeWorkflow: jest.fn(),
      startWorkflow: jest.fn(),
      pauseWorkflow: jest.fn(),
      stopWorkflow: jest.fn()
    } as unknown as WorkflowManager;
    
    // 创建 AgentManager 的模拟对象
    agentManager = {
      getAgentsByRole: jest.fn()
    } as unknown as AgentManager;
    
    // 创建 WorkflowTemplateFactory 实例
    workflowTemplateFactory = new WorkflowTemplateFactory(workflowManager, agentManager);
    
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
    
    // 模拟 createWorkflow 返回模拟工作流
    (workflowManager.createWorkflow as jest.Mock).mockResolvedValue(mockWorkflow);
    
    // 模拟 addWorkflowStep 返回模拟工作流
    (workflowManager.addWorkflowStep as jest.Mock).mockImplementation((id, step) => {
      mockWorkflow.steps.push(step);
      return Promise.resolve(mockWorkflow);
    });
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
  });
  
  test('createFullDevelopmentWorkflow should create a workflow with all steps', async () => {
    // 执行测试
    const workflow = await workflowTemplateFactory.createFullDevelopmentWorkflow();
    
    // 验证结果
    expect(workflowManager.createWorkflow).toHaveBeenCalled();
    expect(workflowManager.addWorkflowStep).toHaveBeenCalled();
    expect(workflow).toBe(mockWorkflow);
    expect(workflow.steps.length).toBeGreaterThan(0);
  });
  
  test('createRequirementsAnalysisWorkflow should create a workflow with requirements analysis step', async () => {
    // 执行测试
    const workflow = await workflowTemplateFactory.createRequirementsAnalysisWorkflow();
    
    // 验证结果
    expect(workflowManager.createWorkflow).toHaveBeenCalled();
    expect(workflowManager.addWorkflowStep).toHaveBeenCalled();
    expect(workflow).toBe(mockWorkflow);
    expect(workflow.steps.length).toBe(1);
    expect(workflow.steps[0].name).toContain('需求分析');
  });
  
  test('createArchitectureDesignWorkflow should create a workflow with architecture design step', async () => {
    // 执行测试
    const workflow = await workflowTemplateFactory.createArchitectureDesignWorkflow();
    
    // 验证结果
    expect(workflowManager.createWorkflow).toHaveBeenCalled();
    expect(workflowManager.addWorkflowStep).toHaveBeenCalled();
    expect(workflow).toBe(mockWorkflow);
    expect(workflow.steps.length).toBe(1);
    expect(workflow.steps[0].name).toContain('架构设计');
  });
  
  test('createCodeGenerationWorkflow should create a workflow with code generation step', async () => {
    // 执行测试
    const workflow = await workflowTemplateFactory.createCodeGenerationWorkflow();
    
    // 验证结果
    expect(workflowManager.createWorkflow).toHaveBeenCalled();
    expect(workflowManager.addWorkflowStep).toHaveBeenCalled();
    expect(workflow).toBe(mockWorkflow);
    expect(workflow.steps.length).toBe(1);
    expect(workflow.steps[0].name).toContain('代码生成');
  });
  
  test('createTestingWorkflow should create a workflow with testing step', async () => {
    // 执行测试
    const workflow = await workflowTemplateFactory.createTestingWorkflow();
    
    // 验证结果
    expect(workflowManager.createWorkflow).toHaveBeenCalled();
    expect(workflowManager.addWorkflowStep).toHaveBeenCalled();
    expect(workflow).toBe(mockWorkflow);
    expect(workflow.steps.length).toBe(1);
    expect(workflow.steps[0].name).toContain('代码测试');
  });
  
  test('createDeploymentWorkflow should create a workflow with deployment step', async () => {
    // 执行测试
    const workflow = await workflowTemplateFactory.createDeploymentWorkflow();
    
    // 验证结果
    expect(workflowManager.createWorkflow).toHaveBeenCalled();
    expect(workflowManager.addWorkflowStep).toHaveBeenCalled();
    expect(workflow).toBe(mockWorkflow);
    expect(workflow.steps.length).toBe(1);
    expect(workflow.steps[0].name).toContain('代码部署');
  });
  
  test('createDocumentationWorkflow should create a workflow with documentation step', async () => {
    // 执行测试
    const workflow = await workflowTemplateFactory.createDocumentationWorkflow();
    
    // 验证结果
    expect(workflowManager.createWorkflow).toHaveBeenCalled();
    expect(workflowManager.addWorkflowStep).toHaveBeenCalled();
    expect(workflow).toBe(mockWorkflow);
    expect(workflow.steps.length).toBe(1);
    expect(workflow.steps[0].name).toContain('文档生成');
  });
  
  test('createCustomWorkflow should create a workflow with custom steps', async () => {
    // 准备测试数据
    const customSteps = [
      {
        name: 'Custom Step 1',
        description: 'Custom step 1 description',
        execute: async () => {}
      },
      {
        name: 'Custom Step 2',
        description: 'Custom step 2 description',
        execute: async () => {}
      }
    ];
    
    // 执行测试
    const workflow = await workflowTemplateFactory.createCustomWorkflow(
      'Custom Workflow',
      'Custom workflow description',
      'custom',
      customSteps
    );
    
    // 验证结果
    expect(workflowManager.createWorkflow).toHaveBeenCalled();
    expect(workflowManager.addWorkflowStep).toHaveBeenCalledTimes(2);
    expect(workflow).toBe(mockWorkflow);
    expect(workflow.steps.length).toBe(2);
  });
}); 