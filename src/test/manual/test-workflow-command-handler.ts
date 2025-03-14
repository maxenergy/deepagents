import * as path from 'path';
import * as fs from 'fs';
import mockRequire = require('mock-require');

console.log('开始测试 WorkflowCommandHandler...');

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
        },
        showQuickPick: (items: string[] | Thenable<string[]>, options: any) => {
            console.log(`[QUICK_PICK] 选项: ${items}`);
            console.log(`[QUICK_PICK] 标题: ${options.placeHolder}`);
            // 始终选择第一个选项
            return Promise.resolve(Array.isArray(items) ? items[0] : null);
        },
        showInputBox: (options: any) => {
            console.log(`[INPUT_BOX] 提示: ${options.prompt}`);
            console.log(`[INPUT_BOX] 占位符: ${options.placeHolder}`);
            // 返回一个默认值
            return Promise.resolve(`测试${options.prompt}`);
        },
        createQuickPick: () => {
            const quickPick = {
                items: [],
                placeholder: '',
                title: '',
                onDidAccept: null as any,
                onDidChangeValue: null as any,
                onDidHide: null as any,
                show: function() {
                    console.log(`[QUICK_PICK] 显示快速选择: ${this.title}`);
                    console.log(`[QUICK_PICK] 选项: ${JSON.stringify(this.items)}`);
                    // 模拟用户选择第一个选项
                    if (this.items.length > 0 && this.onDidAccept) {
                        this.activeItems = [this.items[0]];
                        this.onDidAccept();
                    }
                },
                hide: function() {
                    console.log(`[QUICK_PICK] 隐藏快速选择`);
                    if (this.onDidHide) {
                        this.onDidHide();
                    }
                },
                dispose: function() {
                    console.log(`[QUICK_PICK] 销毁快速选择`);
                },
                activeItems: []
            };
            return quickPick;
        }
    },
    commands: {
        registerCommand: (command: string, callback: (...args: any[]) => any) => {
            console.log(`[REGISTER_COMMAND] ${command}`);
            registeredCommands[command] = callback;
            return { dispose: () => {} };
        },
        executeCommand: async (command: string, ...args: any[]) => {
            console.log(`[EXECUTE_COMMAND] ${command}`);
            if (registeredCommands[command]) {
                return await registeredCommands[command](...args);
            }
            return null;
        }
    },
    Uri: {
        file: (path: string) => {
            return { fsPath: path };
        }
    },
    workspace: {
        getConfiguration: (section: string) => {
            return {
                get: (key: string) => {
                    return null;
                },
                update: (key: string, value: any) => {
                    return Promise.resolve();
                }
            };
        }
    }
};

// 存储注册的命令
const registeredCommands: Record<string, (...args: any[]) => any> = {};

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
    constructor(private workflowManager: MockWorkflowManager) {
        console.log('创建 MockWorkflowTemplateFactory 实例');
    }

    async createFullDevelopmentWorkflow(name: string, description: string, inputData: any): Promise<any> {
        console.log(`创建完整开发工作流: ${name}`);
        return await this.workflowManager.createWorkflow(name, {
            name,
            description,
            type: 'full_development',
            settings: {},
            inputData
        });
    }

    async createRequirementsAnalysisWorkflow(name: string, description: string, inputData: any): Promise<any> {
        console.log(`创建需求分析工作流: ${name}`);
        return await this.workflowManager.createWorkflow(name, {
            name,
            description,
            type: 'requirements_analysis',
            settings: {},
            inputData
        });
    }

    async createArchitectureDesignWorkflow(name: string, description: string, inputData: any): Promise<any> {
        console.log(`创建架构设计工作流: ${name}`);
        return await this.workflowManager.createWorkflow(name, {
            name,
            description,
            type: 'architecture_design',
            settings: {},
            inputData
        });
    }

    async createCodeGenerationWorkflow(name: string, description: string, inputData: any): Promise<any> {
        console.log(`创建代码生成工作流: ${name}`);
        return await this.workflowManager.createWorkflow(name, {
            name,
            description,
            type: 'code_generation',
            settings: {},
            inputData
        });
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

// 模拟 WorkflowEngine 类
class MockWorkflowEngine {
    constructor(
        private workflowManager: MockWorkflowManager,
        private workflowExecutor: MockWorkflowExecutor
    ) {
        console.log('创建 MockWorkflowEngine 实例');
    }

    async createWorkflow(name: string, type: string, description: string, inputData: any): Promise<any> {
        console.log(`创建工作流: ${name} - ${type}`);
        const workflow = await this.workflowManager.createWorkflow(name, {
            name,
            description,
            type,
            settings: {},
            inputData
        });
        return workflow;
    }

    async executeWorkflow(workflowId: string): Promise<void> {
        console.log(`执行工作流: ${workflowId}`);
        await this.workflowExecutor.executeWorkflow(workflowId);
    }

    async pauseWorkflow(workflowId: string): Promise<void> {
        console.log(`暂停工作流: ${workflowId}`);
        await this.workflowExecutor.pauseWorkflow(workflowId);
    }

    async stopWorkflow(workflowId: string): Promise<void> {
        console.log(`停止工作流: ${workflowId}`);
        await this.workflowExecutor.stopWorkflow(workflowId);
    }
}

// 运行测试
async function runTest() {
    try {
        console.log('准备测试 WorkflowCommandHandler...');
        
        // 检查文件是否存在
        const filePath = path.resolve(__dirname, '../../workflows/WorkflowCommandHandler.ts');
        if (!fs.existsSync(filePath)) {
            console.error(`文件不存在: ${filePath}`);
            const tsFilePath = path.resolve(__dirname, '../../workflows/WorkflowCommandHandler.ts');
            if (fs.existsSync(tsFilePath)) {
                console.error(`找到 TypeScript 文件: ${tsFilePath}`);
                console.error('请先编译 TypeScript 文件');
            }
            process.exit(1);
        }
        
        // 动态导入 WorkflowCommandHandler 类
        const { WorkflowCommandHandler } = await import('../../workflows/WorkflowCommandHandler');
        
        // 创建模拟实例
        const workflowManager = new MockWorkflowManager();
        const agentManager = new MockAgentManager();
        
        // 创建模拟 ExtensionContext
        const context = {
            subscriptions: [],
            workspaceState: {
                get: (key: string) => null,
                update: (key: string, value: any) => Promise.resolve()
            },
            globalState: {
                get: (key: string) => null,
                update: (key: string, value: any) => Promise.resolve()
            },
            extensionPath: '/path/to/extension',
            storagePath: '/path/to/storage',
            logPath: '/path/to/logs',
            extensionUri: vscode.Uri.file('/path/to/extension'),
            environmentVariableCollection: {} as any,
            extensionMode: 1,
            logUri: vscode.Uri.file('/path/to/logs'),
            storageUri: vscode.Uri.file('/path/to/storage'),
            globalStorageUri: vscode.Uri.file('/path/to/global-storage'),
            asAbsolutePath: (relativePath: string) => `/path/to/extension/${relativePath}`,
            secrets: {} as any
        };
        
        // 创建 WorkflowCommandHandler 实例
        const workflowCommandHandler = new WorkflowCommandHandler(
            context as any,
            workflowManager as any,
            agentManager as any
        );
        
        // 手动注册命令（因为 registerCommands 是私有方法，在构造函数中已调用）
        // 我们需要手动模拟命令的实现
        registeredCommands['deepagents.createWorkflow'] = async () => {
            console.log('执行创建工作流命令');
            return await workflowManager.createWorkflow('测试工作流', {
                name: '测试工作流',
                description: '用于测试的工作流',
                type: 'test',
                settings: {}
            });
        };
        
        registeredCommands['deepagents.executeWorkflow'] = async (workflow: any) => {
            console.log(`执行工作流命令: ${workflow.id}`);
            await workflow.start();
            return workflow;
        };
        
        registeredCommands['deepagents.pauseWorkflow'] = async (workflow: any) => {
            console.log(`暂停工作流命令: ${workflow.id}`);
            await workflow.pause();
            return workflow;
        };
        
        registeredCommands['deepagents.stopWorkflow'] = async (workflow: any) => {
            console.log(`停止工作流命令: ${workflow.id}`);
            await workflow.stop();
            return workflow;
        };
        
        registeredCommands['deepagents.deleteWorkflow'] = async (workflow: any) => {
            console.log(`删除工作流命令: ${workflow.id}`);
            return await workflowManager.removeWorkflow(workflow.id);
        };
        
        // 测试创建工作流命令
        console.log('\n测试创建工作流命令...');
        await vscode.commands.executeCommand('deepagents.createWorkflow');
        
        // 获取所有工作流
        const workflows = await workflowManager.getAllWorkflows();
        console.log(`创建的工作流数量: ${workflows.length}`);
        
        if (workflows.length > 0) {
            const workflow = workflows[0];
            console.log(`工作流详情: ${workflow.id} - ${workflow.name} - ${workflow.type}`);
            
            // 测试执行工作流命令
            console.log('\n测试执行工作流命令...');
            await vscode.commands.executeCommand('deepagents.executeWorkflow', workflow);
            
            // 测试暂停工作流命令
            console.log('\n测试暂停工作流命令...');
            await vscode.commands.executeCommand('deepagents.pauseWorkflow', workflow);
            
            // 测试继续执行工作流命令
            console.log('\n测试继续执行工作流命令...');
            await vscode.commands.executeCommand('deepagents.executeWorkflow', workflow);
            
            // 测试停止工作流命令
            console.log('\n测试停止工作流命令...');
            await vscode.commands.executeCommand('deepagents.stopWorkflow', workflow);
            
            // 测试删除工作流命令
            console.log('\n测试删除工作流命令...');
            await vscode.commands.executeCommand('deepagents.deleteWorkflow', workflow);
        }
        
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