import * as vscode from 'vscode';
import { v4 as uuidv4 } from 'uuid';
import { IWorkflow, IWorkflowConfig, WorkflowStatus, IWorkflowStep } from './IWorkflow';
import { StorageManager, StorageNamespace } from '../storage/StorageManager';

/**
 * 工作流类
 * 
 * 实现 IWorkflow 接口
 */
class Workflow implements IWorkflow {
  public id: string;
  public name: string;
  public status: WorkflowStatus;
  public config: IWorkflowConfig;
  public steps: IWorkflowStep[];
  public createdAt: Date;
  public updatedAt: Date;
  
  private currentStepIndex: number = -1;

  /**
   * 构造函数
   * 
   * @param id 工作流 ID
   * @param name 工作流名称
   * @param config 工作流配置
   */
  constructor(id: string, name: string, config: IWorkflowConfig) {
    this.id = id;
    this.name = name;
    this.status = WorkflowStatus.IDLE;
    this.config = config;
    this.steps = [];
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * 初始化工作流
   * 
   * @param config 工作流配置
   */
  public async initialize(config: IWorkflowConfig): Promise<void> {
    this.config = config;
    this.name = config.name;
    this.updatedAt = new Date();
  }

  /**
   * 启动工作流
   */
  public async start(): Promise<void> {
    if (this.status === WorkflowStatus.RUNNING) {
      return;
    }

    this.status = WorkflowStatus.RUNNING;
    this.updatedAt = new Date();

    // 如果工作流已暂停，则从当前步骤继续执行
    if (this.currentStepIndex === -1) {
      this.currentStepIndex = 0;
    }

    await this.executeCurrentStep();
  }

  /**
   * 暂停工作流
   */
  public async pause(): Promise<void> {
    if (this.status !== WorkflowStatus.RUNNING) {
      return;
    }

    this.status = WorkflowStatus.PAUSED;
    this.updatedAt = new Date();
  }

  /**
   * 停止工作流
   */
  public async stop(): Promise<void> {
    if (this.status === WorkflowStatus.STOPPED) {
      return;
    }

    this.status = WorkflowStatus.STOPPED;
    this.currentStepIndex = -1;
    this.updatedAt = new Date();

    // 重置所有步骤状态
    this.steps.forEach(step => {
      (step as any).active = false;
    });
  }

  /**
   * 添加步骤
   * 
   * @param step 工作流步骤
   */
  public addStep(step: IWorkflowStep): void {
    this.steps.push(step);
    this.updatedAt = new Date();
  }

  /**
   * 移除步骤
   * 
   * @param stepId 步骤 ID
   */
  public removeStep(stepId: string): boolean {
    const index = this.steps.findIndex(step => step.id === stepId);
    
    if (index === -1) {
      return false;
    }
    
    this.steps.splice(index, 1);
    this.updatedAt = new Date();
    
    return true;
  }

  /**
   * 获取当前步骤
   */
  public getCurrentStep(): IWorkflowStep | null {
    if (this.currentStepIndex === -1 || this.currentStepIndex >= this.steps.length) {
      return null;
    }
    
    return this.steps[this.currentStepIndex];
  }

  /**
   * 获取下一步骤
   */
  public getNextStep(): IWorkflowStep | null {
    if (this.currentStepIndex === -1 || this.currentStepIndex >= this.steps.length - 1) {
      return null;
    }
    
    return this.steps[this.currentStepIndex + 1];
  }

  /**
   * 执行当前步骤
   */
  private async executeCurrentStep(): Promise<void> {
    if (this.status !== WorkflowStatus.RUNNING) {
      return;
    }

    const currentStep = this.getCurrentStep();
    
    if (!currentStep) {
      this.status = WorkflowStatus.COMPLETED;
      this.updatedAt = new Date();
      return;
    }

    try {
      // 设置当前步骤为活动状态
      (currentStep as any).active = true;
      
      // 执行当前步骤
      await currentStep.execute();
      
      // 标记当前步骤为已完成
      (currentStep as any).completed = true;
      (currentStep as any).active = false;
      
      // 移动到下一步骤
      this.currentStepIndex++;
      
      // 如果还有下一步骤，则继续执行
      if (this.currentStepIndex < this.steps.length) {
        await this.executeCurrentStep();
      } else {
        // 所有步骤已完成
        this.status = WorkflowStatus.COMPLETED;
      }
    } catch (error) {
      this.status = WorkflowStatus.ERROR;
      (currentStep as any).active = false;
      
      // 记录错误信息
      console.error(`工作流步骤执行失败: ${error instanceof Error ? error.message : String(error)}`);
      
      // 显示错误通知
      vscode.window.showErrorMessage(`工作流步骤执行失败: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    this.updatedAt = new Date();
  }
}

/**
 * 工作流管理器类
 * 
 * 负责管理工作流的创建、启动、暂停和停止
 */
export class WorkflowManager {
  private storageManager: StorageManager;
  private workflows: Map<string, IWorkflow>;
  private storageKey = 'workflows';

  /**
   * 构造函数
   * 
   * @param storageManager 存储管理器
   */
  constructor(storageManager: StorageManager) {
    this.storageManager = storageManager;
    this.workflows = new Map<string, IWorkflow>();
    this.loadWorkflows();
  }

  /**
   * 加载工作流列表
   */
  private async loadWorkflows(): Promise<void> {
    try {
      const storage = this.storageManager.getStorage(StorageNamespace.WORKFLOWS);
      if (!storage) {
        return;
      }
      
      const workflowsData = await storage.get<Record<string, any>[]>(this.storageKey) || [];
      
      for (const workflowData of workflowsData) {
        const workflow = new Workflow(
          workflowData.id,
          workflowData.name,
          workflowData.config
        );
        
        workflow.status = workflowData.status;
        workflow.steps = workflowData.steps || [];
        workflow.createdAt = new Date(workflowData.createdAt);
        workflow.updatedAt = new Date(workflowData.updatedAt);
        
        this.workflows.set(workflow.id, workflow);
      }
    } catch (error) {
      console.error('加载工作流列表失败:', error);
    }
  }

  /**
   * 保存工作流列表
   */
  private async saveWorkflows(): Promise<void> {
    try {
      const storage = this.storageManager.getStorage(StorageNamespace.WORKFLOWS);
      if (!storage) {
        return;
      }
      
      const workflowsData = Array.from(this.workflows.values()).map(workflow => ({
        id: workflow.id,
        name: workflow.name,
        status: workflow.status,
        config: workflow.config,
        steps: workflow.steps,
        createdAt: workflow.createdAt.toISOString(),
        updatedAt: workflow.updatedAt.toISOString()
      }));
      
      await storage.set(this.storageKey, workflowsData);
    } catch (error) {
      console.error('保存工作流列表失败:', error);
    }
  }

  /**
   * 创建工作流
   * 
   * @param name 工作流名称
   * @param config 工作流配置
   */
  public async createWorkflow(name: string, config: IWorkflowConfig): Promise<IWorkflow> {
    const id = uuidv4();
    const workflow = new Workflow(id, name, config);
    
    await workflow.initialize(config);
    
    this.workflows.set(id, workflow);
    await this.saveWorkflows();
    
    return workflow;
  }

  /**
   * 获取工作流
   * 
   * @param id 工作流 ID
   */
  public async getWorkflow(id: string): Promise<IWorkflow | null> {
    return this.workflows.get(id) || null;
  }

  /**
   * 获取所有工作流
   */
  public async getAllWorkflows(): Promise<IWorkflow[]> {
    return Array.from(this.workflows.values());
  }

  /**
   * 更新工作流
   * 
   * @param id 工作流 ID
   * @param config 工作流配置
   */
  public async updateWorkflow(id: string, config: IWorkflowConfig): Promise<IWorkflow> {
    const workflow = this.workflows.get(id);
    
    if (!workflow) {
      throw new Error(`工作流不存在: ${id}`);
    }
    
    await workflow.initialize(config);
    await this.saveWorkflows();
    
    return workflow;
  }

  /**
   * 删除工作流
   * 
   * @param id 工作流 ID
   */
  public async removeWorkflow(id: string): Promise<boolean> {
    const workflow = this.workflows.get(id);
    
    if (!workflow) {
      return false;
    }
    
    // 停止工作流
    if (workflow.status === WorkflowStatus.RUNNING || workflow.status === WorkflowStatus.PAUSED) {
      await workflow.stop();
    }
    
    this.workflows.delete(id);
    await this.saveWorkflows();
    
    return true;
  }

  /**
   * 启动工作流
   * 
   * @param id 工作流 ID
   */
  public async startWorkflow(id: string): Promise<IWorkflow> {
    const workflow = this.workflows.get(id);
    
    if (!workflow) {
      throw new Error(`工作流不存在: ${id}`);
    }
    
    await workflow.start();
    await this.saveWorkflows();
    
    return workflow;
  }

  /**
   * 暂停工作流
   * 
   * @param id 工作流 ID
   */
  public async pauseWorkflow(id: string): Promise<IWorkflow> {
    const workflow = this.workflows.get(id);
    
    if (!workflow) {
      throw new Error(`工作流不存在: ${id}`);
    }
    
    await workflow.pause();
    await this.saveWorkflows();
    
    return workflow;
  }

  /**
   * 停止工作流
   * 
   * @param id 工作流 ID
   */
  public async stopWorkflow(id: string): Promise<IWorkflow> {
    const workflow = this.workflows.get(id);
    
    if (!workflow) {
      throw new Error(`工作流不存在: ${id}`);
    }
    
    await workflow.stop();
    await this.saveWorkflows();
    
    return workflow;
  }

  /**
   * 添加工作流步骤
   * 
   * @param id 工作流 ID
   * @param step 工作流步骤
   */
  public async addWorkflowStep(id: string, step: IWorkflowStep): Promise<IWorkflow> {
    const workflow = this.workflows.get(id);
    
    if (!workflow) {
      throw new Error(`工作流不存在: ${id}`);
    }
    
    workflow.addStep(step);
    await this.saveWorkflows();
    
    return workflow;
  }

  /**
   * 移除工作流步骤
   * 
   * @param id 工作流 ID
   * @param stepId 步骤 ID
   */
  public async removeWorkflowStep(id: string, stepId: string): Promise<boolean> {
    const workflow = this.workflows.get(id);
    
    if (!workflow) {
      throw new Error(`工作流不存在: ${id}`);
    }
    
    const result = workflow.removeStep(stepId);
    
    if (result) {
      await this.saveWorkflows();
    }
    
    return result;
  }
} 