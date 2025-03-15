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
    },
    EventEmitter: class {
        private listeners: Array<(e: any) => any> = [];
        
        public event = (listener: (e: any) => any) => {
            this.listeners.push(listener);
            return { dispose: () => {} };
        };
        
        public fire(data: any) {
            this.listeners.forEach(listener => listener(data));
        }
    },
    Uri: {
        file: (path: string) => {
            return { fsPath: path };
        }
    }
};

// 使用 mock-require 模拟 vscode 模块
mockRequire('vscode', vscode);

// 模拟 WorkflowManager 类
class MockWorkflowManager {
    private workflows: Map<string, any> = new Map();
    private currentStepIndex: Map<string, number> = new Map();

    constructor() {
        console.log('创建 MockWorkflowManager 实例');
    }

    async createWorkflow(name: string, config: any): Promise<any> {
        console.log(`创建工作流: ${name}`);
        const id = `workflow-${Math.random().toString(36).substring(2, 9)}`;
        const workflow = {
            id,
            name,
            description: config.description,
            type: config.type,
            config,
            status: 'idle',
            steps: [],
            currentStepIndex: 0,
            getCurrentStep: () => {
                const index = this.currentStepIndex.get(id) || 0;
                return workflow.steps[index] || null;
            },
            start: async () => {
                console.log(`启动工作流: ${name}`);
                workflow.status = 'running';
                return workflow;
            },
            pause: async () => {
                console.log(`暂停工作流: ${name}`);
                workflow.status = 'paused';
                return workflow;
            },
            stop: async () => {
                console.log(`停止工作流: ${name}`);
                workflow.status = 'stopped';
                return workflow;
            }
        };
        
        this.workflows.set(id, workflow);
        this.currentStepIndex.set(id, 0);
        return workflow;
    }

    async getWorkflow(id: string): Promise<any | null> {
        console.log(`获取工作流: ${id}`);
        return this.workflows.get(id) || null;
    }

    async getAllWorkflows(): Promise<any[]> {
        console.log('获取所有工作流');
        return Array.from(this.workflows.values());
    }

    async updateWorkflow(id: string, config: any): Promise<any> {
        console.log(`更新工作流: ${id}`);
        const workflow = this.workflows.get(id);
        if (workflow) {
            workflow.name = config.name;
            workflow.description = config.description;
            workflow.config = config;
        }
        return workflow;
    }

    async removeWorkflow(id: string): Promise<boolean> {
        console.log(`删除工作流: ${id}`);
        this.currentStepIndex.delete(id);
        return this.workflows.delete(id);
    }

    async addWorkflowStep(id: string, step: any): Promise<any> {
        console.log(`添加工作流步骤: ${id} - ${step.name}`);
        const workflow = this.workflows.get(id);
        if (workflow) {
            workflow.steps.push(step);
        }
        return workflow;
    }

    async startWorkflow(id: string): Promise<any> {
        console.log(`启动工作流: ${id}`);
        const workflow = this.workflows.get(id);
        if (workflow) {
            await workflow.start();
        }
        return workflow;
    }

    async pauseWorkflow(id: string): Promise<any> {
        console.log(`暂停工作流: ${id}`);
        const workflow = this.workflows.get(id);
        if (workflow) {
            await workflow.pause();
        }
        return workflow;
    }

    async stopWorkflow(id: string): Promise<any> {
        console.log(`停止工作流: ${id}`);
        const workflow = this.workflows.get(id);
        if (workflow) {
            await workflow.stop();
        }
        return workflow;
    }

    async executeCurrentStep(id: string): Promise<any> {
        console.log(`执行当前步骤: ${id}`);
        const workflow = this.workflows.get(id);
        if (!workflow) {
            return null;
        }

        const currentIndex = this.currentStepIndex.get(id) || 0;
        const currentStep = workflow.steps[currentIndex];
        
        if (!currentStep) {
            console.log(`没有找到当前步骤: ${id} - ${currentIndex}`);
            return null;
        }

        console.log(`执行步骤: ${currentStep.name}`);
        const result = await currentStep.execute();
        
        // 执行成功后，移动到下一步
        this.currentStepIndex.set(id, currentIndex + 1);
        
        return result;
    }

    async retryCurrentStep(id: string): Promise<any> {
        console.log(`重试当前步骤: ${id}`);
        const workflow = this.workflows.get(id);
        if (!workflow) {
            return null;
        }

        const currentIndex = this.currentStepIndex.get(id) || 0;
        const currentStep = workflow.steps[currentIndex];
        
        if (!currentStep) {
            console.log(`没有找到当前步骤: ${id} - ${currentIndex}`);
            return null;
        }

        console.log(`重试步骤: ${currentStep.name}`);
        return await currentStep.execute();
    }

    async skipCurrentStep(id: string): Promise<any> {
        console.log(`跳过当前步骤: ${id}`);
        const workflow = this.workflows.get(id);
        if (!workflow) {
            return null;
        }

        const currentIndex = this.currentStepIndex.get(id) || 0;
        
        // 跳过当前步骤，移动到下一步
        this.currentStepIndex.set(id, currentIndex + 1);
        
        return workflow;
    }
}

// 模拟 AgentManager 类
class MockAgentManager {
    private agents: Map<string, any> = new Map();

    constructor() {
        console.log('创建 MockAgentManager 实例');
    }

    async getAgentByRole(role: string): Promise<any> {
        console.log(`获取代理: ${role}`);
        return {
            id: `agent-${Math.random().toString(36).substring(2, 9)}`,
            name: `${role} Agent`,
            role: role,
            processRequest: async (input: any) => {
                console.log(`处理请求: ${JSON.stringify(input)}`);
                return {
                    agentId: `agent-${Math.random().toString(36).substring(2, 9)}`,
                    timestamp: new Date().toISOString(),
                    status: 'success',
                    message: `处理成功: ${input.message || '无消息'}`,
                    response: `响应: ${input.message || '无消息'}`,
                    actions: [],
                    metadata: {}
                };
            }
        };
    }
}

// 模拟 WorkflowStepFactory 类
class MockWorkflowStepFactory {
    constructor(private agentManager: MockAgentManager) {
        console.log('创建 MockWorkflowStepFactory 实例');
    }

    async createRequirementsAnalysisStep(name: string, description: string, inputData: any): Promise<any> {
        console.log(`创建需求分析步骤: ${name}`);
        const agent = await this.agentManager.getAgentByRole('PRODUCT_MANAGER');
        return {
            id: `step-${Math.random().toString(36).substring(2, 9)}`,
            name,
            description,
            agent,
            inputData,
            execute: async () => {
                console.log(`执行步骤: ${name}`);
                return await agent.processRequest(inputData);
            }
        };
    }

    async createArchitectureDesignStep(name: string, description: string, inputData: any): Promise<any> {
        console.log(`创建架构设计步骤: ${name}`);
        const agent = await this.agentManager.getAgentByRole('ARCHITECT');
        return {
            id: `step-${Math.random().toString(36).substring(2, 9)}`,
            name,
            description,
            agent,
            inputData,
            execute: async () => {
                console.log(`执行步骤: ${name}`);
                return await agent.processRequest(inputData);
            }
        };
    }

    async createCodeGenerationStep(name: string, description: string, inputData: any): Promise<any> {
        console.log(`创建代码生成步骤: ${name}`);
        const agent = await this.agentManager.getAgentByRole('DEVELOPER');
        return {
            id: `step-${Math.random().toString(36).substring(2, 9)}`,
            name,
            description,
            agent,
            inputData,
            execute: async () => {
                console.log(`执行步骤: ${name}`);
                return await agent.processRequest(inputData);
            }
        };
    }

    async createErrorStep(name: string, description: string, inputData: any): Promise<any> {
        console.log(`创建错误步骤: ${name}`);
        const agent = await this.agentManager.getAgentByRole('DEVELOPER');
        return {
            id: `step-${Math.random().toString(36).substring(2, 9)}`,
            name,
            description,
            agent,
            inputData,
            execute: async () => {
                console.log(`执行步骤: ${name} - 模拟错误`);
                throw new Error('模拟步骤执行错误');
            }
        };
    }
}

// 运行测试
async function runTest() {
    try {
        console.log('准备测试 WorkflowExecutor...');
        
        // 检查文件是否存在
        const filePath = path.resolve(__dirname, '../../workflows/WorkflowExecutor.ts');
        if (!fs.existsSync(filePath)) {
            console.error(`文件不存在: ${filePath}`);
            const tsFilePath = path.resolve(__dirname, '../../workflows/WorkflowExecutor.ts');
            if (fs.existsSync(tsFilePath)) {
                console.error(`找到 TypeScript 文件: ${tsFilePath}`);
                console.error('请先编译 TypeScript 文件');
            }
            process.exit(1);
        }
        
        // 动态导入 WorkflowExecutor 类
        const { WorkflowExecutor } = await import('../../workflows/WorkflowExecutor');
        
        // 创建模拟实例
        const workflowManager = new MockWorkflowManager();
        const agentManager = new MockAgentManager();
        const workflowStepFactory = new MockWorkflowStepFactory(agentManager);
        
        // 创建 WorkflowExecutor 实例
        const workflowExecutor = new WorkflowExecutor(workflowManager as any);
        
        // 测试创建工作流
        console.log('\n测试创建工作流...');
        const workflow1 = await workflowManager.createWorkflow('测试工作流', {
            name: '测试工作流',
            description: '用于测试的工作流',
            type: 'test',
            settings: { 
                continueOnError: false 
            },
            inputData: { 
                description: '这是一个测试项目' 
            }
        });
        
        console.log(`创建的工作流: ${workflow1.id} - ${workflow1.name}`);
        
        // 添加步骤
        console.log('\n测试添加步骤...');
        const step1 = await workflowStepFactory.createRequirementsAnalysisStep(
            '需求分析',
            '分析项目需求',
            { message: '分析项目需求' }
        );
        
        const step2 = await workflowStepFactory.createArchitectureDesignStep(
            '架构设计',
            '设计系统架构',
            { message: '设计系统架构' }
        );
        
        const step3 = await workflowStepFactory.createCodeGenerationStep(
            '代码生成',
            '生成代码',
            { message: '生成代码' }
        );
        
        await workflowManager.addWorkflowStep(workflow1.id, step1);
        await workflowManager.addWorkflowStep(workflow1.id, step2);
        await workflowManager.addWorkflowStep(workflow1.id, step3);
        
        // 测试执行工作流
        console.log('\n测试执行工作流...');
        await workflowExecutor.executeWorkflow(workflow1.id);
        
        // 等待一段时间，让工作流执行
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 测试暂停工作流
        console.log('\n测试暂停工作流...');
        await workflowExecutor.pauseWorkflow(workflow1.id);
        
        // 等待一段时间
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 测试继续执行工作流
        console.log('\n测试继续执行工作流...');
        await workflowExecutor.executeWorkflow(workflow1.id);
        
        // 等待一段时间
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 测试停止工作流
        console.log('\n测试停止工作流...');
        await workflowExecutor.stopWorkflow(workflow1.id);
        
        // 创建一个包含错误步骤的工作流
        console.log('\n测试创建包含错误步骤的工作流...');
        const workflow2 = await workflowManager.createWorkflow('错误测试工作流', {
            name: '错误测试工作流',
            description: '用于测试错误处理的工作流',
            type: 'test',
            settings: { 
                continueOnError: false 
            },
            inputData: { 
                description: '这是一个测试错误处理的项目' 
            }
        });
        
        console.log(`创建的工作流: ${workflow2.id} - ${workflow2.name}`);
        
        // 添加步骤，包括一个会产生错误的步骤
        console.log('\n测试添加步骤（包含错误步骤）...');
        const errorStep1 = await workflowStepFactory.createRequirementsAnalysisStep(
            '需求分析',
            '分析项目需求',
            { message: '分析项目需求' }
        );
        
        const errorStep2 = await workflowStepFactory.createErrorStep(
            '错误步骤',
            '这个步骤会产生错误',
            { message: '产生错误' }
        );
        
        const errorStep3 = await workflowStepFactory.createCodeGenerationStep(
            '代码生成',
            '生成代码',
            { message: '生成代码' }
        );
        
        await workflowManager.addWorkflowStep(workflow2.id, errorStep1);
        await workflowManager.addWorkflowStep(workflow2.id, errorStep2);
        await workflowManager.addWorkflowStep(workflow2.id, errorStep3);
        
        // 测试执行包含错误步骤的工作流
        console.log('\n测试执行包含错误步骤的工作流...');
        try {
            await workflowExecutor.executeWorkflow(workflow2.id);
            
            // 等待一段时间，让工作流执行
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // 测试重试当前步骤
            console.log('\n测试重试当前步骤...');
            try {
                await workflowExecutor.retryCurrentStep(workflow2.id);
            } catch (error: any) {
                console.log('重试步骤时捕获到错误:', error.message);
            }
            
            // 测试跳过当前步骤
            console.log('\n测试跳过当前步骤...');
            await workflowExecutor.skipCurrentStep(workflow2.id);
            
            // 继续执行工作流
            console.log('\n测试跳过错误步骤后继续执行工作流...');
            await workflowExecutor.executeWorkflow(workflow2.id);
        } catch (error: any) {
            console.log('执行工作流时捕获到错误:', error.message);
        }
        
        // 测试删除工作流
        console.log('\n测试删除工作流...');
        const deleteResult1 = await workflowManager.removeWorkflow(workflow1.id);
        const deleteResult2 = await workflowManager.removeWorkflow(workflow2.id);
        
        console.log(`删除工作流结果: ${deleteResult1}, ${deleteResult2}`);
        
        console.log('\n测试完成!');
        
        // 退出程序
        process.exit(0);
    } catch (error) {
        console.error('测试失败:', error);
        process.exit(1);
    }
}

// 运行测试
runTest(); 