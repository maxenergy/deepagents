import * as path from 'path';
import * as fs from 'fs';
import mockRequire = require('mock-require');

// 首先安装 mock-require 模块
// npm install --save-dev mock-require

console.log('脚本开始执行');

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
        showInputBox: (options?: any) => {
            console.log(`[INPUT] ${options?.prompt || 'Enter value:'}`);
            const defaultValue = 'Test Workflow';
            console.log(`[INPUT] 返回默认值: ${defaultValue}`);
            return Promise.resolve(defaultValue);
        },
        showQuickPick: (items: any[], options?: any) => {
            console.log(`[QUICK_PICK] ${options?.placeHolder || 'Select an item:'}`);
            const itemLabels = items.map(item => typeof item === 'string' ? item : item.label);
            console.log(`[QUICK_PICK] 可用选项: ${itemLabels.join(', ')}`);
            const selected = items[0];
            console.log(`[QUICK_PICK] 选择: ${typeof selected === 'string' ? selected : selected.label}`);
            return Promise.resolve(selected);
        },
        createOutputChannel: (name: string) => {
            console.log(`[OUTPUT_CHANNEL] 创建输出通道: ${name}`);
            return {
                appendLine: (message: string) => {
                    console.log(`[OUTPUT:${name}] ${message}`);
                },
                show: () => {
                    console.log(`[OUTPUT:${name}] 显示输出通道`);
                },
                dispose: () => {
                    console.log(`[OUTPUT:${name}] 释放输出通道`);
                }
            };
        }
    },
    commands: {
        registerCommand: (command: string, callback: (...args: any[]) => any) => {
            console.log(`[REGISTER_COMMAND] ${command}`);
            registeredCommands[command] = callback;
            return { dispose: () => {} };
        },
        executeCommand: async (command: string, ...args: any[]) => {
            console.log(`[EXECUTE_COMMAND] ${command} 参数:`, args);
            if (registeredCommands[command]) {
                try {
                    const result = await registeredCommands[command](...args);
                    console.log(`[EXECUTE_COMMAND] ${command} 执行结果:`, result);
                    return result;
                } catch (error) {
                    console.error(`[EXECUTE_COMMAND] ${command} 执行出错:`, error);
                    throw error;
                }
            } else {
                console.log(`[EXECUTE_COMMAND] 命令未注册: ${command}`);
            }
            return undefined;
        }
    },
    ExtensionContext: class {
        subscriptions: any[] = [];
        workspaceState = {
            get: (key: string) => {
                console.log(`[CONTEXT] 获取工作区状态: ${key}`);
                return null;
            },
            update: (key: string, value: any) => {
                console.log(`[CONTEXT] 更新工作区状态: ${key} = ${JSON.stringify(value)}`);
                return Promise.resolve();
            }
        };
        globalState = {
            get: (key: string) => {
                console.log(`[CONTEXT] 获取全局状态: ${key}`);
                return null;
            },
            update: (key: string, value: any) => {
                console.log(`[CONTEXT] 更新全局状态: ${key} = ${JSON.stringify(value)}`);
                return Promise.resolve();
            }
        };
        extensionPath = '/path/to/extension';
        storagePath = '/path/to/storage';
        logPath = '/path/to/logs';
    }
};

// 存储注册的命令
const registeredCommands: Record<string, (...args: any[]) => any> = {};

// 使用 mock-require 模拟 vscode 模块
mockRequire('vscode', vscode);

// 模拟 WorkflowManager
class MockWorkflowManager {
    private workflows: any[] = [];

    constructor() {
        console.log('创建 MockWorkflowManager 实例');
    }

    async createWorkflow(name: string, description: string, type: string, config: any = {}) {
        console.log(`创建工作流: ${name}, 类型: ${type}, 描述: ${description}`);
        const workflow = {
            id: `workflow-${Date.now()}`,
            name,
            description,
            type,
            config,
            status: 'running',
            currentStepIndex: 0,
            stages: [],
            addStage: (stage: any) => {
                console.log(`添加阶段到工作流 ${name}: ${stage.name}`);
                workflow.stages.push(stage);
                return stage;
            },
            start: async () => {
                console.log(`启动工作流: ${name}`);
                workflow.status = 'running';
                workflow.currentStepIndex = 0;
                return true;
            },
            pause: async () => {
                console.log(`暂停工作流: ${name}`);
                workflow.status = 'paused';
                return true;
            },
            stop: async () => {
                console.log(`停止工作流: ${name}`);
                workflow.status = 'stopped';
                return true;
            },
            retry: async () => {
                console.log(`重试工作流: ${name}`);
                workflow.status = 'running';
                return true;
            },
            getCurrentStep: () => {
                console.log(`获取当前步骤, 索引: ${workflow.currentStepIndex}`);
                if (workflow.stages.length === 0) {
                    return null;
                }
                if (workflow.currentStepIndex >= workflow.stages.length) {
                    return null;
                }
                return workflow.stages[workflow.currentStepIndex];
            },
            moveToNextStep: () => {
                console.log(`移动到下一步骤, 当前索引: ${workflow.currentStepIndex}`);
                if (workflow.currentStepIndex < workflow.stages.length - 1) {
                    workflow.currentStepIndex++;
                    return true;
                }
                return false;
            },
            isCompleted: () => {
                return workflow.currentStepIndex >= workflow.stages.length;
            }
        };
        this.workflows.push(workflow);
        return workflow;
    }

    async updateWorkflow(workflow: any) {
        console.log(`更新工作流: ${workflow.id}`);
        const index = this.workflows.findIndex(w => w.id === workflow.id);
        if (index !== -1) {
            this.workflows[index] = workflow;
            return workflow;
        }
        return null;
    }

    async getWorkflow(id: string) {
        console.log(`获取工作流: ${id}`);
        return this.workflows.find(w => w.id === id) || null;
    }

    async getAllWorkflows() {
        console.log(`获取所有工作流, 数量: ${this.workflows.length}`);
        return [...this.workflows];
    }

    async getWorkflowsByStatus(status: string) {
        console.log(`获取状态为 ${status} 的工作流`);
        const filteredWorkflows = this.workflows.filter(w => w.status === status);
        console.log(`找到 ${filteredWorkflows.length} 个工作流`);
        return filteredWorkflows;
    }

    async executeWorkflow(id: string) {
        console.log(`执行工作流: ${id}`);
        const workflow = await this.getWorkflow(id);
        if (workflow) {
            workflow.status = 'running';
            console.log(`工作流 ${id} 状态更新为: running`);
            return true;
        }
        console.log(`工作流 ${id} 不存在，无法执行`);
        return false;
    }

    async pauseWorkflow(id: string) {
        console.log(`暂停工作流: ${id}`);
        const workflow = await this.getWorkflow(id);
        if (workflow) {
            workflow.status = 'paused';
            console.log(`工作流 ${id} 状态更新为: paused`);
            return true;
        }
        console.log(`工作流 ${id} 不存在，无法暂停`);
        return false;
    }

    async stopWorkflow(id: string) {
        console.log(`停止工作流: ${id}`);
        const workflow = await this.getWorkflow(id);
        if (workflow) {
            workflow.status = 'stopped';
            console.log(`工作流 ${id} 状态更新为: stopped`);
            return true;
        }
        console.log(`工作流 ${id} 不存在，无法停止`);
        return false;
    }

    async retryWorkflow(id: string) {
        console.log(`重试工作流: ${id}`);
        const workflow = await this.getWorkflow(id);
        if (workflow) {
            workflow.status = 'running';
            console.log(`工作流 ${id} 状态更新为: running`);
            return true;
        }
        console.log(`工作流 ${id} 不存在，无法重试`);
        return false;
    }
}

// 模拟 AgentManager
class MockAgentManager {
    private agents: any[] = [];

    constructor() {
        console.log('创建 MockAgentManager 实例');
    }

    async getAgentByRole(role: string) {
        console.log(`获取角色为 ${role} 的代理`);
        return {
            id: `agent-${role}`,
            name: `${role} Agent`,
            role,
            processRequest: async (input: any) => {
                console.log(`代理 ${role} 处理请求: ${JSON.stringify(input)}`);
                return {
                    status: 'success',
                    message: `处理完成: ${input.message || 'No message'}`
                };
            }
        };
    }
}

// 模拟 WorkflowStepFactory
class MockWorkflowStepFactory {
    constructor(private agentManager: MockAgentManager) {
        console.log('创建 MockWorkflowStepFactory 实例');
    }

    createRequirementsAnalysisStep(name: string, description: string, input: any = {}) {
        console.log(`创建需求分析步骤: ${name}, 描述: ${description}`);
        return {
            name,
            description,
            input,
            type: 'requirements_analysis',
            execute: async () => {
                console.log(`执行需求分析步骤: ${name}`);
                const agent = await this.agentManager.getAgentByRole('PRODUCT_MANAGER');
                return await agent.processRequest(input);
            }
        };
    }

    createArchitectureDesignStep(name: string, description: string, input: any = {}) {
        console.log(`创建架构设计步骤: ${name}, 描述: ${description}`);
        return {
            name,
            description,
            input,
            type: 'architecture_design',
            execute: async () => {
                console.log(`执行架构设计步骤: ${name}`);
                const agent = await this.agentManager.getAgentByRole('ARCHITECT');
                return await agent.processRequest(input);
            }
        };
    }
}

// 模拟 WorkflowTemplateFactory
class MockWorkflowTemplateFactory {
    constructor(
        private workflowManager: MockWorkflowManager,
        private workflowStepFactory: MockWorkflowStepFactory
    ) {
        console.log('创建 MockWorkflowTemplateFactory 实例');
    }

    async createFullDevelopmentWorkflow(name: string, description: string, input: any = {}) {
        console.log(`创建完整开发工作流: ${name}, 描述: ${description}`);
        const workflow = await this.workflowManager.createWorkflow(name, description, 'full_development', {});
        
        // 添加步骤
        workflow.addStage(this.workflowStepFactory.createRequirementsAnalysisStep(
            '需求分析',
            '分析项目需求',
            { message: input.description || '分析项目需求' }
        ));
        
        workflow.addStage(this.workflowStepFactory.createArchitectureDesignStep(
            '架构设计',
            '设计系统架构',
            { message: '基于需求设计架构' }
        ));
        
        return workflow;
    }

    async createRequirementsAnalysisWorkflow(name: string, description: string, input: any = {}) {
        console.log(`创建需求分析工作流: ${name}, 描述: ${description}`);
        const workflow = await this.workflowManager.createWorkflow(name, description, 'requirements_analysis', {});
        
        workflow.addStage(this.workflowStepFactory.createRequirementsAnalysisStep(
            '需求分析',
            '分析项目需求',
            { message: input.description || '分析项目需求' }
        ));
        
        return workflow;
    }

    async createArchitectureDesignWorkflow(name: string, description: string, input: any = {}) {
        console.log(`创建架构设计工作流: ${name}, 描述: ${description}`);
        const workflow = await this.workflowManager.createWorkflow(name, description, 'architecture_design', {});
        
        workflow.addStage(this.workflowStepFactory.createArchitectureDesignStep(
            '架构设计',
            '设计系统架构',
            { message: input.description || '设计系统架构' }
        ));
        
        return workflow;
    }

    async createCodeGenerationWorkflow(name: string, description: string, input: any = {}) {
        console.log(`创建代码生成工作流: ${name}, 描述: ${description}`);
        const workflow = await this.workflowManager.createWorkflow(name, description, 'code_generation', {});
        return workflow;
    }

    async createTestingWorkflow(name: string, description: string, input: any = {}) {
        console.log(`创建测试工作流: ${name}, 描述: ${description}`);
        const workflow = await this.workflowManager.createWorkflow(name, description, 'testing', {});
        return workflow;
    }

    async createDeploymentWorkflow(name: string, description: string, input: any = {}) {
        console.log(`创建部署工作流: ${name}, 描述: ${description}`);
        const workflow = await this.workflowManager.createWorkflow(name, description, 'deployment', {});
        return workflow;
    }

    async createDocumentationWorkflow(name: string, description: string, input: any = {}) {
        console.log(`创建文档工作流: ${name}, 描述: ${description}`);
        const workflow = await this.workflowManager.createWorkflow(name, description, 'documentation', {});
        return workflow;
    }
}

// 运行测试
async function runTest() {
    console.log('开始测试 WorkflowCommandHandler');
    
    try {
        // 检查文件是否存在
        const workflowCommandHandlerPath = path.resolve(__dirname, '../../workflows/WorkflowCommandHandler');
        const tsFilePath = `${workflowCommandHandlerPath}.ts`;
        
        if (!fs.existsSync(tsFilePath)) {
            console.error(`文件不存在: ${tsFilePath}`);
            return;
        }
        
        console.log(`找到文件: ${tsFilePath}`);
        
        // 创建模拟对象
        const mockWorkflowManager = new MockWorkflowManager();
        const mockAgentManager = new MockAgentManager();
        const mockWorkflowStepFactory = new MockWorkflowStepFactory(mockAgentManager);
        const mockWorkflowTemplateFactory = new MockWorkflowTemplateFactory(
            mockWorkflowManager,
            mockWorkflowStepFactory
        );
        
        console.log('准备导入 WorkflowCommandHandler');
        
        // 动态导入 WorkflowCommandHandler
        try {
            const { WorkflowCommandHandler } = await import('../../workflows/WorkflowCommandHandler');
            console.log('成功导入 WorkflowCommandHandler');
            
            // 创建 WorkflowCommandHandler 实例
            const context = new vscode.ExtensionContext();
            console.log('创建 WorkflowCommandHandler 实例');
            const handler = new WorkflowCommandHandler(
                context,
                mockWorkflowManager,
                mockAgentManager,
                mockWorkflowTemplateFactory
            );
            
            console.log('注册命令');
            
            // 测试创建预定义工作流命令
            console.log('测试 createPredefinedWorkflow 命令');
            await vscode.commands.executeCommand('deepagents.createPredefinedWorkflow');
            
            // 获取所有工作流
            let workflows = await mockWorkflowManager.getAllWorkflows();
            console.log(`创建的工作流数量: ${workflows.length}`);
            workflows.forEach((workflow, index) => {
                console.log(`工作流 ${index + 1}:`);
                console.log(`  ID: ${workflow.id}`);
                console.log(`  名称: ${workflow.name}`);
                console.log(`  类型: ${workflow.type}`);
                console.log(`  状态: ${workflow.status}`);
                console.log(`  阶段数量: ${workflow.stages.length}`);
            });
            
            // 测试暂停工作流命令
            if (workflows.length > 0) {
                console.log('测试 pauseWorkflow 命令');
                await vscode.commands.executeCommand('deepagents.pauseWorkflow', workflows[0].id);
                
                // 检查工作流状态
                let updatedWorkflow = await mockWorkflowManager.getWorkflow(workflows[0].id);
                if (updatedWorkflow) {
                    console.log(`工作流暂停后状态: ${updatedWorkflow.status}`);
                }
                
                // 测试停止工作流命令
                console.log('测试 stopWorkflow 命令');
                await vscode.commands.executeCommand('deepagents.stopWorkflow', workflows[0].id);
                
                // 检查工作流状态
                updatedWorkflow = await mockWorkflowManager.getWorkflow(workflows[0].id);
                if (updatedWorkflow) {
                    console.log(`工作流停止后状态: ${updatedWorkflow.status}`);
                }
                
                // 测试重试工作流命令
                console.log('测试 retryWorkflow 命令');
                await vscode.commands.executeCommand('deepagents.retryWorkflow', workflows[0].id);
                
                // 检查工作流状态
                updatedWorkflow = await mockWorkflowManager.getWorkflow(workflows[0].id);
                if (updatedWorkflow) {
                    console.log(`工作流重试后状态: ${updatedWorkflow.status}`);
                }
            }
        } catch (importError) {
            console.error('导入 WorkflowCommandHandler 失败:', importError);
        }
        
        console.log('测试完成');
    } catch (error) {
        console.error('测试过程中出错:', error);
    }
}

// 运行测试
console.log('准备运行测试');
runTest().catch(error => {
    console.error('运行测试失败:', error);
}); 