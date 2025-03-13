import * as vscode from "vscode";
import { IWorkflow, WorkflowConfig, WorkflowStage, WorkflowStageType, WorkflowStatus, StageStatus } from "./IWorkflow";

/**
 * 基础工作流类，实现IWorkflow接口的基本功能
 */
export class BaseWorkflow implements IWorkflow {
    public id: string;
    public name: string;
    public description: string;
    public stages: WorkflowStage[];
    public currentStage: WorkflowStage;
    public status: WorkflowStatus;
    public metadata?: Record<string, any>;
    
    private _eventEmitter: vscode.EventEmitter<any>;
    private _onStageChanged: vscode.Event<WorkflowStage>;
    private _onStatusChanged: vscode.Event<WorkflowStatus>;
    private _disposables: vscode.Disposable[];
    
    constructor() {
        this.id = "";
        this.name = "";
        this.description = "";
        this.stages = [];
        this.currentStage = {} as WorkflowStage;
        this.status = WorkflowStatus.NOT_STARTED;
        this.metadata = {};
        
        this._eventEmitter = new vscode.EventEmitter<any>();
        this._onStageChanged = this._eventEmitter.event;
        this._onStatusChanged = this._eventEmitter.event;
        this._disposables = [];
    }

    /**
     * 阶段变更事件
     */
    public get onStageChanged(): vscode.Event<WorkflowStage> {
        return this._onStageChanged;
    }
    
    /**
     * 状态变更事件
     */
    public get onStatusChanged(): vscode.Event<WorkflowStatus> {
        return this._onStatusChanged;
    }

    /**
     * 初始化工作流
     * @param config 工作流配置
     */
    public async initialize(config: WorkflowConfig): Promise<void> {
        this.id = config.id || `workflow-${Date.now()}`;
        this.name = config.name;
        this.description = config.description || "";
        this.metadata = config.metadata || {};
        
        // 初始化阶段
        if (config.stages && config.stages.length > 0) {
            this.stages = config.stages;
        } else {
            // 创建默认阶段
            this.stages = this._createDefaultStages();
        }
        
        // 设置当前阶段为第一个阶段
        this.currentStage = this.stages[0];
        
        // 设置工作流状态为未开始
        this.status = WorkflowStatus.NOT_STARTED;
        
        console.log(`Workflow ${this.id} initialized with ${this.stages.length} stages.`);
    }

    /**
     * 创建默认阶段
     * @returns 默认阶段数组
     */
    private _createDefaultStages(): WorkflowStage[] {
        return [
            {
                id: `stage-${Date.now()}-1`,
                type: WorkflowStageType.REQUIREMENTS,
                name: "需求分析",
                description: "收集和分析用户需求",
                status: StageStatus.NOT_STARTED
            },
            {
                id: `stage-${Date.now()}-2`,
                type: WorkflowStageType.DESIGN,
                name: "系统设计",
                description: "设计系统架构和组件",
                status: StageStatus.NOT_STARTED
            },
            {
                id: `stage-${Date.now()}-3`,
                type: WorkflowStageType.TASK_BREAKDOWN,
                name: "任务分解",
                description: "将开发任务分解为可管理的单元",
                status: StageStatus.NOT_STARTED
            },
            {
                id: `stage-${Date.now()}-4`,
                type: WorkflowStageType.IMPLEMENTATION,
                name: "代码实现",
                description: "编写和修改代码",
                status: StageStatus.NOT_STARTED
            },
            {
                id: `stage-${Date.now()}-5`,
                type: WorkflowStageType.TESTING,
                name: "测试验证",
                description: "设计和执行测试用例",
                status: StageStatus.NOT_STARTED
            },
            {
                id: `stage-${Date.now()}-6`,
                type: WorkflowStageType.CODE_REVIEW,
                name: "代码审查",
                description: "审查和优化代码",
                status: StageStatus.NOT_STARTED
            },
            {
                id: `stage-${Date.now()}-7`,
                type: WorkflowStageType.DEPLOYMENT,
                name: "部署发布",
                description: "部署和发布应用",
                status: StageStatus.NOT_STARTED
            },
            {
                id: `stage-${Date.now()}-8`,
                type: WorkflowStageType.MAINTENANCE,
                name: "维护更新",
                description: "维护和更新应用",
                status: StageStatus.NOT_STARTED
            }
        ];
    }

    /**
     * 移动到下一个阶段
     * @returns 是否成功移动
     */
    public async moveToNextStage(): Promise<boolean> {
        const currentIndex = this.stages.findIndex(stage => stage.id === this.currentStage.id);
        
        if (currentIndex < 0 || currentIndex >= this.stages.length - 1) {
            console.warn("No next stage available.");
            return false;
        }
        
        const nextStage = this.stages[currentIndex + 1];
        return this.moveToStage(nextStage.id);
    }
    
    /**
     * 移动到上一个阶段
     * @returns 是否成功移动
     */
    public async moveToPreviousStage(): Promise<boolean> {
        const currentIndex = this.stages.findIndex(stage => stage.id === this.currentStage.id);
        
        if (currentIndex <= 0) {
            console.warn("No previous stage available.");
            return false;
        }
        
        const previousStage = this.stages[currentIndex - 1];
        return this.moveToStage(previousStage.id);
    }
    
    /**
     * 移动到指定阶段
     * @param stageId 阶段ID
     * @returns 是否成功移动
     */
    public async moveToStage(stageId: string): Promise<boolean> {
        const stage = this.stages.find(s => s.id === stageId);
        
        if (!stage) {
            console.warn(`Stage with id ${stageId} not found.`);
            return false;
        }
        
        // 更新当前阶段状态为已完成（如果不是已失败状态）
        if (this.currentStage.status !== StageStatus.FAILED) {
            this.currentStage.status = StageStatus.COMPLETED;
            this.currentStage.endTime = new Date();
        }
        
        // 更新新阶段状态为进行中
        stage.status = StageStatus.IN_PROGRESS;
        stage.startTime = new Date();
        
        // 更新当前阶段
        this.currentStage = stage;
        
        // 更新工作流状态为进行中
        if (this.status !== WorkflowStatus.IN_PROGRESS) {
            this.status = WorkflowStatus.IN_PROGRESS;
        }
        
        // 触发阶段变更事件
        this._eventEmitter.fire(this.currentStage);
        
        console.log(`Moved to stage: ${stage.name}`);
        return true;
    }

    /**
     * 获取当前阶段
     * @returns 当前阶段
     */
    public getCurrentStage(): WorkflowStage {
        return this.currentStage;
    }
    
    /**
     * 获取阶段状态
     * @param stageId 阶段ID
     * @returns 阶段状态
     */
    public getStageStatus(stageId: string): StageStatus {
        const stage = this.stages.find(s => s.id === stageId);
        return stage ? stage.status : StageStatus.NOT_STARTED;
    }
    
    /**
     * 获取工作流进度
     * @returns 进度百分比（0-100）
     */
    public getProgress(): number {
        if (this.stages.length === 0) {
            return 0;
        }
        
        const completedStages = this.stages.filter(
            s => s.status === StageStatus.COMPLETED || s.status === StageStatus.SKIPPED
        ).length;
        
        const inProgressStage = this.stages.find(s => s.status === StageStatus.IN_PROGRESS);
        const inProgressWeight = inProgressStage ? 0.5 : 0;
        
        return Math.min(100, Math.round((completedStages + inProgressWeight) / this.stages.length * 100));
    }

    /**
     * 暂停工作流
     * @returns 是否成功暂停
     */
    public async pause(): Promise<boolean> {
        if (this.status !== WorkflowStatus.IN_PROGRESS) {
            console.warn("Cannot pause workflow that is not in progress.");
            return false;
        }
        
        this.status = WorkflowStatus.PAUSED;
        
        // 更新当前阶段状态为暂停
        this.currentStage.status = StageStatus.PAUSED;
        
        // 触发状态变更事件
        this._eventEmitter.fire(this.status);
        
        console.log(`Workflow ${this.id} paused.`);
        return true;
    }
    
    /**
     * 恢复工作流
     * @returns 是否成功恢复
     */
    public async resume(): Promise<boolean> {
        if (this.status !== WorkflowStatus.PAUSED) {
            console.warn("Cannot resume workflow that is not paused.");
            return false;
        }
        
        this.status = WorkflowStatus.IN_PROGRESS;
        
        // 更新当前阶段状态为进行中
        this.currentStage.status = StageStatus.IN_PROGRESS;
        
        // 触发状态变更事件
        this._eventEmitter.fire(this.status);
        
        console.log(`Workflow ${this.id} resumed.`);
        return true;
    }
    
    /**
     * 重置工作流
     * @returns 是否成功重置
     */
    public async reset(): Promise<boolean> {
        // 重置所有阶段状态
        this.stages.forEach(stage => {
            stage.status = StageStatus.NOT_STARTED;
            stage.startTime = undefined;
            stage.endTime = undefined;
        });
        
        // 设置当前阶段为第一个阶段
        this.currentStage = this.stages[0];
        
        // 设置工作流状态为未开始
        this.status = WorkflowStatus.NOT_STARTED;
        
        // 触发状态变更事件
        this._eventEmitter.fire(this.status);
        
        console.log(`Workflow ${this.id} reset.`);
        return true;
    }

    /**
     * 释放资源
     */
    public dispose(): void {
        // 释放事件发射器
        this._eventEmitter.dispose();
        
        // 释放所有订阅
        this._disposables.forEach(d => d.dispose());
        this._disposables = [];
        
        console.log(`Workflow ${this.id} disposed.`);
    }
}
