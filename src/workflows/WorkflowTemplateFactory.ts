import { v4 as uuidv4 } from 'uuid';
import { IWorkflow, IWorkflowConfig, WorkflowStatus } from './IWorkflow';
import { WorkflowManager } from './WorkflowManager';
import { WorkflowStepFactory } from './WorkflowStepFactory';
import { AgentManager } from '../agents/AgentManager';

/**
 * 工作流模板工厂类
 * 
 * 用于创建预定义的工作流模板
 */
export class WorkflowTemplateFactory {
  private workflowManager: WorkflowManager;
  private workflowStepFactory: WorkflowStepFactory;

  /**
   * 构造函数
   * 
   * @param workflowManager 工作流管理器
   * @param agentManager 代理管理器
   */
  constructor(workflowManager: WorkflowManager, agentManager: AgentManager) {
    this.workflowManager = workflowManager;
    this.workflowStepFactory = new WorkflowStepFactory(agentManager);
  }

  /**
   * 创建完整开发工作流
   * 
   * @param name 工作流名称
   * @param description 工作流描述
   * @param input 输入数据
   */
  public async createFullDevelopmentWorkflow(
    name: string = '完整开发工作流',
    description: string = '从需求分析到代码部署的完整开发工作流',
    input: any = {}
  ): Promise<IWorkflow> {
    const config: IWorkflowConfig = {
      name,
      description,
      type: 'development',
      settings: {
        autoStart: false,
        continueOnError: false,
        notifyOnCompletion: true
      },
      input
    };

    // 创建工作流
    const workflow = await this.workflowManager.createWorkflow(name, config);

    // 添加工作流步骤
    const steps = this.workflowStepFactory.createFullDevelopmentWorkflowSteps(input);
    for (const step of steps) {
      await this.workflowManager.addWorkflowStep(workflow.id, step);
    }

    return workflow;
  }

  /**
   * 创建需求分析工作流
   * 
   * @param name 工作流名称
   * @param description 工作流描述
   * @param input 输入数据
   */
  public async createRequirementsAnalysisWorkflow(
    name: string = '需求分析工作流',
    description: string = '分析项目需求并生成需求文档',
    input: any = {}
  ): Promise<IWorkflow> {
    const config: IWorkflowConfig = {
      name,
      description,
      type: 'requirements',
      settings: {
        autoStart: false,
        continueOnError: false,
        notifyOnCompletion: true
      },
      input
    };

    // 创建工作流
    const workflow = await this.workflowManager.createWorkflow(name, config);

    // 添加工作流步骤
    const step = this.workflowStepFactory.createRequirementsAnalysisStep(
      '需求分析',
      '分析项目需求并生成需求文档',
      input
    );
    await this.workflowManager.addWorkflowStep(workflow.id, step);

    return workflow;
  }

  /**
   * 创建架构设计工作流
   * 
   * @param name 工作流名称
   * @param description 工作流描述
   * @param input 输入数据
   */
  public async createArchitectureDesignWorkflow(
    name: string = '架构设计工作流',
    description: string = '设计系统架构并生成架构文档',
    input: any = {}
  ): Promise<IWorkflow> {
    const config: IWorkflowConfig = {
      name,
      description,
      type: 'architecture',
      settings: {
        autoStart: false,
        continueOnError: false,
        notifyOnCompletion: true
      },
      input
    };

    // 创建工作流
    const workflow = await this.workflowManager.createWorkflow(name, config);

    // 添加工作流步骤
    const step = this.workflowStepFactory.createArchitectureDesignStep(
      '架构设计',
      '设计系统架构并生成架构文档',
      input
    );
    await this.workflowManager.addWorkflowStep(workflow.id, step);

    return workflow;
  }

  /**
   * 创建代码生成工作流
   * 
   * @param name 工作流名称
   * @param description 工作流描述
   * @param input 输入数据
   */
  public async createCodeGenerationWorkflow(
    name: string = '代码生成工作流',
    description: string = '根据架构设计生成代码',
    input: any = {}
  ): Promise<IWorkflow> {
    const config: IWorkflowConfig = {
      name,
      description,
      type: 'code_generation',
      settings: {
        autoStart: false,
        continueOnError: false,
        notifyOnCompletion: true
      },
      input
    };

    // 创建工作流
    const workflow = await this.workflowManager.createWorkflow(name, config);

    // 添加工作流步骤
    const step = this.workflowStepFactory.createCodeGenerationStep(
      '代码生成',
      '根据架构设计生成代码',
      input
    );
    await this.workflowManager.addWorkflowStep(workflow.id, step);

    return workflow;
  }

  /**
   * 创建测试工作流
   * 
   * @param name 工作流名称
   * @param description 工作流描述
   * @param input 输入数据
   */
  public async createTestingWorkflow(
    name: string = '测试工作流',
    description: string = '测试生成的代码',
    input: any = {}
  ): Promise<IWorkflow> {
    const config: IWorkflowConfig = {
      name,
      description,
      type: 'testing',
      settings: {
        autoStart: false,
        continueOnError: false,
        notifyOnCompletion: true
      },
      input
    };

    // 创建工作流
    const workflow = await this.workflowManager.createWorkflow(name, config);

    // 添加工作流步骤
    const step = this.workflowStepFactory.createCodeTestingStep(
      '代码测试',
      '测试生成的代码',
      input
    );
    await this.workflowManager.addWorkflowStep(workflow.id, step);

    return workflow;
  }

  /**
   * 创建部署工作流
   * 
   * @param name 工作流名称
   * @param description 工作流描述
   * @param input 输入数据
   */
  public async createDeploymentWorkflow(
    name: string = '部署工作流',
    description: string = '部署生成的代码',
    input: any = {}
  ): Promise<IWorkflow> {
    const config: IWorkflowConfig = {
      name,
      description,
      type: 'deployment',
      settings: {
        autoStart: false,
        continueOnError: false,
        notifyOnCompletion: true
      },
      input
    };

    // 创建工作流
    const workflow = await this.workflowManager.createWorkflow(name, config);

    // 添加工作流步骤
    const step = this.workflowStepFactory.createCodeDeploymentStep(
      '代码部署',
      '部署生成的代码',
      input
    );
    await this.workflowManager.addWorkflowStep(workflow.id, step);

    return workflow;
  }

  /**
   * 创建文档生成工作流
   * 
   * @param name 工作流名称
   * @param description 工作流描述
   * @param input 输入数据
   */
  public async createDocumentationWorkflow(
    name: string = '文档生成工作流',
    description: string = '生成项目文档',
    input: any = {}
  ): Promise<IWorkflow> {
    const config: IWorkflowConfig = {
      name,
      description,
      type: 'documentation',
      settings: {
        autoStart: false,
        continueOnError: false,
        notifyOnCompletion: true
      },
      input
    };

    // 创建工作流
    const workflow = await this.workflowManager.createWorkflow(name, config);

    // 添加工作流步骤
    const step = this.workflowStepFactory.createDocumentationStep(
      '文档生成',
      '生成项目文档',
      input
    );
    await this.workflowManager.addWorkflowStep(workflow.id, step);

    return workflow;
  }

  /**
   * 创建自定义工作流
   * 
   * @param name 工作流名称
   * @param description 工作流描述
   * @param type 工作流类型
   * @param steps 工作流步骤
   * @param input 输入数据
   */
  public async createCustomWorkflow(
    name: string,
    description: string,
    type: string,
    steps: any[],
    input: any = {}
  ): Promise<IWorkflow> {
    const config: IWorkflowConfig = {
      name,
      description,
      type,
      settings: {
        autoStart: false,
        continueOnError: false,
        notifyOnCompletion: true
      },
      input
    };

    // 创建工作流
    const workflow = await this.workflowManager.createWorkflow(name, config);

    // 添加工作流步骤
    for (const stepConfig of steps) {
      const step = this.workflowStepFactory.createCustomStep(
        stepConfig.name,
        stepConfig.description,
        stepConfig.execute,
        stepConfig.rollback
      );
      await this.workflowManager.addWorkflowStep(workflow.id, step);
    }

    return workflow;
  }
} 