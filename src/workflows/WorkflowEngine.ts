import * as vscode from 'vscode';
import { IWorkflow, IWorkflowConfig, WorkflowStatus, IWorkflowStep } from './IWorkflow';
import { WorkflowManager } from './WorkflowManager';

/**
 * 工作流引擎类
 * 
 * 作为 WorkflowManager 的包装器，以便与现有代码兼容
 */
export class WorkflowEngine {
  private static instance: WorkflowEngine;
  private workflowManager: WorkflowManager;
  private eventEmitter: vscode.EventEmitter<any> = new vscode.EventEmitter<any>();

  /**
   * 工作流创建事件
   */
  public readonly onWorkflowCreated: vscode.Event<IWorkflow> = this.eventEmitter.event;

  /**
   * 工作流更新事件
   */
  public readonly onWorkflowUpdated: vscode.Event<IWorkflow> = this.eventEmitter.event;

  /**
   * 工作流删除事件
   */
  public readonly onWorkflowRemoved: vscode.Event<string> = this.eventEmitter.event;

  /**
   * 私有构造函数
   * 
   * @param workflowManager 工作流管理器
   */
  private constructor(workflowManager: WorkflowManager) {
    this.workflowManager = workflowManager;
  }

  /**
   * 获取工作流引擎实例
   * 
   * @param workflowManager 工作流管理器
   * @returns 工作流引擎实例
   */
  public static getInstance(workflowManager?: WorkflowManager): WorkflowEngine {
    if (!WorkflowEngine.instance && workflowManager) {
      WorkflowEngine.instance = new WorkflowEngine(workflowManager);
    }
    return WorkflowEngine.instance;
  }

  /**
   * 获取工作流
   * 
   * @param id 工作流 ID
   * @returns 工作流
   */
  public getWorkflow(id: string): IWorkflow | null {
    return this.workflowManager.getWorkflow(id);
  }

  /**
   * 获取所有工作流
   * 
   * @returns 所有工作流
   */
  public getWorkflows(): Promise<IWorkflow[]> {
    return this.workflowManager.getAllWorkflows();
  }

  /**
   * 创建工作流
   * 
   * @param name 工作流名称
   * @param config 工作流配置
   * @returns 创建的工作流
   */
  public async createWorkflow(name: string, config: IWorkflowConfig): Promise<IWorkflow> {
    const workflow = await this.workflowManager.createWorkflow(name, config);
    this.eventEmitter.fire(workflow);
    return workflow;
  }

  /**
   * 更新工作流
   * 
   * @param id 工作流 ID
   * @param config 工作流配置
   * @returns 更新后的工作流
   */
  public async updateWorkflow(id: string, config: IWorkflowConfig): Promise<IWorkflow> {
    const workflow = await this.workflowManager.updateWorkflow(id, config);
    this.eventEmitter.fire(workflow);
    return workflow;
  }

  /**
   * 删除工作流
   * 
   * @param id 工作流 ID
   * @returns 是否删除成功
   */
  public async removeWorkflow(id: string): Promise<boolean> {
    const result = await this.workflowManager.removeWorkflow(id);
    if (result) {
      this.eventEmitter.fire(id);
    }
    return result;
  }

  /**
   * 启动工作流
   * 
   * @param id 工作流 ID
   * @returns 启动后的工作流
   */
  public async startWorkflow(id: string): Promise<IWorkflow> {
    return this.workflowManager.startWorkflow(id);
  }

  /**
   * 暂停工作流
   * 
   * @param id 工作流 ID
   * @returns 暂停后的工作流
   */
  public async pauseWorkflow(id: string): Promise<IWorkflow> {
    return this.workflowManager.pauseWorkflow(id);
  }

  /**
   * 停止工作流
   * 
   * @param id 工作流 ID
   * @returns 停止后的工作流
   */
  public async stopWorkflow(id: string): Promise<IWorkflow> {
    return this.workflowManager.stopWorkflow(id);
  }

  /**
   * 添加工作流步骤
   * 
   * @param id 工作流 ID
   * @param step 工作流步骤
   * @returns 添加步骤后的工作流
   */
  public async addWorkflowStep(id: string, step: IWorkflowStep): Promise<IWorkflow> {
    return this.workflowManager.addWorkflowStep(id, step);
  }

  /**
   * 执行工作流阶段
   * 
   * @param workflow 工作流
   * @param stage 阶段
   * @returns 执行结果
   */
  public async executeStage(workflow: IWorkflow, stage: any): Promise<any> {
    // 这里简单地执行当前步骤
    const currentStep = workflow.getCurrentStep();
    if (currentStep) {
      return await currentStep.execute();
    }
    return null;
  }
} 