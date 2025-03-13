import * as vscode from "vscode";
import { IWorkflow, IWorkflowEngine, WorkflowConfig, WorkflowStage, WorkflowStageType, WorkflowStatus, StageStatus, StageResult, StageHandler } from "./IWorkflow";
import { BaseWorkflow } from "./BaseWorkflow";

/**
 * 工作流引擎类，负责创建、管理和执行工作流
 */
export class WorkflowEngine implements IWorkflowEngine {
    private static _instance: WorkflowEngine;
    private _workflows: Map<string, IWorkflow>;
    private _stageHandlers: Map<WorkflowStageType, StageHandler>;
    private _eventEmitter: vscode.EventEmitter<any>;
    private _onWorkflowCreated: vscode.Event<IWorkflow>;
    private _onWorkflowDeleted: vscode.Event<string>;
    private _onStageExecuted: vscode.Event<StageResult>;
    private _disposables: vscode.Disposable[];
    
    private constructor() {
        this._workflows = new Map<string, IWorkflow>();
        this._stageHandlers = new Map<WorkflowStageType, StageHandler>();
        this._eventEmitter = new vscode.EventEmitter<any>();
        this._onWorkflowCreated = this._eventEmitter.event;
        this._onWorkflowDeleted = this._eventEmitter.event;
        this._onStageExecuted = this._eventEmitter.event;
        this._disposables = [];
        
        this._registerDefaultStageHandlers();
    }

    /**
     * 工作流创建事件
     */
    public get onWorkflowCreated(): vscode.Event<IWorkflow> {
        return this._onWorkflowCreated;
    }
    
    /**
     * 工作流删除事件
     */
    public get onWorkflowDeleted(): vscode.Event<string> {
        return this._onWorkflowDeleted;
    }
    
    /**
     * 阶段执行事件
     */
    public get onStageExecuted(): vscode.Event<StageResult> {
        return this._onStageExecuted;
    }
    
    /**
     * 获取工作流引擎实例（单例模式）
     */
    public static getInstance(): WorkflowEngine {
        if (!WorkflowEngine._instance) {
            WorkflowEngine._instance = new WorkflowEngine();
        }
        return WorkflowEngine._instance;
    }

    /**
     * 注册默认阶段处理器
     */
    private _registerDefaultStageHandlers(): void {
        // 需求分析阶段处理器
        this.registerStageHandler(WorkflowStageType.REQUIREMENTS, async (workflow, stage) => {
            console.log(`Executing requirements stage for workflow ${workflow.id}`);
            
            // 这里应该实现实际的需求分析逻辑
            // 例如调用产品经理代理进行需求分析
            
            return {
                stageId: stage.id,
                status: StageStatus.COMPLETED,
                output: { message: "需求分析完成" },
                startTime: new Date(),
                endTime: new Date()
            };
        });
        
        // 系统设计阶段处理器
        this.registerStageHandler(WorkflowStageType.DESIGN, async (workflow, stage) => {
            console.log(`Executing design stage for workflow ${workflow.id}`);
            
            // 这里应该实现实际的系统设计逻辑
            // 例如调用架构师代理进行系统设计
            
            return {
                stageId: stage.id,
                status: StageStatus.COMPLETED,
                output: { message: "系统设计完成" },
                startTime: new Date(),
                endTime: new Date()
            };
        });
        
        // 任务分解阶段处理器
        this.registerStageHandler(WorkflowStageType.TASK_BREAKDOWN, async (workflow, stage) => {
            console.log(`Executing task breakdown stage for workflow ${workflow.id}`);
            
            // 这里应该实现实际的任务分解逻辑
            // 例如调用项目经理代理进行任务分解
            
            return {
                stageId: stage.id,
                status: StageStatus.COMPLETED,
                output: { message: "任务分解完成" },
                startTime: new Date(),
                endTime: new Date()
            };
        });
        
        // 代码实现阶段处理器
        this.registerStageHandler(WorkflowStageType.IMPLEMENTATION, async (workflow, stage) => {
            console.log(`Executing implementation stage for workflow ${workflow.id}`);
            
            // 这里应该实现实际的代码实现逻辑
            // 例如调用开发者代理进行代码实现
            
            return {
                stageId: stage.id,
                status: StageStatus.COMPLETED,
                output: { message: "代码实现完成" },
                startTime: new Date(),
                endTime: new Date()
            };
        });
        
        // 测试验证阶段处理器
        this.registerStageHandler(WorkflowStageType.TESTING, async (workflow, stage) => {
            console.log(`Executing testing stage for workflow ${workflow.id}`);
            
            // 这里应该实现实际的测试验证逻辑
            // 例如调用测试员代理进行测试验证
            
            return {
                stageId: stage.id,
                status: StageStatus.COMPLETED,
                output: { message: "测试验证完成" },
                startTime: new Date(),
                endTime: new Date()
            };
        });
        
        // 代码审查阶段处理器
        this.registerStageHandler(WorkflowStageType.CODE_REVIEW, async (workflow, stage) => {
            console.log(`Executing code review stage for workflow ${workflow.id}`);
            
            // 这里应该实现实际的代码审查逻辑
            // 例如调用代码审查代理进行代码审查
            
            return {
                stageId: stage.id,
                status: StageStatus.COMPLETED,
                output: { message: "代码审查完成" },
                startTime: new Date(),
                endTime: new Date()
            };
        });
        
        // 部署发布阶段处理器
        this.registerStageHandler(WorkflowStageType.DEPLOYMENT, async (workflow, stage) => {
            console.log(`Executing deployment stage for workflow ${workflow.id}`);
            
            // 这里应该实现实际的部署发布逻辑
            // 例如调用DevOps代理进行部署发布
            
            return {
                stageId: stage.id,
                status: StageStatus.COMPLETED,
                output: { message: "部署发布完成" },
                startTime: new Date(),
                endTime: new Date()
            };
        });
        
        // 维护更新阶段处理器
        this.registerStageHandler(WorkflowStageType.MAINTENANCE, async (workflow, stage) => {
            console.log(`Executing maintenance stage for workflow ${workflow.id}`);
            
            // 这里应该实现实际的维护更新逻辑
            // 例如调用维护代理进行维护更新
            
            return {
                stageId: stage.id,
                status: StageStatus.COMPLETED,
                output: { message: "维护更新完成" },
                startTime: new Date(),
                endTime: new Date()
            };
        });
    }

    /**
     * 创建工作流
     * @param config 工作流配置
     * @returns 创建的工作流
     */
    public async createWorkflow(config: WorkflowConfig): Promise<IWorkflow> {
        const workflow = new BaseWorkflow();
        await workflow.initialize(config);
        
        this._workflows.set(workflow.id, workflow);
        
        // 触发工作流创建事件
        this._eventEmitter.fire(workflow);
        
        console.log(`Workflow ${workflow.id} created.`);
        return workflow;
    }
    
    /**
     * 获取工作流
     * @param id 工作流ID
     * @returns 工作流或null（如果不存在）
     */
    public getWorkflow(id: string): IWorkflow | null {
        return this._workflows.get(id) || null;
    }
    
    /**
     * 获取所有工作流
     * @returns 所有工作流的数组
     */
    public getAllWorkflows(): IWorkflow[] {
        return Array.from(this._workflows.values());
    }
    
    /**
     * 删除工作流
     * @param id 工作流ID
     * @returns 是否成功删除
     */
    public async deleteWorkflow(id: string): Promise<boolean> {
        const workflow = this._workflows.get(id);
        
        if (!workflow) {
            console.warn(`Workflow with id ${id} not found.`);
            return false;
        }
        
        // 释放工作流资源
        workflow.dispose();
        
        // 从集合中移除
        this._workflows.delete(id);
        
        // 触发工作流删除事件
        this._eventEmitter.fire(id);
        
        console.log(`Workflow ${id} deleted.`);
        return true;
    }

    /**
     * 执行阶段
     * @param workflow 工作流
     * @param stage 阶段
     * @returns 阶段执行结果
     */
    public async executeStage(workflow: IWorkflow, stage: WorkflowStage): Promise<StageResult> {
        console.log(`Executing stage ${stage.name} for workflow ${workflow.id}`);
        
        const handler = this._stageHandlers.get(stage.type);
        
        if (!handler) {
            console.warn(`No handler registered for stage type ${stage.type}.`);
            
            const result: StageResult = {
                stageId: stage.id,
                status: StageStatus.FAILED,
                output: null,
                error: new Error(`No handler registered for stage type ${stage.type}.`),
                startTime: new Date(),
                endTime: new Date()
            };
            
            // 触发阶段执行事件
            this._eventEmitter.fire(result);
            
            return result;
        }
        
        try {
            // 更新阶段状态为进行中
            stage.status = StageStatus.IN_PROGRESS;
            stage.startTime = new Date();
            
            // 执行阶段处理器
            const result = await handler(workflow, stage);
            
            // 更新阶段状态
            stage.status = result.status;
            stage.endTime = result.endTime;
            
            // 触发阶段执行事件
            this._eventEmitter.fire(result);
            
            return result;
        } catch (error) {
            console.error(`Error executing stage ${stage.name}:`, error);
            
            // 更新阶段状态为失败
            stage.status = StageStatus.FAILED;
            stage.endTime = new Date();
            
            const result: StageResult = {
                stageId: stage.id,
                status: StageStatus.FAILED,
                output: null,
                error: error instanceof Error ? error : new Error(String(error)),
                startTime: stage.startTime || new Date(),
                endTime: new Date()
            };
            
            // 触发阶段执行事件
            this._eventEmitter.fire(result);
            
            return result;
        }
    }
    
    /**
     * 监控工作流
     * @param workflow 工作流
     * @returns 工作流状态
     */
    public monitorWorkflow(workflow: IWorkflow): WorkflowStatus {
        const stageStatuses: Record<string, StageStatus> = {};
        
        workflow.stages.forEach(stage => {
            stageStatuses[stage.id] = stage.status;
        });
        
        return {
            workflowId: workflow.id,
            status: workflow.status,
            currentStageId: workflow.currentStage.id,
            progress: workflow.getProgress(),
            startTime: workflow.stages[0].startTime,
            endTime: workflow.stages[workflow.stages.length - 1].endTime,
            stageStatuses,
            metadata: workflow.metadata
        };
    }

    /**
     * 注册阶段处理器
     * @param stageType 阶段类型
     * @param handler 处理器函数
     */
    public registerStageHandler(stageType: WorkflowStageType, handler: StageHandler): void {
        this._stageHandlers.set(stageType, handler);
        console.log(`Handler registered for stage type ${stageType}.`);
    }
    
    /**
     * 释放资源
     */
    public dispose(): void {
        // 释放所有工作流资源
        this._workflows.forEach(workflow => {
            workflow.dispose();
        });
        
        // 清空工作流集合
        this._workflows.clear();
        
        // 清空阶段处理器集合
        this._stageHandlers.clear();
        
        // 释放事件发射器
        this._eventEmitter.dispose();
        
        // 释放所有订阅
        this._disposables.forEach(d => d.dispose());
        this._disposables = [];
        
        console.log("WorkflowEngine disposed.");
    }
}
