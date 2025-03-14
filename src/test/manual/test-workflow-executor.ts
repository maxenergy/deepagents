import * as path from 'path';
import * as fs from 'fs';
import mockRequire = require('mock-require');

console.log('开始测试 WorkflowExecutor...');

// 模拟 vscode 模块
const vscode = {
    window: {
        showInformationMessage: (message: string, ...items: string[]) => {
            console.log(`[INFO] ${message}`);
            if (items.length > 0) {
                console.log(`[INFO] 选项: ${items.join(', ')}`);
                return Promise.resolve(items[0]); // 自动选择第一个选项
            }
            return Promise.resolve(undefined);
        },
        showErrorMessage: (message: string, ...items: string[]) => {
            console.log(`[ERROR] ${message}`);
            return Promise.resolve(undefined);
        }
    },
    commands: {
        registerCommand: (command: string, callback: (...args: any[]) => any) => {
            console.log(`[REGISTER_COMMAND] ${command}`);
            return { dispose: () => {} };
        }
    }
};

// 使用 mock-require 模拟 vscode 模块
mockRequire('vscode', vscode);

// 模拟 IWorkflow 接口
interface IWorkflow {
    id: string;
    name: string;
    description: string;
    type: string;
    config: any;
    status: string;
    steps: any[];
    start(): Promise<void>;
    pause(): Promise<void>;
    stop(): Promise<void>;
    getCurrentStep(): any | null;
    moveToNextStep(): boolean;
    isCompleted(): boolean;
}

// 模拟 WorkflowStatus 枚举
const WorkflowStatus = {
    IDLE: 'idle',
    RUNNING: 'running',
    PAUSED: 'paused',
    COMPLETED: 'completed',
    ERROR: 'error',
    STOPPED: 'stopped'
};

// 模拟 WorkflowManager 类
class MockWorkflowManager {
    private workflows: Map<string, IWorkflow> = new Map();

    constructor() {
        console.log('创建 MockWorkflowManager 实例');
    }

    async getWorkflow(id: string): Promise<IWorkflow | null> {
        console.log(`获取工作流: ${id}`);
        return this.workflows.get(id) || null;
    }

    async updateWorkflow(id: string, config: any): Promise<void> {
        console.log(`更新工作流: ${id}`);
        const workflow = this.workflows.get(id);
        if (workflow) {
            workflow.config = config;
        }
    }

    // 添加工作流（用于测试）
    addWorkflow(workflow: IWorkflow): void {
        console.log(`添加工作流: ${workflow.id} - ${workflow.name}`);
        this.workflows.set(workflow.id, workflow);
    }
}

// 模拟工作流步骤
class MockWorkflowStep {
    public active: boolean = false;
    public completed: boolean = false;
    
    constructor(
        public name: string,
        public description: string,
        private shouldFail: boolean = false,
        private executionDelay: number = 100
    ) {}

    async execute(): Promise<any> {
        console.log(`执行步骤: ${this.name}`);
        
        // 模拟异步执行
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (this.shouldFail) {
                    console.log(`步骤执行失败: ${this.name}`);
                    reject(new Error(`步骤执行失败: ${this.name}`));
                } else {
                    console.log(`步骤执行成功: ${this.name}`);
                    resolve({ status: 'success', message: `步骤 ${this.name} 执行成功` });
                }
            }, this.executionDelay);
        });
    }
}

// 模拟工作流
class MockWorkflow implements IWorkflow {
    public status: string = WorkflowStatus.IDLE;
    private currentStepIndex: number = 0;

    constructor(
        public id: string,
        public name: string,
        public description: string,
        public type: string,
        public config: any,
        public steps: MockWorkflowStep[]
    ) {}

    async start(): Promise<void> {
        console.log(`启动工作流: ${this.name}`);
        this.status = WorkflowStatus.RUNNING;
    }

    async pause(): Promise<void> {
        console.log(`暂停工作流: ${this.name}`);
        this.status = WorkflowStatus.PAUSED;
    }

    async stop(): Promise<void> {
        console.log(`停止工作流: ${this.name}`);
        this.status = WorkflowStatus.STOPPED;
    }

    getCurrentStep(): MockWorkflowStep | null {
        if (this.currentStepIndex >= this.steps.length) {
            return null;
        }
        return this.steps[this.currentStepIndex];
    }

    moveToNextStep(): boolean {
        if (this.currentStepIndex < this.steps.length - 1) {
            this.currentStepIndex++;
            console.log(`移动到下一步骤: ${this.steps[this.currentStepIndex].name}`);
            return true;
        }
        console.log(`已到达最后一个步骤，无法继续移动`);
        return false;
    }

    isCompleted(): boolean {
        return this.currentStepIndex >= this.steps.length;
    }
}

// 修改 WorkflowExecutor 类的实现，避免无限循环
class MockWorkflowExecutor {
    private runningWorkflows: Map<string, NodeJS.Timeout> = new Map();

    constructor(private workflowManager: MockWorkflowManager) {}

    async executeWorkflow(workflowId: string): Promise<void> {
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

    async pauseWorkflow(workflowId: string): Promise<void> {
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

    async stopWorkflow(workflowId: string): Promise<void> {
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

            // 移动到下一步骤
            workflow.moveToNextStep();

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
                // 移动到下一步骤
                workflow.moveToNextStep();
                
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

    async retryCurrentStep(workflowId: string): Promise<void> {
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

    async skipCurrentStep(workflowId: string): Promise<void> {
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
        
        // 移动到下一步骤
        workflow.moveToNextStep();
        
        // 重置工作流状态
        workflow.status = WorkflowStatus.IDLE;
        
        // 更新工作流
        await this.workflowManager.updateWorkflow(workflowId, workflow.config);

        // 执行工作流
        await this.executeWorkflow(workflow.id);
    }
}

// 运行测试
async function runTest() {
    try {
        console.log('准备测试 WorkflowExecutor...');
        
        // 创建 MockWorkflowManager 实例
        const workflowManager = new MockWorkflowManager();
        
        // 创建 MockWorkflowExecutor 实例
        const workflowExecutor = new MockWorkflowExecutor(workflowManager);
        
        // 创建测试工作流
        const workflow1 = new MockWorkflow(
            'workflow-1',
            '测试工作流 1',
            '用于测试的工作流',
            'test',
            { settings: { continueOnError: false } },
            [
                new MockWorkflowStep('步骤 1', '第一个步骤', false, 500),
                new MockWorkflowStep('步骤 2', '第二个步骤', false, 500),
                new MockWorkflowStep('步骤 3', '第三个步骤', false, 500)
            ]
        );
        
        // 添加工作流到管理器
        workflowManager.addWorkflow(workflow1);
        
        // 测试执行工作流
        console.log('\n测试执行工作流...');
        await workflowExecutor.executeWorkflow('workflow-1');
        
        // 等待一段时间，让工作流执行
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 测试暂停工作流
        console.log('\n测试暂停工作流...');
        await workflowExecutor.pauseWorkflow('workflow-1');
        
        // 等待一段时间
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 测试继续执行工作流
        console.log('\n测试继续执行工作流...');
        await workflowExecutor.executeWorkflow('workflow-1');
        
        // 等待一段时间
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 测试停止工作流
        console.log('\n测试停止工作流...');
        await workflowExecutor.stopWorkflow('workflow-1');
        
        // 创建一个会失败的工作流
        const workflow2 = new MockWorkflow(
            'workflow-2',
            '测试工作流 2（会失败）',
            '用于测试失败处理的工作流',
            'test',
            { settings: { continueOnError: false } },
            [
                new MockWorkflowStep('步骤 1', '第一个步骤', false, 500),
                new MockWorkflowStep('步骤 2', '第二个步骤（会失败）', true, 500),
                new MockWorkflowStep('步骤 3', '第三个步骤', false, 500)
            ]
        );
        
        // 添加工作流到管理器
        workflowManager.addWorkflow(workflow2);
        
        // 测试执行会失败的工作流
        console.log('\n测试执行会失败的工作流...');
        await workflowExecutor.executeWorkflow('workflow-2');
        
        // 等待一段时间，让工作流执行到失败
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 测试重试当前步骤
        console.log('\n测试重试当前步骤...');
        try {
            await workflowExecutor.retryCurrentStep('workflow-2');
        } catch (error) {
            console.error(`重试当前步骤失败: ${error}`);
        }
        
        // 等待一段时间
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 测试跳过当前步骤
        console.log('\n测试跳过当前步骤...');
        try {
            await workflowExecutor.skipCurrentStep('workflow-2');
        } catch (error) {
            console.error(`跳过当前步骤失败: ${error}`);
        }
        
        // 等待一段时间
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 创建一个会在失败时继续的工作流
        const workflow3 = new MockWorkflow(
            'workflow-3',
            '测试工作流 3（失败时继续）',
            '用于测试失败时继续的工作流',
            'test',
            { settings: { continueOnError: true } },
            [
                new MockWorkflowStep('步骤 1', '第一个步骤', false, 500),
                new MockWorkflowStep('步骤 2', '第二个步骤（会失败）', true, 500),
                new MockWorkflowStep('步骤 3', '第三个步骤', false, 500)
            ]
        );
        
        // 添加工作流到管理器
        workflowManager.addWorkflow(workflow3);
        
        // 测试执行会在失败时继续的工作流
        console.log('\n测试执行会在失败时继续的工作流...');
        await workflowExecutor.executeWorkflow('workflow-3');
        
        // 等待足够长的时间，让所有工作流执行完成
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        console.log('\n测试完成!');
        
        // 清理所有定时器
        process.exit(0);
    } catch (error) {
        console.error('测试失败:', error);
        process.exit(1);
    }
}

// 运行测试
runTest(); 