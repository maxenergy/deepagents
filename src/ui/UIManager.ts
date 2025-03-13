import * as vscode from 'vscode';
import { AgentManager } from '../agents/AgentManager';
import { WorkflowEngine } from '../workflow/WorkflowEngine';
import { LLMManager } from '../llm/LLMManager';
import { AgentsViewProvider } from './providers/AgentsViewProvider';
import { WorkflowViewProvider } from './providers/WorkflowViewProvider';
import { MainPanelProvider } from './providers/MainPanelProvider';
import { ConfigPanelProvider } from './providers/ConfigPanelProvider';

/**
 * UI 组件接口
 */
export interface IUIComponent {
  id: string;
  render(): vscode.WebviewPanel | vscode.WebviewView;
  update(data: any): void;
  dispose(): void;
}

/**
 * UI 管理器类
 * 
 * 负责管理 UI 组件，包括视图、面板和对话框
 */
export class UIManager {
  private context: vscode.ExtensionContext;
  private agentManager: AgentManager;
  private workflowEngine: WorkflowEngine;
  private llmManager: LLMManager;
  private components: Map<string, IUIComponent> = new Map();
  private agentsViewProvider: AgentsViewProvider;
  private workflowViewProvider: WorkflowViewProvider;
  private mainPanelProvider: MainPanelProvider;
  private configPanelProvider: ConfigPanelProvider;

  /**
   * 构造函数
   * 
   * @param context VSCode 扩展上下文
   * @param agentManager 代理管理器
   * @param workflowEngine 工作流引擎
   * @param llmManager LLM 管理器
   */
  constructor(
    context: vscode.ExtensionContext,
    agentManager: AgentManager,
    workflowEngine: WorkflowEngine,
    llmManager: LLMManager
  ) {
    this.context = context;
    this.agentManager = agentManager;
    this.workflowEngine = workflowEngine;
    this.llmManager = llmManager;
    
    // 创建视图提供器
    this.agentsViewProvider = new AgentsViewProvider(context, agentManager);
    this.workflowViewProvider = new WorkflowViewProvider(context, workflowEngine);
    this.mainPanelProvider = new MainPanelProvider(context, agentManager, workflowEngine, llmManager);
    this.configPanelProvider = new ConfigPanelProvider(context, llmManager);
    
    // 注册组件
    this.registerComponent(this.agentsViewProvider);
    this.registerComponent(this.workflowViewProvider);
    this.registerComponent(this.mainPanelProvider);
    this.registerComponent(this.configPanelProvider);
  }

  /**
   * 注册组件
   * 
   * @param component UI 组件
   */
  public registerComponent(component: IUIComponent): void {
    this.components.set(component.id, component);
  }

  /**
   * 获取组件
   * 
   * @param id 组件 ID
   * @returns UI 组件，如果不存在则返回 null
   */
  public getComponent(id: string): IUIComponent | null {
    return this.components.get(id) || null;
  }

  /**
   * 获取所有组件
   * 
   * @returns 所有 UI 组件
   */
  public getAllComponents(): IUIComponent[] {
    return Array.from(this.components.values());
  }

  /**
   * 显示组件
   * 
   * @param id 组件 ID
   */
  public async showComponent(id: string): Promise<void> {
    const component = this.getComponent(id);
    if (component) {
      component.render();
    }
  }

  /**
   * 隐藏组件
   * 
   * @param id 组件 ID
   */
  public async hideComponent(id: string): Promise<void> {
    const component = this.getComponent(id);
    if (component) {
      component.dispose();
    }
  }

  /**
   * 获取代理视图提供器
   * 
   * @returns 代理视图提供器
   */
  public getAgentsViewProvider(): AgentsViewProvider {
    return this.agentsViewProvider;
  }

  /**
   * 获取工作流视图提供器
   * 
   * @returns 工作流视图提供器
   */
  public getWorkflowViewProvider(): WorkflowViewProvider {
    return this.workflowViewProvider;
  }

  /**
   * 显示主面板
   */
  public showMainPanel(): void {
    this.mainPanelProvider.render();
  }

  /**
   * 显示配置面板
   */
  public showConfigPanel(): void {
    this.configPanelProvider.render();
  }

  /**
   * 显示消息
   * 
   * @param message 消息
   * @param type 消息类型
   */
  public showMessage(message: string, type: 'info' | 'warning' | 'error' = 'info'): void {
    switch (type) {
      case 'info':
        vscode.window.showInformationMessage(message);
        break;
      case 'warning':
        vscode.window.showWarningMessage(message);
        break;
      case 'error':
        vscode.window.showErrorMessage(message);
        break;
    }
  }

  /**
   * 显示进度
   * 
   * @param title 标题
   * @param task 任务
   */
  public async showProgress<T>(title: string, task: (progress: vscode.Progress<{ message?: string; increment?: number }>) => Thenable<T>): Promise<T> {
    return vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title,
      cancellable: false
    }, task);
  }
}