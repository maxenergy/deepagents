import * as vscode from 'vscode';
import { IWorkflow, WorkflowStatus } from './IWorkflow';
import { WorkflowManager } from './WorkflowManager';

/**
 * 工作流执行器类
 * 
 * 用于执行工作流
 */
export class WorkflowExecutor {
  private workflowManager: WorkflowManager;
  private runningWorkflows: Map<string, NodeJS.Timeout> = new Map();

  /**
   * 构造函数
   * 
   * @param workflowManager 工作流管理器
   */
  constructor(workflowManager: WorkflowManager) {
    this.workflowManager = workflowManager;
  }

  /**
   * 执行工作流
   * 
   * @param workflowId 工作流 ID
   */
  public async executeWorkflow(workflowId: string): Promise<void> {
    // 获取工作流
    const workflow = await this.workflowManager.getWorkflow(workflowId);
    if (!workflow) {
      throw new Error(`未找到工作流: ${workflowId}`);
    }

    // 检查工作流状态
    if (workflow.status === WorkflowStatus.RUNNING) {
      throw new Error(`工作流已在运行中: ${workflow.name}`);
    }

    // 启动工作流
    await workflow.start();
    await this.workflowManager.updateWorkflow(workflowId, workflow.config);

    // 显示通知
    vscode.window.showInformationMessage(`开始执行工作流: ${workflow.name}`);

    // 执行工作流步骤
    this.executeWorkflowSteps(workflow);
  }

  /**
   * 暂停工作流
   * 
   * @param workflowId 工作流 ID
   */
  public async pauseWorkflow(workflowId: string): Promise<void> {
    // 获取工作流
    const workflow = await this.workflowManager.getWorkflow(workflowId);
    if (!workflow) {
      throw new Error(`未找到工作流: ${workflowId}`);
    }

    // 检查工作流状态
    if (workflow.status !== WorkflowStatus.RUNNING) {
      throw new Error(`工作流未在运行中: ${workflow.name}`);
    }

    // 暂停工作流
    await workflow.pause();
    await this.workflowManager.updateWorkflow(workflowId, workflow.config);

    // 清除定时器
    const timer = this.runningWorkflows.get(workflowId);
    if (timer) {
      clearTimeout(timer);
      this.runningWorkflows.delete(workflowId);
    }

    // 显示通知
    vscode.window.showInformationMessage(`已暂停工作流: ${workflow.name}`);
  }

  /**
   * 停止工作流
   * 
   * @param workflowId 工作流 ID
   */
  public async stopWorkflow(workflowId: string): Promise<void> {
    // 获取工作流
    const workflow = await this.workflowManager.getWorkflow(workflowId);
    if (!workflow) {
      throw new Error(`未找到工作流: ${workflowId}`);
    }

    // 检查工作流状态
    if (workflow.status !== WorkflowStatus.RUNNING && workflow.status !== WorkflowStatus.PAUSED) {
      throw new Error(`工作流未在运行或暂停中: ${workflow.name}`);
    }

    // 停止工作流
    await workflow.stop();
    await this.workflowManager.updateWorkflow(workflowId, workflow.config);

    // 清除定时器
    const timer = this.runningWorkflows.get(workflowId);
    if (timer) {
      clearTimeout(timer);
      this.runningWorkflows.delete(workflowId);
    }

    // 显示通知
    vscode.window.showInformationMessage(`已停止工作流: ${workflow.name}`);
  }

  /**
   * 执行工作流步骤
   * 
   * @param workflow 工作流
   */
  private async executeWorkflowSteps(workflow: IWorkflow): Promise<void> {
    // 获取当前步骤
    const currentStep = workflow.getCurrentStep();
    if (!currentStep) {
      // 所有步骤已完成
      workflow.status = WorkflowStatus.COMPLETED;
      await this.workflowManager.updateWorkflow(workflow.id, workflow.config);
      
      // 显示通知
      vscode.window.showInformationMessage(`工作流已完成: ${workflow.name}`);
      return;
    }

    try {
      // 标记步骤为活动状态
      currentStep.active = true;
      await this.workflowManager.updateWorkflow(workflow.id, workflow.config);

      // 执行步骤
      const result = await currentStep.execute();

      // 标记步骤为已完成
      currentStep.active = false;
      currentStep.completed = true;
      await this.workflowManager.updateWorkflow(workflow.id, workflow.config);

      // 检查工作流状态
      if (workflow.status === WorkflowStatus.RUNNING) {
        // 设置定时器执行下一步骤
        const timer = setTimeout(() => {
          this.executeWorkflowSteps(workflow);
        }, 1000);
        
        // 保存定时器
        this.runningWorkflows.set(workflow.id, timer);
      }
    } catch (error: unknown) {
      // 标记步骤为非活动状态
      currentStep.active = false;
      await this.workflowManager.updateWorkflow(workflow.id, workflow.config);

      // 检查是否继续执行
      if (workflow.config.settings?.continueOnError) {
        // 设置定时器执行下一步骤
        const timer = setTimeout(() => {
          this.executeWorkflowSteps(workflow);
        }, 1000);
        
        // 保存定时器
        this.runningWorkflows.set(workflow.id, timer);
      } else {
        // 停止工作流
        workflow.status = WorkflowStatus.ERROR;
        await this.workflowManager.updateWorkflow(workflow.id, workflow.config);
        
        // 显示错误通知
        const errorMessage = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`工作流执行错误: ${workflow.name} - ${errorMessage}`);
      }
    }
  }

  /**
   * 重试工作流
   * 
   * @param workflowId 工作流 ID
   */
  public async retryWorkflow(workflowId: string): Promise<void> {
    // 获取工作流
    const workflow = await this.workflowManager.getWorkflow(workflowId);
    if (!workflow) {
      throw new Error(`未找到工作流: ${workflowId}`);
    }

    // 检查工作流状态
    if (workflow.status !== WorkflowStatus.ERROR && workflow.status !== WorkflowStatus.COMPLETED) {
      throw new Error(`工作流未处于错误或完成状态: ${workflow.name}`);
    }

    // 重置工作流状态
    workflow.status = WorkflowStatus.IDLE;
    
    // 重置所有步骤
    for (const step of workflow.steps) {
      step.completed = false;
      step.active = false;
    }
    
    // 更新工作流
    await this.workflowManager.updateWorkflow(workflowId, workflow.config);

    // 执行工作流
    await this.executeWorkflow(workflow.id);
  }

  /**
   * 重试当前步骤
   * 
   * @param workflowId 工作流 ID
   */
  public async retryCurrentStep(workflowId: string): Promise<void> {
    // 获取工作流
    const workflow = await this.workflowManager.getWorkflow(workflowId);
    if (!workflow) {
      throw new Error(`未找到工作流: ${workflowId}`);
    }

    // 检查工作流状态
    if (workflow.status !== WorkflowStatus.ERROR) {
      throw new Error(`工作流未处于错误状态: ${workflow.name}`);
    }

    // 获取当前步骤
    const currentStep = workflow.getCurrentStep();
    if (!currentStep) {
      throw new Error(`未找到当前步骤: ${workflow.name}`);
    }

    // 重置当前步骤状态
    currentStep.completed = false;
    currentStep.active = false;
    
    // 重置工作流状态
    workflow.status = WorkflowStatus.IDLE;
    
    // 更新工作流
    await this.workflowManager.updateWorkflow(workflowId, workflow.config);

    // 执行工作流
    await this.executeWorkflow(workflow.id);
  }

  /**
   * 跳过当前步骤
   * 
   * @param workflowId 工作流 ID
   */
  public async skipCurrentStep(workflowId: string): Promise<void> {
    // 获取工作流
    const workflow = await this.workflowManager.getWorkflow(workflowId);
    if (!workflow) {
      throw new Error(`未找到工作流: ${workflowId}`);
    }

    // 检查工作流状态
    if (workflow.status !== WorkflowStatus.ERROR && workflow.status !== WorkflowStatus.PAUSED) {
      throw new Error(`工作流未处于错误或暂停状态: ${workflow.name}`);
    }

    // 获取当前步骤
    const currentStep = workflow.getCurrentStep();
    if (!currentStep) {
      throw new Error(`未找到当前步骤: ${workflow.name}`);
    }

    // 标记当前步骤为已完成
    currentStep.completed = true;
    currentStep.active = false;
    
    // 重置工作流状态
    workflow.status = WorkflowStatus.IDLE;
    
    // 更新工作流
    await this.workflowManager.updateWorkflow(workflowId, workflow.config);

    // 执行工作流
    await this.executeWorkflow(workflow.id);
  }
} 