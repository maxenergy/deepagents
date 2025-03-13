import * as vscode from "vscode";

/**
 * 工作流阶段枚举
 */
export enum WorkflowStageType {
    REQUIREMENTS = "requirements",
    DESIGN = "design",
    TASK_BREAKDOWN = "task_breakdown",
    IMPLEMENTATION = "implementation",
    TESTING = "testing",
    CODE_REVIEW = "code_review",
    DEPLOYMENT = "deployment",
    MAINTENANCE = "maintenance"
}

/**
 * 工作流状态枚举
 */
export enum WorkflowStatus {
    NOT_STARTED = "not_started",
    IN_PROGRESS = "in_progress",
    PAUSED = "paused",
    COMPLETED = "completed",
    FAILED = "failed"
}

/**
 * 阶段状态枚举
 */
export enum StageStatus {
    NOT_STARTED = "not_started",
    IN_PROGRESS = "in_progress",
    PAUSED = "paused",
    COMPLETED = "completed",
    FAILED = "failed",
    SKIPPED = "skipped"
}

/**
 * 工作流阶段接口
 */
export interface WorkflowStage {
    id: string;
    type: WorkflowStageType;
    name: string;
    description: string;
    status: StageStatus;
    startTime?: Date;
    endTime?: Date;
    dependencies?: string[];
    artifacts?: any[];
    metadata?: Record<string, any>;
}

/**
 * 阶段结果接口
 */
export interface StageResult {
    stageId: string;
    status: StageStatus;
    output: any;
    error?: Error;
    startTime: Date;
    endTime: Date;
    metadata?: Record<string, any>;
}

/**
 * 工作流配置接口
 */
export interface WorkflowConfig {
    id?: string;
    name: string;
    description?: string;
    stages?: WorkflowStage[];
    autoProgress?: boolean;
    metadata?: Record<string, any>;
}

/**
 * 工作流状态接口
 */
export interface WorkflowStatus {
    workflowId: string;
    status: WorkflowStatus;
    currentStageId: string;
    progress: number;
    startTime?: Date;
    endTime?: Date;
    stageStatuses: Record<string, StageStatus>;
    metadata?: Record<string, any>;
}

/**
 * 工作流接口
 */
export interface IWorkflow {
    id: string;
    name: string;
    description: string;
    stages: WorkflowStage[];
    currentStage: WorkflowStage;
    status: WorkflowStatus;
    metadata?: Record<string, any>;
    
    initialize(config: WorkflowConfig): Promise<void>;
    moveToNextStage(): Promise<boolean>;
    moveToPreviousStage(): Promise<boolean>;
    moveToStage(stageId: string): Promise<boolean>;
    getCurrentStage(): WorkflowStage;
    getStageStatus(stageId: string): StageStatus;
    getProgress(): number;
    pause(): Promise<boolean>;
    resume(): Promise<boolean>;
    reset(): Promise<boolean>;
    dispose(): void;
}

/**
 * 工作流引擎接口
 */
export interface IWorkflowEngine {
    createWorkflow(config: WorkflowConfig): Promise<IWorkflow>;
    getWorkflow(id: string): IWorkflow | null;
    getAllWorkflows(): IWorkflow[];
    deleteWorkflow(id: string): Promise<boolean>;
    executeStage(workflow: IWorkflow, stage: WorkflowStage): Promise<StageResult>;
    monitorWorkflow(workflow: IWorkflow): WorkflowStatus;
    registerStageHandler(stageType: WorkflowStageType, handler: StageHandler): void;
    dispose(): void;
}

/**
 * 阶段处理器类型
 */
export type StageHandler = (workflow: IWorkflow, stage: WorkflowStage) => Promise<StageResult>;
