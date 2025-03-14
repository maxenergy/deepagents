import * as path from 'path';
import * as fs from 'fs';
import mockRequire = require('mock-require');

console.log('开始测试 WorkflowEngine...');

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
}

// 模拟 WorkflowExecutor 类
class MockWorkflowExecutor {
    constructor(private workflowManager: MockWorkflowManager) {
        console.log('创建 MockWorkflowExecutor 实例');
    }

    async executeWorkflow(workflowId: string): Promise<void> {
        console.log(`执行工作流: ${workflowId}`);
        const workflow = await this.workflowManager.getWorkflow(workflowId);
        if (workflow) {
            await workflow.start();
        }
    }

    async pauseWorkflow(workflowId: string): Promise<void> {
        console.log(`暂停工作流: ${workflowId}`);
        const workflow = await this.workflowManager.getWorkflow(workflowId);
        if (workflow) {
            await workflow.pause();
        }
    }

    async stopWorkflow(workflowId: string): Promise<void> {
        console.log(`停止工作流: ${workflowId}`);
        const workflow = await this.workflowManager.getWorkflow(workflowId);
        if (workflow) {
            await workflow.stop();
        }
    }

    async retryCurrentStep(workflowId: string): Promise<void> {
        console.log(`重试当前步骤: ${workflowId}`);
        const workflow = await this.workflowManager.getWorkflow(workflowId);
        if (workflow) {
            console.log(`重试工作流 ${workflowId} 的当前步骤`);
        }
    }

    async skipCurrentStep(workflowId: string): Promise<void> {
        console.log(`跳过当前步骤: ${workflowId}`);
        const workflow = await this.workflowManager.getWorkflow(workflowId);
        if (workflow) {
            console.log(`跳过工作流 ${workflowId} 的当前步骤`);
        }
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

// 模拟 WorkflowTemplateFactory 类
class MockWorkflowTemplateFactory {
    constructor(
        private workflowManager: MockWorkflowManager,
        private workflowStepFactory: any
    ) {
        console.log('创建 MockWorkflowTemplateFactory 实例');
    }

    async createFullDevelopmentWorkflow(name: string, description: string, inputData: any): Promise<any> {
        console.log(`创建完整开发工作流: ${name}`);
        const workflow = await this.workflowManager.createWorkflow(name, {
            name,
            description,
            type: 'full_development',
            settings: {},
            inputData
        });

        // 添加步骤
        const requirementsStep = await this.workflowStepFactory.createRequirementsAnalysisStep(
            '需求分析',
            '分析项目需求',
            { message: inputData.description || '分析项目需求' }
        );
        await this.workflowManager.addWorkflowStep(workflow.id, requirementsStep);

        const architectureStep = await this.workflowStepFactory.createArchitectureDesignStep(
            '架构设计',
            '设计系统架构',
            { message: '基于需求设计架构' }
        );
        await this.workflowManager.addWorkflowStep(workflow.id, architectureStep);

        const codeGenStep = await this.workflowStepFactory.createCodeGenerationStep(
            '代码生成',
            '生成代码',
            { message: '基于架构生成代码' }
        );
        await this.workflowManager.addWorkflowStep(workflow.id, codeGenStep);

        return workflow;
    }

    async createRequirementsAnalysisWorkflow(name: string, description: string, inputData: any): Promise<any> {
        console.log(`创建需求分析工作流: ${name}`);
        const workflow = await this.workflowManager.createWorkflow(name, {
            name,
            description,
            type: 'requirements_analysis',
            settings: {},
            inputData
        });

        // 添加步骤
        const requirementsStep = await this.workflowStepFactory.createRequirementsAnalysisStep(
            '需求分析',
            '分析项目需求',
            { message: inputData.description || '分析项目需求' }
        );
        await this.workflowManager.addWorkflowStep(workflow.id, requirementsStep);

        return workflow;
    }

    async createArchitectureDesignWorkflow(name: string, description: string, inputData: any): Promise<any> {
        console.log(`创建架构设计工作流: ${name}`);
        const workflow = await this.workflowManager.createWorkflow(name, {
            name,
            description,
            type: 'architecture_design',
            settings: {},
            inputData
        });

        // 添加步骤
        const architectureStep = await this.workflowStepFactory.createArchitectureDesignStep(
            '架构设计',
            '设计系统架构',
            { message: inputData.description || '设计系统架构' }
        );
        await this.workflowManager.addWorkflowStep(workflow.id, architectureStep);

        return workflow;
    }

    async createCodeGenerationWorkflow(name: string, description: string, inputData: any): Promise<any> {
        console.log(`创建代码生成工作流: ${name}`);
        const workflow = await this.workflowManager.createWorkflow(name, {
            name,
            description,
            type: 'code_generation',
            settings: {},
            inputData
        });

        // 添加步骤
        const codeGenStep = await this.workflowStepFactory.createCodeGenerationStep(
            '代码生成',
            '生成代码',
            { message: inputData.description || '生成代码' }
        );
        await this.workflowManager.addWorkflowStep(workflow.id, codeGenStep);

        return workflow;
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
}

// 运行测试
async function runTest() {
    try {
        console.log('准备测试 WorkflowEngine...');
        
        // 检查文件是否存在
        const filePath = path.resolve(__dirname, '../../workflows/WorkflowEngine.ts');
        if (!fs.existsSync(filePath)) {
            console.error(`文件不存在: ${filePath}`);
            const tsFilePath = path.resolve(__dirname, '../../workflows/WorkflowEngine.ts');
            if (fs.existsSync(tsFilePath)) {
                console.error(`找到 TypeScript 文件: ${tsFilePath}`);
                console.error('请先编译 TypeScript 文件');
            }
            process.exit(1);
        }
        
        // 动态导入 WorkflowEngine 类
        const { WorkflowEngine } = await import('../../workflows/WorkflowEngine');
        
        // 创建模拟实例
        const workflowManager = new MockWorkflowManager();
        const agentManager = new MockAgentManager();
        const workflowExecutor = new MockWorkflowExecutor(workflowManager);
        const workflowStepFactory = new MockWorkflowStepFactory(agentManager);
        const workflowTemplateFactory = new MockWorkflowTemplateFactory(workflowManager, workflowStepFactory);
        
        // 创建 WorkflowEngine 实例
        const workflowEngine = WorkflowEngine.getInstance(workflowManager as any);
        
        // 测试创建工作流
        console.log('\n测试创建工作流...');
        const workflow1 = await workflowEngine.createWorkflow('测试工作流', {
            name: '测试工作流',
            description: '用于测试的完整开发工作流',
            type: 'full_development',
            settings: { 
                continueOnError: false 
            },
            inputData: { 
                description: '这是一个测试项目，用于验证工作流引擎功能' 
            }
        });
        
        console.log(`创建的工作流: ${workflow1.id} - ${workflow1.name}`);
        
        // 测试获取工作流
        console.log('\n测试获取工作流...');
        const retrievedWorkflow = workflowEngine.getWorkflow(workflow1.id);
        
        if (retrievedWorkflow) {
            console.log(`获取的工作流: ${retrievedWorkflow.id} - ${retrievedWorkflow.name}`);
        } else {
            console.error('获取工作流失败');
        }
        
        // 测试获取所有工作流
        console.log('\n测试获取所有工作流...');
        const allWorkflows = await workflowEngine.getWorkflows();
        
        console.log(`工作流数量: ${allWorkflows.length}`);
        allWorkflows.forEach((workflow: any) => {
            console.log(`- ${workflow.id} - ${workflow.name}`);
        });
        
        // 测试启动工作流
        console.log('\n测试启动工作流...');
        await workflowEngine.startWorkflow(workflow1.id);
        
        // 等待一段时间，让工作流执行
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 测试暂停工作流
        console.log('\n测试暂停工作流...');
        await workflowEngine.pauseWorkflow(workflow1.id);
        
        // 等待一段时间
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 测试继续执行工作流
        console.log('\n测试继续执行工作流...');
        await workflowEngine.startWorkflow(workflow1.id);
        
        // 等待一段时间
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 测试停止工作流
        console.log('\n测试停止工作流...');
        await workflowEngine.stopWorkflow(workflow1.id);
        
        // 测试添加工作流步骤
        console.log('\n测试添加工作流步骤...');
        const step1 = await workflowStepFactory.createRequirementsAnalysisStep(
            '需求分析',
            '分析项目需求',
            { message: '分析项目需求' }
        );
        
        await workflowEngine.addWorkflowStep(workflow1.id, step1);
        
        // 测试更新工作流
        console.log('\n测试更新工作流...');
        await workflowEngine.updateWorkflow(workflow1.id, {
            name: '更新后的测试工作流',
            description: '更新后的描述',
            type: 'full_development',
            settings: { 
                continueOnError: true 
            },
            inputData: { 
                description: '更新后的测试项目' 
            }
        });
        
        // 测试删除工作流
        console.log('\n测试删除工作流...');
        const deleteResult = await workflowEngine.removeWorkflow(workflow1.id);
        
        console.log(`删除工作流结果: ${deleteResult}`);
        
        const allWorkflowsAfterDelete = await workflowEngine.getWorkflows();
        
        console.log(`删除后的工作流数量: ${allWorkflowsAfterDelete.length}`);
        
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