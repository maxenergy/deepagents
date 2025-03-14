import * as vscode from 'vscode';
import { ExtensionCore } from './core/ExtensionCore';
import { StorageManager } from './storage/StorageManager';
import { LLMManager } from './llm/LLMManager';
import { AgentManager } from './agents/AgentManager';
import { WorkflowEngine } from './workflow/WorkflowEngine';
import { UIManager } from './ui/UIManager';
import { ToolManager } from './tools/ToolManager';
import { LLMService } from './llm/LLMService';

/**
 * DeepAgents 扩展激活函数
 * 
 * 这是扩展的入口点，负责初始化各个核心组件并注册命令和视图
 */
export async function activate(context: vscode.ExtensionContext) {
  console.log('DeepAgents 扩展已激活');

  // 创建输出通道
  const outputChannel = vscode.window.createOutputChannel('DeepAgents');
  context.subscriptions.push(outputChannel);
  outputChannel.appendLine('DeepAgents 扩展已启动');

  try {
    // 初始化核心组件
    const extensionCore = new ExtensionCore(context, outputChannel);
    const storageManager = new StorageManager(context);
    const llmManager = new LLMManager(context, storageManager);
    const llmService = LLMService.getInstance();
    const toolManager = new ToolManager(context, outputChannel);
    const agentManager = new AgentManager(context, llmManager, storageManager, toolManager);
    const workflowEngine = WorkflowEngine.getInstance();
    const uiManager = new UIManager(context, storageManager, workflowEngine, agentManager, llmService);

    // 注册命令
    context.subscriptions.push(
      vscode.commands.registerCommand('deepagents.start', () => {
        outputChannel.appendLine('启动 DeepAgents');
        uiManager.showComponent('main_panel');
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand('deepagents.showPanel', () => {
        uiManager.showComponent('main_panel');
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand('deepagents.configure', () => {
        uiManager.showComponent('config_panel');
      })
    );

    // 初始化完成
    outputChannel.appendLine('DeepAgents 初始化完成');

    // 返回扩展 API
    return {
      extensionCore,
      agentManager,
      workflowEngine,
      llmManager,
      llmService,
      toolManager,
      uiManager
    };
  } catch (error) {
    outputChannel.appendLine(`初始化失败: ${error}`);
    console.error('DeepAgents 初始化失败:', error);
    throw error;
  }
}

/**
 * DeepAgents 扩展停用函数
 * 
 * 当扩展被停用时调用，负责清理资源
 */
export function deactivate() {
  console.log('DeepAgents 扩展已停用');
}