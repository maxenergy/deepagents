import * as vscode from "vscode";
import { IWorkflow, IWorkflowEngine, WorkflowConfig, WorkflowStage, WorkflowStageType, StageStatus, StageResult } from "./IWorkflow";
import { WorkflowEngine } from "./WorkflowEngine";

/**
 * 工作流服务类，提供工作流相关的服务和API
 */
export class WorkflowService {
    private static _instance: WorkflowService;
    private _workflowEngine: IWorkflowEngine;
    private _disposables: vscode.Disposable[];
    
    private constructor() {
        this._workflowEngine = WorkflowEngine.getInstance();
        this._disposables = [];
    }

    /**
     * 获取工作流服务实例（单例模式）
     */
    public static getInstance(): WorkflowService {
        if (!WorkflowService._instance) {
            WorkflowService._instance = new WorkflowService();
        }
        return WorkflowService._instance;
    }
    
    /**
     * 初始化工作流服务
     * @param context VSCode扩展上下文
     */
    public initialize(context: vscode.ExtensionContext): void {
        // 注册命令
        this._registerCommands(context);
        
        // 添加到上下文的订阅中
        context.subscriptions.push(this);
    }

    /**
     * 注册命令
     * @param context VSCode扩展上下文
     */
    private _registerCommands(context: vscode.ExtensionContext): void {
        // 注册创建工作流命令
        const createWorkflowCommand = vscode.commands.registerCommand(
            "deepagents.createWorkflow",
            async (config: WorkflowConfig) => {
                return await this.createWorkflow(config);
            }
        );
        
        // 注册获取工作流命令
        const getWorkflowCommand = vscode.commands.registerCommand(
            "deepagents.getWorkflow",
            (id: string) => {
                return this.getWorkflow(id);
            }
        );
        
        // 注册获取所有工作流命令
        const getAllWorkflowsCommand = vscode.commands.registerCommand(
            "deepagents.getAllWorkflows",
            () => {
                return this.getAllWorkflows();
            }
        );
        
        // 注册删除工作流命令
        const deleteWorkflowCommand = vscode.commands.registerCommand(
            "deepagents.deleteWorkflow",
            async (id: string) => {
                return await this.deleteWorkflow(id);
            }
        );
        
        // 注册执行阶段命令
        const executeStageCommand = vscode.commands.registerCommand(
            "deepagents.executeStage",
            async (workflowId: string, stageId: string) => {
                return await this.executeStage(workflowId, stageId);
            }
        );
        
        // 添加到订阅中
        this._disposables.push(
            createWorkflowCommand,
            getWorkflowCommand,
            getAllWorkflowsCommand,
            deleteWorkflowCommand,
            executeStageCommand
        );
        
        context.subscriptions.push(
            createWorkflowCommand,
            getWorkflowCommand,
            getAllWorkflowsCommand,
            deleteWorkflowCommand,
            executeStageCommand
        );
    }

    /**
     * 创建工作流
     * @param config 工作流配置
     * @returns 创建的工作流
     */
    public async createWorkflow(config: WorkflowConfig): Promise<IWorkflow> {
        return await this._workflowEngine.createWorkflow(config);
    }
    
    /**
     * 获取工作流
     * @param id 工作流ID
     * @returns 工作流或null（如果不存在）
     */
    public getWorkflow(id: string): IWorkflow | null {
        return this._workflowEngine.getWorkflow(id);
    }
    
    /**
     * 获取所有工作流
     * @returns 所有工作流的数组
     */
    public getAllWorkflows(): IWorkflow[] {
        return this._workflowEngine.getAllWorkflows();
    }
    
    /**
     * 删除工作流
     * @param id 工作流ID
     * @returns 是否成功删除
     */
    public async deleteWorkflow(id: string): Promise<boolean> {
        return await this._workflowEngine.deleteWorkflow(id);
    }

    /**
     * 执行阶段
     * @param workflowId 工作流ID
     * @param stageId 阶段ID
     * @returns 阶段执行结果
     */
    public async executeStage(workflowId: string, stageId: string): Promise<StageResult> {
        const workflow = this.getWorkflow(workflowId);
        
        if (!workflow) {
            throw new Error(`Workflow with id ${workflowId} not found.`);
        }
        
        const stage = workflow.stages.find(s => s.id === stageId);
        
        if (!stage) {
            throw new Error(`Stage with id ${stageId} not found in workflow ${workflowId}.`);
        }
        
        return await this._workflowEngine.executeStage(workflow, stage);
    }
    
    /**
     * 移动到下一个阶段
     * @param workflowId 工作流ID
     * @returns 是否成功移动
     */
    public async moveToNextStage(workflowId: string): Promise<boolean> {
        const workflow = this.getWorkflow(workflowId);
        
        if (!workflow) {
            throw new Error(`Workflow with id ${workflowId} not found.`);
        }
        
        return await workflow.moveToNextStage();
    }
    
    /**
     * 移动到上一个阶段
     * @param workflowId 工作流ID
     * @returns 是否成功移动
     */
    public async moveToPreviousStage(workflowId: string): Promise<boolean> {
        const workflow = this.getWorkflow(workflowId);
        
        if (!workflow) {
            throw new Error(`Workflow with id ${workflowId} not found.`);
        }
        
        return await workflow.moveToPreviousStage();
    }
    
    /**
     * 移动到指定阶段
     * @param workflowId 工作流ID
     * @param stageId 阶段ID
     * @returns 是否成功移动
     */
    public async moveToStage(workflowId: string, stageId: string): Promise<boolean> {
        const workflow = this.getWorkflow(workflowId);
        
        if (!workflow) {
            throw new Error(`Workflow with id ${workflowId} not found.`);
        }
        
        return await workflow.moveToStage(stageId);
    }

    /**
     * 获取工作流状态
     * @param workflowId 工作流ID
     * @returns 工作流状态
     */
    public getWorkflowStatus(workflowId: string): any {
        const workflow = this.getWorkflow(workflowId);
        
        if (!workflow) {
            throw new Error(`Workflow with id ${workflowId} not found.`);
        }
        
        return this._workflowEngine.monitorWorkflow(workflow);
    }
    
    /**
     * 暂停工作流
     * @param workflowId 工作流ID
     * @returns 是否成功暂停
     */
    public async pauseWorkflow(workflowId: string): Promise<boolean> {
        const workflow = this.getWorkflow(workflowId);
        
        if (!workflow) {
            throw new Error(`Workflow with id ${workflowId} not found.`);
        }
        
        return await workflow.pause();
    }
    
    /**
     * 恢复工作流
     * @param workflowId 工作流ID
     * @returns 是否成功恢复
     */
    public async resumeWorkflow(workflowId: string): Promise<boolean> {
        const workflow = this.getWorkflow(workflowId);
        
        if (!workflow) {
            throw new Error(`Workflow with id ${workflowId} not found.`);
        }
        
        return await workflow.resume();
    }
    
    /**
     * 重置工作流
     * @param workflowId 工作流ID
     * @returns 是否成功重置
     */
    public async resetWorkflow(workflowId: string): Promise<boolean> {
        const workflow = this.getWorkflow(workflowId);
        
        if (!workflow) {
            throw new Error(`Workflow with id ${workflowId} not found.`);
        }
        
        return await workflow.reset();
    }

    /**
     * 注册阶段处理器
     * @param stageType 阶段类型
     * @param handler 处理器函数
     */
    public registerStageHandler(stageType: WorkflowStageType, handler: (workflow: IWorkflow, stage: WorkflowStage) => Promise<StageResult>): void {
        this._workflowEngine.registerStageHandler(stageType, handler);
    }
    
    /**
     * 释放资源
     */
    public dispose(): void {
        // 释放所有订阅
        this._disposables.forEach(d => d.dispose());
        this._disposables = [];
    }
}
