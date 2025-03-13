import * as vscode from 'vscode';
import { AgentManager, Task, TaskStatus } from '../agents/AgentManager';
import { StorageManager, StorageNamespace } from '../storage/StorageManager';

/**
 * 工作流阶段接口
 */
export interface WorkflowStage {
  id: string;
  name: string;
  description: string;
  tasks: Task[];
  nextStages: string[];
  previousStages: string[];
  isCompleted: boolean;
  isStarted: boolean;
}

/**
 * 阶段状态枚举
 */
export enum StageStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  BLOCKED = 'blocked'
}

/**
 * 阶段结果接口
 */
export interface StageResult {
  stage: WorkflowStage;
  status: StageStatus;
  completedTasks: number;
  totalTasks: number;
  errors: string[];
}

/**
 * 工作流状态接口
 */
export interface WorkflowStatus {
  id: string;
  name: string;
  currentStage: string;
  progress: number;
  stages: Map<string, StageStatus>;
}

/**
 * 工作流配置接口
 */
export interface WorkflowConfig {
  name: string;
  description?: string;
  stages: WorkflowStage[];
  initialStage: string;
}

/**
 * 工作流接口
 */
export interface IWorkflow {
  id: string;
  name: string;
  stages: WorkflowStage[];
  currentStage: WorkflowStage;
  
  initialize(config: WorkflowConfig): Promise<void>;
  moveToNextStage(): Promise<boolean>;
  moveToPreviousStage(): Promise<boolean>;
  moveToStage(stageId: string): Promise<boolean>;
  getCurrentStage(): WorkflowStage;
  getStageStatus(stageId: string): StageStatus;
}

/**
 * 工作流引擎类
 * 
 * 负责创建和管理工作流，执行工作流阶段，监控工作流状态
 */
export class WorkflowEngine {
  private context: vscode.ExtensionContext;
  private agentManager: AgentManager;
  private storageManager: StorageManager;
  private workflows: Map<string, IWorkflow> = new Map();

  /**
   * 构造函数
   * 
   * @param context VSCode 扩展上下文
   * @param agentManager 代理管理器
   * @param storageManager 存储管理器
   */
  constructor(
    context: vscode.ExtensionContext,
    agentManager: AgentManager,
    storageManager: StorageManager
  ) {
    this.context = context;
    this.agentManager = agentManager;
    this.storageManager = storageManager;
    this.initialize();
  }

  /**
   * 初始化工作流引擎
   */
  private async initialize(): Promise<void> {
    // 加载保存的工作流
    const workflowStorage = this.storageManager.getStorage(StorageNamespace.WORKFLOWS);
    if (workflowStorage) {
      const savedWorkflows = await workflowStorage.getAll();
      for (const [id, config] of savedWorkflows.entries()) {
        await this.createWorkflow(config);
      }
    }
  }

  /**
   * 创建工作流
   * 
   * @param config 工作流配置
   * @returns 工作流实例
   */
  public async createWorkflow(config: WorkflowConfig): Promise<IWorkflow> {
    // 创建工作流 ID
    const id = `workflow_${Date.now()}`;
    
    // 查找初始阶段
    const initialStage = config.stages.find(stage => stage.id === config.initialStage);
    if (!initialStage) {
      throw new Error(`初始阶段 ${config.initialStage} 不存在`);
    }
    
    // 创建工作流实例
    const workflow: IWorkflow = {
      id,
      name: config.name,
      stages: config.stages,
      currentStage: initialStage,
      
      async initialize(config: WorkflowConfig): Promise<void> {
        console.log(`初始化工作流: ${this.name}`);
      },
      
      async moveToNextStage(): Promise<boolean> {
        const nextStageIds = this.currentStage.nextStages;
        if (nextStageIds.length === 0) {
          return false;
        }
        
        const nextStage = this.stages.find(stage => stage.id === nextStageIds[0]);
        if (!nextStage) {
          return false;
        }
        
        this.currentStage = nextStage;
        return true;
      },
      
      async moveToPreviousStage(): Promise<boolean> {
        const prevStageIds = this.currentStage.previousStages;
        if (prevStageIds.length === 0) {
          return false;
        }
        
        const prevStage = this.stages.find(stage => stage.id === prevStageIds[0]);
        if (!prevStage) {
          return false;
        }
        
        this.currentStage = prevStage;
        return true;
      },
      
      async moveToStage(stageId: string): Promise<boolean> {
        const stage = this.stages.find(s => s.id === stageId);
        if (!stage) {
          return false;
        }
        
        this.currentStage = stage;
        return true;
      },
      
      getCurrentStage(): WorkflowStage {
        return this.currentStage;
      },
      
      getStageStatus(stageId: string): StageStatus {
        const stage = this.stages.find(s => s.id === stageId);
        if (!stage) {
          return StageStatus.NOT_STARTED;
        }
        
        if (stage.isCompleted) {
          return StageStatus.COMPLETED;
        }
        
        if (stage.isStarted) {
          // 检查是否有阻塞的任务
          const hasBlockedTasks = stage.tasks.some(task => task.status === TaskStatus.BLOCKED);
          return hasBlockedTasks ? StageStatus.BLOCKED : StageStatus.IN_PROGRESS;
        }
        
        return StageStatus.NOT_STARTED;
      }
    };
    
    // 初始化工作流
    await workflow.initialize(config);
    
    // 保存工作流
    this.workflows.set(id, workflow);
    
    // 保存到存储
    const workflowStorage = this.storageManager.getStorage(StorageNamespace.WORKFLOWS);
    if (workflowStorage) {
      await workflowStorage.set(id, config);
    }
    
    return workflow;
  }

  /**
   * 获取工作流
   * 
   * @param id 工作流 ID
   * @returns 工作流实例，如果不存在则返回 null
   */
  public getWorkflow(id: string): IWorkflow | null {
    return this.workflows.get(id) || null;
  }

  /**
   * 执行工作流阶段
   * 
   * @param workflow 工作流
   * @param stage 工作流阶段
   * @returns 阶段结果
   */
  public async executeStage(workflow: IWorkflow, stage: WorkflowStage): Promise<StageResult> {
    console.log(`执行工作流阶段: ${stage.name}`);
    
    // 标记阶段已开始
    stage.isStarted = true;
    
    // 执行阶段任务
    const errors: string[] = [];
    let completedTasks = 0;
    
    for (const task of stage.tasks) {
      // 更新任务状态
      task.status = TaskStatus.IN_PROGRESS;
      task.updatedAt = new Date();
      
      // 协调代理完成任务
      const result = await this.agentManager.coordinateAgents(task);
      
      if (result.success) {
        completedTasks++;
      } else if (result.error) {
        errors.push(result.error);
      }
    }
    
    // 检查是否所有任务都已完成
    const isCompleted = completedTasks === stage.tasks.length;
    stage.isCompleted = isCompleted;
    
    // 确定阶段状态
    let status: StageStatus;
    if (isCompleted) {
      status = StageStatus.COMPLETED;
    } else if (errors.length > 0) {
      status = StageStatus.BLOCKED;
    } else {
      status = StageStatus.IN_PROGRESS;
    }
    
    return {
      stage,
      status,
      completedTasks,
      totalTasks: stage.tasks.length,
      errors
    };
  }

  /**
   * 监控工作流
   * 
   * @param workflow 工作流
   * @returns 工作流状态
   */
  public monitorWorkflow(workflow: IWorkflow): WorkflowStatus {
    // 计算进度
    let completedStages = 0;
    const stageStatuses = new Map<string, StageStatus>();
    
    for (const stage of workflow.stages) {
      const status = workflow.getStageStatus(stage.id);
      stageStatuses.set(stage.id, status);
      
      if (status === StageStatus.COMPLETED) {
        completedStages++;
      }
    }
    
    const progress = workflow.stages.length > 0 
      ? (completedStages / workflow.stages.length) * 100 
      : 0;
    
    return {
      id: workflow.id,
      name: workflow.name,
      currentStage: workflow.currentStage.id,
      progress,
      stages: stageStatuses
    };
  }

  /**
   * 创建默认工作流
   * 
   * @returns 默认工作流
   */
  public async createDefaultWorkflow(): Promise<IWorkflow> {
    // 创建默认工作流配置
    const config: WorkflowConfig = {
      name: '默认软件开发工作流',
      description: '标准软件开发生命周期工作流',
      initialStage: 'requirements',
      stages: [
        {
          id: 'requirements',
          name: '需求分析',
          description: '收集和分析用户需求',
          tasks: [
            {
              id: 'task_1',
              title: '收集用户需求',
              description: '与用户交流，收集详细需求',
              status: TaskStatus.TODO,
              createdAt: new Date(),
              updatedAt: new Date()
            },
            {
              id: 'task_2',
              title: '分析需求可行性',
              description: '分析需求的技术可行性和业务价值',
              status: TaskStatus.TODO,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          ],
          nextStages: ['design'],
          previousStages: [],
          isCompleted: false,
          isStarted: false
        },
        {
          id: 'design',
          name: '系统设计',
          description: '设计系统架构和组件',
          tasks: [
            {
              id: 'task_3',
              title: '设计系统架构',
              description: '设计系统的整体架构和组件',
              status: TaskStatus.TODO,
              createdAt: new Date(),
              updatedAt: new Date()
            },
            {
              id: 'task_4',
              title: '设计数据模型',
              description: '设计系统的数据模型和关系',
              status: TaskStatus.TODO,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          ],
          nextStages: ['implementation'],
          previousStages: ['requirements'],
          isCompleted: false,
          isStarted: false
        },
        {
          id: 'implementation',
          name: '代码实现',
          description: '编写和修改代码',
          tasks: [
            {
              id: 'task_5',
              title: '实现核心功能',
              description: '编写核心功能的代码',
              status: TaskStatus.TODO,
              createdAt: new Date(),
              updatedAt: new Date()
            },
            {
              id: 'task_6',
              title: '实现用户界面',
              description: '编写用户界面的代码',
              status: TaskStatus.TODO,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          ],
          nextStages: ['testing'],
          previousStages: ['design'],
          isCompleted: false,
          isStarted: false
        },
        {
          id: 'testing',
          name: '测试验证',
          description: '测试和验证代码',
          tasks: [
            {
              id: 'task_7',
              title: '编写单元测试',
              description: '编写单元测试用例',
              status: TaskStatus.TODO,
              createdAt: new Date(),
              updatedAt: new Date()
            },
            {
              id: 'task_8',
              title: '执行集成测试',
              description: '执行集成测试用例',
              status: TaskStatus.TODO,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          ],
          nextStages: ['deployment'],
          previousStages: ['implementation'],
          isCompleted: false,
          isStarted: false
        },
        {
          id: 'deployment',
          name: '部署发布',
          description: '部署和发布应用',
          tasks: [
            {
              id: 'task_9',
              title: '准备部署环境',
              description: '准备部署环境和配置',
              status: TaskStatus.TODO,
              createdAt: new Date(),
              updatedAt: new Date()
            },
            {
              id: 'task_10',
              title: '部署应用',
              description: '将应用部署到目标环境',
              status: TaskStatus.TODO,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          ],
          nextStages: ['maintenance'],
          previousStages: ['testing'],
          isCompleted: false,
          isStarted: false
        },
        {
          id: 'maintenance',
          name: '维护更新',
          description: '维护和更新应用',
          tasks: [
            {
              id: 'task_11',
              title: '监控应用性能',
              description: '监控应用的性能和稳定性',
              status: TaskStatus.TODO,
              createdAt: new Date(),
              updatedAt: new Date()
            },
            {
              id: 'task_12',
              title: '修复问题',
              description: '修复发现的问题和缺陷',
              status: TaskStatus.TODO,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          ],
          nextStages: [],
          previousStages: ['deployment'],
          isCompleted: false,
          isStarted: false
        }
      ]
    };
    
    return this.createWorkflow(config);
  }
}