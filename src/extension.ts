import * as vscode from 'vscode';
import { ExtensionCore } from './core/ExtensionCore';
import { StorageManager, StorageNamespace } from './storage/StorageManager';
import { LLMManager } from './llm/LLMManager';
import { AgentManager } from './agents/AgentManager';
import { UIManager } from './ui/UIManager';
import { ToolManager } from './tools/ToolManager';
import { LLMService } from './llm/LLMService';
import { WorkflowManager } from './workflows/WorkflowManager';
import { WorkflowEngine } from './workflows/WorkflowEngine';
import { WorkflowCommandHandler } from './workflows/WorkflowCommandHandler';
import { WorkflowsViewProvider } from './ui/providers/WorkflowsViewProvider';
import { ProjectsViewProvider } from './ui/providers/ProjectsViewProvider';
import { ProjectManager } from './projects/ProjectManager';
import { UIComponentType } from './ui/IUIComponent';

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
    const workflowManager = new WorkflowManager(storageManager);
    const workflowEngine = WorkflowEngine.getInstance(workflowManager);
    const projectManager = new ProjectManager(storageManager);
    
    // 创建 UI 管理器
    // 注意：这里我们暂时不使用 UIManager，因为它需要 WorkflowEngine 类型，而我们现在使用的是自定义的 WorkflowEngine
    // const uiManager = new UIManager(context, storageManager, workflowEngine, agentManager, llmService);

    // 初始化工作流命令处理器
    const workflowCommandHandler = new WorkflowCommandHandler(context, workflowManager, agentManager);

    // 注册工作流视图提供器
    const workflowsViewProvider = new WorkflowsViewProvider(context, workflowManager);
    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(
        WorkflowsViewProvider.viewType,
        workflowsViewProvider
      )
    );

    // 注册项目视图提供器
    const projectsViewProvider = new ProjectsViewProvider(context, projectManager);
    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(
        ProjectsViewProvider.viewType,
        projectsViewProvider
      )
    );

    // 初始化 UI 组件
    await workflowsViewProvider.initialize(context, {
      id: 'workflows_view',
      title: '工作流管理',
      type: UIComponentType.WEBVIEW_VIEW
    });

    await projectsViewProvider.initialize(context, {
      id: 'projects_view',
      title: '项目管理',
      type: UIComponentType.WEBVIEW_VIEW
    });

    // 注册命令
    context.subscriptions.push(
      vscode.commands.registerCommand('deepagents.start', () => {
        outputChannel.appendLine('启动 DeepAgents');
        // uiManager.showComponent('main_panel');
        vscode.commands.executeCommand('deepagents.workflowsView.focus');
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand('deepagents.showPanel', () => {
        // uiManager.showComponent('main_panel');
        vscode.commands.executeCommand('deepagents.workflowsView.focus');
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand('deepagents.configure', () => {
        // uiManager.showComponent('config_panel');
        vscode.window.showInformationMessage('配置功能尚未实现');
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand('deepagents.showWorkflows', () => {
        vscode.commands.executeCommand('deepagents.workflowsView.focus');
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand('deepagents.showProjects', () => {
        vscode.commands.executeCommand('deepagents.projectsView.focus');
      })
    );

    // 初始化完成
    outputChannel.appendLine('DeepAgents 初始化完成');

    // 返回扩展 API
    return {
      extensionCore,
      agentManager,
      workflowManager,
      projectManager,
      llmManager,
      llmService,
      toolManager
      // uiManager
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