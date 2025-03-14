import * as vscode from 'vscode';
import { WorkflowManager } from './WorkflowManager';
import { WorkflowExecutor } from './WorkflowExecutor';
import { WorkflowTemplateFactory } from './WorkflowTemplateFactory';
import { AgentManager } from '../agents/AgentManager';
import { WorkflowStatus } from './IWorkflow';

/**
 * 工作流命令处理器类
 * 
 * 用于处理 VSCode 命令
 */
export class WorkflowCommandHandler {
  private workflowManager: WorkflowManager;
  private workflowExecutor: WorkflowExecutor;
  private workflowTemplateFactory: WorkflowTemplateFactory;
  private context: vscode.ExtensionContext;

  /**
   * 构造函数
   * 
   * @param context 扩展上下文
   * @param workflowManager 工作流管理器
   * @param agentManager 代理管理器
   */
  constructor(
    context: vscode.ExtensionContext,
    workflowManager: WorkflowManager,
    agentManager: AgentManager
  ) {
    this.context = context;
    this.workflowManager = workflowManager;
    this.workflowExecutor = new WorkflowExecutor(workflowManager);
    this.workflowTemplateFactory = new WorkflowTemplateFactory(workflowManager, agentManager);
    
    this.registerCommands();
  }

  /**
   * 注册命令
   */
  private registerCommands(): void {
    // 创建工作流命令
    this.context.subscriptions.push(
      vscode.commands.registerCommand('deepagents.createWorkflow', this.createWorkflow.bind(this))
    );

    // 执行工作流命令
    this.context.subscriptions.push(
      vscode.commands.registerCommand('deepagents.executeWorkflow', this.executeWorkflow.bind(this))
    );

    // 暂停工作流命令
    this.context.subscriptions.push(
      vscode.commands.registerCommand('deepagents.pauseWorkflow', this.pauseWorkflow.bind(this))
    );

    // 停止工作流命令
    this.context.subscriptions.push(
      vscode.commands.registerCommand('deepagents.stopWorkflow', this.stopWorkflow.bind(this))
    );

    // 重试工作流命令
    this.context.subscriptions.push(
      vscode.commands.registerCommand('deepagents.retryWorkflow', this.retryWorkflow.bind(this))
    );

    // 重试当前步骤命令
    this.context.subscriptions.push(
      vscode.commands.registerCommand('deepagents.retryCurrentStep', this.retryCurrentStep.bind(this))
    );

    // 跳过当前步骤命令
    this.context.subscriptions.push(
      vscode.commands.registerCommand('deepagents.skipCurrentStep', this.skipCurrentStep.bind(this))
    );

    // 创建预定义工作流命令
    this.context.subscriptions.push(
      vscode.commands.registerCommand('deepagents.createPredefinedWorkflow', this.createPredefinedWorkflow.bind(this))
    );
  }

  /**
   * 创建工作流
   */
  private async createWorkflow(): Promise<void> {
    // 获取工作流名称
    const name = await vscode.window.showInputBox({
      prompt: '请输入工作流名称',
      placeHolder: '工作流名称'
    });

    if (!name) {
      return;
    }

    // 获取工作流描述
    const description = await vscode.window.showInputBox({
      prompt: '请输入工作流描述',
      placeHolder: '工作流描述'
    });

    if (!description) {
      return;
    }

    // 获取工作流类型
    const type = await vscode.window.showQuickPick(
      ['development', 'requirements', 'architecture', 'code_generation', 'testing', 'deployment', 'documentation', 'custom'],
      {
        placeHolder: '请选择工作流类型'
      }
    );

    if (!type) {
      return;
    }

    try {
      // 创建工作流
      const workflow = await this.workflowManager.createWorkflow(name, {
        name,
        description,
        type,
        settings: {
          autoStart: false,
          continueOnError: false,
          notifyOnCompletion: true
        },
        input: {}
      });

      vscode.window.showInformationMessage(`工作流 ${name} 创建成功`);
    } catch (error) {
      vscode.window.showErrorMessage(`创建工作流失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 执行工作流
   * 
   * @param workflowId 工作流 ID
   */
  private async executeWorkflow(workflowId?: string): Promise<void> {
    try {
      // 如果未提供工作流 ID，则从列表中选择
      if (!workflowId) {
        const workflows = await this.workflowManager.getAllWorkflows();
        
        if (workflows.length === 0) {
          vscode.window.showInformationMessage('没有可用的工作流');
          return;
        }

        const workflowItems = workflows.map(workflow => ({
          label: workflow.name,
          description: `ID: ${workflow.id}`,
          detail: `状态: ${workflow.status}`,
          workflow
        }));

        const selectedWorkflow = await vscode.window.showQuickPick(workflowItems, {
          placeHolder: '请选择要执行的工作流'
        });

        if (!selectedWorkflow) {
          return;
        }

        workflowId = selectedWorkflow.workflow.id;
      }

      // 执行工作流
      await this.workflowExecutor.executeWorkflow(workflowId);
      
      vscode.window.showInformationMessage(`工作流 ${workflowId} 已开始执行`);
    } catch (error) {
      vscode.window.showErrorMessage(`执行工作流失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 暂停工作流
   * 
   * @param workflowId 工作流 ID
   */
  private async pauseWorkflow(workflowId?: string): Promise<void> {
    try {
      // 如果未提供工作流 ID，则从列表中选择
      if (!workflowId) {
        const workflows = await this.workflowManager.getAllWorkflows();
        
        if (workflows.length === 0) {
          vscode.window.showInformationMessage('没有可用的工作流');
          return;
        }

        // 过滤出正在运行的工作流
        const runningWorkflows = workflows
          .filter(workflow => workflow.status === WorkflowStatus.RUNNING)
          .map(workflow => ({
            label: workflow.name,
            description: `ID: ${workflow.id}`,
            detail: `状态: ${workflow.status}`,
            workflow
          }));

        if (runningWorkflows.length === 0) {
          vscode.window.showInformationMessage('没有正在运行的工作流');
          return;
        }

        const selectedWorkflow = await vscode.window.showQuickPick(runningWorkflows, {
          placeHolder: '请选择要暂停的工作流'
        });

        if (!selectedWorkflow) {
          return;
        }

        workflowId = selectedWorkflow.workflow.id;
      }

      // 暂停工作流
      await this.workflowExecutor.pauseWorkflow(workflowId);
      
      vscode.window.showInformationMessage(`工作流 ${workflowId} 已暂停`);
    } catch (error) {
      vscode.window.showErrorMessage(`暂停工作流失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 停止工作流
   * 
   * @param workflowId 工作流 ID
   */
  private async stopWorkflow(workflowId?: string): Promise<void> {
    try {
      // 如果未提供工作流 ID，则从列表中选择
      if (!workflowId) {
        const workflows = await this.workflowManager.getAllWorkflows();
        
        if (workflows.length === 0) {
          vscode.window.showInformationMessage('没有可用的工作流');
          return;
        }

        // 过滤出正在运行或暂停的工作流
        const activeWorkflows = workflows
          .filter(workflow => workflow.status === WorkflowStatus.RUNNING || workflow.status === WorkflowStatus.PAUSED)
          .map(workflow => ({
            label: workflow.name,
            description: `ID: ${workflow.id}`,
            detail: `状态: ${workflow.status}`,
            workflow
          }));

        if (activeWorkflows.length === 0) {
          vscode.window.showInformationMessage('没有正在运行或暂停的工作流');
          return;
        }

        const selectedWorkflow = await vscode.window.showQuickPick(activeWorkflows, {
          placeHolder: '请选择要停止的工作流'
        });

        if (!selectedWorkflow) {
          return;
        }

        workflowId = selectedWorkflow.workflow.id;
      }

      // 停止工作流
      await this.workflowExecutor.stopWorkflow(workflowId);
      
      vscode.window.showInformationMessage(`工作流 ${workflowId} 已停止`);
    } catch (error) {
      vscode.window.showErrorMessage(`停止工作流失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 重试工作流
   * 
   * @param workflowId 工作流 ID
   */
  private async retryWorkflow(workflowId?: string): Promise<void> {
    try {
      // 如果未提供工作流 ID，则从列表中选择
      if (!workflowId) {
        const workflows = await this.workflowManager.getAllWorkflows();
        
        if (workflows.length === 0) {
          vscode.window.showInformationMessage('没有可用的工作流');
          return;
        }

        // 过滤出错误或已完成的工作流
        const errorWorkflows = workflows
          .filter(workflow => workflow.status === WorkflowStatus.ERROR || workflow.status === WorkflowStatus.COMPLETED)
          .map(workflow => ({
            label: workflow.name,
            description: `ID: ${workflow.id}`,
            detail: `状态: ${workflow.status}`,
            workflow
          }));

        if (errorWorkflows.length === 0) {
          vscode.window.showInformationMessage('没有可重试的工作流');
          return;
        }

        const selectedWorkflow = await vscode.window.showQuickPick(errorWorkflows, {
          placeHolder: '请选择要重试的工作流'
        });

        if (!selectedWorkflow) {
          return;
        }

        workflowId = selectedWorkflow.workflow.id;
      }

      // 重试工作流
      await this.workflowExecutor.retryWorkflow(workflowId);
      
      vscode.window.showInformationMessage(`工作流 ${workflowId} 已重新开始`);
    } catch (error) {
      vscode.window.showErrorMessage(`重试工作流失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 重试当前步骤
   * 
   * @param workflowId 工作流 ID
   */
  private async retryCurrentStep(workflowId?: string): Promise<void> {
    try {
      // 如果未提供工作流 ID，则从列表中选择
      if (!workflowId) {
        const workflows = await this.workflowManager.getAllWorkflows();
        
        if (workflows.length === 0) {
          vscode.window.showInformationMessage('没有可用的工作流');
          return;
        }

        // 过滤出错误状态的工作流
        const errorWorkflows = workflows
          .filter(workflow => workflow.status === WorkflowStatus.ERROR)
          .map(workflow => ({
            label: workflow.name,
            description: `ID: ${workflow.id}`,
            detail: `状态: ${workflow.status}`,
            workflow
          }));

        if (errorWorkflows.length === 0) {
          vscode.window.showInformationMessage('没有处于错误状态的工作流');
          return;
        }

        const selectedWorkflow = await vscode.window.showQuickPick(errorWorkflows, {
          placeHolder: '请选择要重试当前步骤的工作流'
        });

        if (!selectedWorkflow) {
          return;
        }

        workflowId = selectedWorkflow.workflow.id;
      }

      // 重试当前步骤
      await this.workflowExecutor.retryCurrentStep(workflowId);
      
      vscode.window.showInformationMessage(`工作流 ${workflowId} 的当前步骤已重试`);
    } catch (error) {
      vscode.window.showErrorMessage(`重试当前步骤失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 跳过当前步骤
   * 
   * @param workflowId 工作流 ID
   */
  private async skipCurrentStep(workflowId?: string): Promise<void> {
    try {
      // 如果未提供工作流 ID，则从列表中选择
      if (!workflowId) {
        const workflows = await this.workflowManager.getAllWorkflows();
        
        if (workflows.length === 0) {
          vscode.window.showInformationMessage('没有可用的工作流');
          return;
        }

        // 过滤出错误或暂停状态的工作流
        const errorWorkflows = workflows
          .filter(workflow => workflow.status === WorkflowStatus.ERROR || workflow.status === WorkflowStatus.PAUSED)
          .map(workflow => ({
            label: workflow.name,
            description: `ID: ${workflow.id}`,
            detail: `状态: ${workflow.status}`,
            workflow
          }));

        if (errorWorkflows.length === 0) {
          vscode.window.showInformationMessage('没有处于错误或暂停状态的工作流');
          return;
        }

        const selectedWorkflow = await vscode.window.showQuickPick(errorWorkflows, {
          placeHolder: '请选择要跳过当前步骤的工作流'
        });

        if (!selectedWorkflow) {
          return;
        }

        workflowId = selectedWorkflow.workflow.id;
      }

      // 跳过当前步骤
      await this.workflowExecutor.skipCurrentStep(workflowId);
      
      vscode.window.showInformationMessage(`工作流 ${workflowId} 的当前步骤已跳过`);
    } catch (error) {
      vscode.window.showErrorMessage(`跳过当前步骤失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 创建预定义工作流
   */
  private async createPredefinedWorkflow(): Promise<void> {
    try {
      // 获取工作流类型
      const type = await vscode.window.showQuickPick(
        [
          { label: '完整开发工作流', value: 'full_development' },
          { label: '需求分析工作流', value: 'requirements_analysis' },
          { label: '架构设计工作流', value: 'architecture_design' },
          { label: '代码生成工作流', value: 'code_generation' },
          { label: '测试工作流', value: 'testing' },
          { label: '部署工作流', value: 'deployment' },
          { label: '文档生成工作流', value: 'documentation' }
        ],
        {
          placeHolder: '请选择预定义工作流类型'
        }
      );

      if (!type) {
        return;
      }

      // 获取工作流名称
      const name = await vscode.window.showInputBox({
        prompt: '请输入工作流名称',
        placeHolder: '工作流名称',
        value: type.label
      });

      if (!name) {
        return;
      }

      // 获取工作流描述
      const description = await vscode.window.showInputBox({
        prompt: '请输入工作流描述',
        placeHolder: '工作流描述'
      });

      if (!description) {
        return;
      }

      // 创建预定义工作流
      let workflow;
      switch (type.value) {
        case 'full_development':
          workflow = await this.workflowTemplateFactory.createFullDevelopmentWorkflow(name, description);
          break;
        case 'requirements_analysis':
          workflow = await this.workflowTemplateFactory.createRequirementsAnalysisWorkflow(name, description);
          break;
        case 'architecture_design':
          workflow = await this.workflowTemplateFactory.createArchitectureDesignWorkflow(name, description);
          break;
        case 'code_generation':
          workflow = await this.workflowTemplateFactory.createCodeGenerationWorkflow(name, description);
          break;
        case 'testing':
          workflow = await this.workflowTemplateFactory.createTestingWorkflow(name, description);
          break;
        case 'deployment':
          workflow = await this.workflowTemplateFactory.createDeploymentWorkflow(name, description);
          break;
        case 'documentation':
          workflow = await this.workflowTemplateFactory.createDocumentationWorkflow(name, description);
          break;
        default:
          throw new Error(`未知的工作流类型: ${type.value}`);
      }

      vscode.window.showInformationMessage(`预定义工作流 ${name} 创建成功`);

      // 询问是否立即执行工作流
      const executeNow = await vscode.window.showQuickPick(
        ['是', '否'],
        {
          placeHolder: '是否立即执行工作流？'
        }
      );

      if (executeNow === '是') {
        await this.workflowExecutor.executeWorkflow(workflow.id);
      }
    } catch (error) {
      vscode.window.showErrorMessage(`创建预定义工作流失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
} 