/**
 * 工作流状态枚举
 */
export enum WorkflowStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  PAUSED = 'paused',
  STOPPED = 'stopped',
  COMPLETED = 'completed',
  ERROR = 'error'
}

/**
 * 工作流步骤接口
 */
export interface IWorkflowStep {
  /**
   * 步骤 ID
   */
  id: string;

  /**
   * 步骤名称
   */
  name: string;

  /**
   * 步骤描述
   */
  description?: string;

  /**
   * 步骤是否已完成
   */
  completed: boolean;

  /**
   * 步骤是否活动
   */
  active: boolean;

  /**
   * 步骤执行函数
   */
  execute: () => Promise<void>;

  /**
   * 步骤回滚函数
   */
  rollback?: () => Promise<void>;
}

/**
 * 工作流配置接口
 */
export interface IWorkflowConfig {
  /**
   * 工作流名称
   */
  name: string;

  /**
   * 工作流描述
   */
  description?: string;

  /**
   * 工作流类型
   */
  type: string;

  /**
   * 工作流设置
   */
  settings?: Record<string, any>;

  /**
   * 自定义配置
   */
  [key: string]: any;
}

/**
 * 工作流接口
 */
export interface IWorkflow {
  /**
   * 工作流 ID
   */
  id: string;

  /**
   * 工作流名称
   */
  name: string;

  /**
   * 工作流状态
   */
  status: WorkflowStatus;

  /**
   * 工作流配置
   */
  config: IWorkflowConfig;

  /**
   * 工作流步骤
   */
  steps: IWorkflowStep[];

  /**
   * 创建时间
   */
  createdAt: Date;

  /**
   * 最后修改时间
   */
  updatedAt: Date;

  /**
   * 初始化工作流
   * 
   * @param config 工作流配置
   */
  initialize(config: IWorkflowConfig): Promise<void>;

  /**
   * 启动工作流
   */
  start(): Promise<void>;

  /**
   * 暂停工作流
   */
  pause(): Promise<void>;

  /**
   * 停止工作流
   */
  stop(): Promise<void>;

  /**
   * 添加步骤
   * 
   * @param step 工作流步骤
   */
  addStep(step: IWorkflowStep): void;

  /**
   * 移除步骤
   * 
   * @param stepId 步骤 ID
   */
  removeStep(stepId: string): boolean;

  /**
   * 获取当前步骤
   */
  getCurrentStep(): IWorkflowStep | null;

  /**
   * 获取下一步骤
   */
  getNextStep(): IWorkflowStep | null;
} 