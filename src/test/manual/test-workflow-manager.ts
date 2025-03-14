import * as path from 'path';
import * as fs from 'fs';
import mockRequire = require('mock-require');

console.log('开始测试 WorkflowManager...');

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

// 模拟 StorageManager 类
class MockStorageManager {
    private storages: Map<string, MockStorage> = new Map();

    constructor() {
        console.log('创建 MockStorageManager 实例');
        // 初始化存储
        this.storages.set('workflows', new MockStorage());
    }

    getStorage(namespace: string): MockStorage | null {
        console.log(`获取存储: ${namespace}`);
        return this.storages.get(namespace) || null;
    }
}

// 模拟 Storage 类
class MockStorage {
    private data: Map<string, any> = new Map();

    async get<T>(key: string): Promise<T | null> {
        console.log(`获取数据: ${key}`);
        return this.data.get(key) || null;
    }

    async set<T>(key: string, value: T): Promise<void> {
        console.log(`设置数据: ${key}`);
        this.data.set(key, value);
    }

    async delete(key: string): Promise<boolean> {
        console.log(`删除数据: ${key}`);
        return this.data.delete(key);
    }
}

// 模拟 StorageNamespace 枚举
const StorageNamespace = {
    WORKFLOWS: 'workflows'
};

// 模拟 WorkflowStatus 枚举
const WorkflowStatus = {
    IDLE: 'idle',
    RUNNING: 'running',
    PAUSED: 'paused',
    COMPLETED: 'completed',
    ERROR: 'error',
    STOPPED: 'stopped'
};

// 模拟 IWorkflowStep 接口
interface IWorkflowStep {
    id: string;
    name: string;
    description: string;
    execute: () => Promise<any>;
}

// 模拟 IWorkflowConfig 接口
interface IWorkflowConfig {
    name: string;
    description: string;
    type: string;
    settings: any;
}

// 模拟工作流步骤
class MockWorkflowStep implements IWorkflowStep {
    public id: string;
    public active: boolean = false;
    public completed: boolean = false;
    
    constructor(
        public name: string,
        public description: string,
        private shouldFail: boolean = false,
        private executionDelay: number = 100
    ) {
        this.id = `step-${Math.random().toString(36).substring(2, 9)}`;
    }

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

// 运行测试
async function runTest() {
    try {
        console.log('准备测试 WorkflowManager...');
        
        // 动态导入 WorkflowManager 类
        const { WorkflowManager } = await import('../../workflows/WorkflowManager');
        
        // 创建 MockStorageManager 实例
        const storageManager = new MockStorageManager();
        
        // 创建 WorkflowManager 实例
        const workflowManager = new WorkflowManager(storageManager as any);
        
        // 测试创建工作流
        console.log('\n测试创建工作流...');
        const workflow1 = await workflowManager.createWorkflow('测试工作流 1', {
            name: '测试工作流 1',
            description: '用于测试的工作流',
            type: 'test',
            settings: { continueOnError: false }
        });
        
        console.log(`创建的工作流: ${workflow1.id} - ${workflow1.name}`);
        
        // 测试获取工作流
        console.log('\n测试获取工作流...');
        const retrievedWorkflow = await workflowManager.getWorkflow(workflow1.id);
        
        if (retrievedWorkflow) {
            console.log(`获取的工作流: ${retrievedWorkflow.id} - ${retrievedWorkflow.name}`);
        } else {
            console.error('获取工作流失败');
        }
        
        // 测试获取所有工作流
        console.log('\n测试获取所有工作流...');
        const allWorkflows = await workflowManager.getAllWorkflows();
        
        console.log(`工作流数量: ${allWorkflows.length}`);
        allWorkflows.forEach(workflow => {
            console.log(`- ${workflow.id} - ${workflow.name}`);
        });
        
        // 测试更新工作流
        console.log('\n测试更新工作流...');
        const updatedWorkflow = await workflowManager.updateWorkflow(workflow1.id, {
            name: '更新后的测试工作流 1',
            description: '更新后的描述',
            type: 'test',
            settings: { continueOnError: true }
        });
        
        console.log(`更新后的工作流: ${updatedWorkflow.id} - ${updatedWorkflow.name}`);
        
        // 测试添加工作流步骤
        console.log('\n测试添加工作流步骤...');
        const step1 = new MockWorkflowStep('步骤 1', '第一个步骤');
        const step2 = new MockWorkflowStep('步骤 2', '第二个步骤');
        const step3 = new MockWorkflowStep('步骤 3', '第三个步骤', true); // 这个步骤会失败
        
        await workflowManager.addWorkflowStep(workflow1.id, step1);
        await workflowManager.addWorkflowStep(workflow1.id, step2);
        await workflowManager.addWorkflowStep(workflow1.id, step3);
        
        const workflowWithSteps = await workflowManager.getWorkflow(workflow1.id);
        
        if (workflowWithSteps) {
            console.log(`工作流步骤数量: ${workflowWithSteps.steps.length}`);
            workflowWithSteps.steps.forEach(step => {
                console.log(`- ${step.id} - ${step.name}`);
            });
        }
        
        // 测试移除工作流步骤
        console.log('\n测试移除工作流步骤...');
        const removeResult = await workflowManager.removeWorkflowStep(workflow1.id, step2.id);
        
        console.log(`移除步骤结果: ${removeResult}`);
        
        const workflowAfterRemove = await workflowManager.getWorkflow(workflow1.id);
        
        if (workflowAfterRemove) {
            console.log(`移除后的工作流步骤数量: ${workflowAfterRemove.steps.length}`);
            workflowAfterRemove.steps.forEach(step => {
                console.log(`- ${step.id} - ${step.name}`);
            });
        }
        
        // 测试启动工作流
        console.log('\n测试启动工作流...');
        try {
            const startedWorkflow = await workflowManager.startWorkflow(workflow1.id);
            console.log(`启动工作流: ${startedWorkflow.id} - ${startedWorkflow.name} - 状态: ${startedWorkflow.status}`);
            
            // 等待一段时间，让工作流执行
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
            console.error(`启动工作流失败: ${error}`);
        }
        
        // 测试暂停工作流
        console.log('\n测试暂停工作流...');
        try {
            const pausedWorkflow = await workflowManager.pauseWorkflow(workflow1.id);
            console.log(`暂停工作流: ${pausedWorkflow.id} - ${pausedWorkflow.name} - 状态: ${pausedWorkflow.status}`);
        } catch (error) {
            console.error(`暂停工作流失败: ${error}`);
        }
        
        // 测试继续执行工作流
        console.log('\n测试继续执行工作流...');
        try {
            const continuedWorkflow = await workflowManager.startWorkflow(workflow1.id);
            console.log(`继续执行工作流: ${continuedWorkflow.id} - ${continuedWorkflow.name} - 状态: ${continuedWorkflow.status}`);
            
            // 等待一段时间，让工作流执行
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
            console.error(`继续执行工作流失败: ${error}`);
        }
        
        // 测试停止工作流
        console.log('\n测试停止工作流...');
        try {
            const stoppedWorkflow = await workflowManager.stopWorkflow(workflow1.id);
            console.log(`停止工作流: ${stoppedWorkflow.id} - ${stoppedWorkflow.name} - 状态: ${stoppedWorkflow.status}`);
        } catch (error) {
            console.error(`停止工作流失败: ${error}`);
        }
        
        // 测试删除工作流
        console.log('\n测试删除工作流...');
        const deleteResult = await workflowManager.removeWorkflow(workflow1.id);
        
        console.log(`删除工作流结果: ${deleteResult}`);
        
        const allWorkflowsAfterDelete = await workflowManager.getAllWorkflows();
        
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