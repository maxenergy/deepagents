import * as vscode from 'vscode';
import { IUIComponent, UIComponentConfig, UIComponentType, UIComponentState, UIComponentMessage } from '../IUIComponent';
import { WorkflowEngine } from '../../workflow/WorkflowEngine';
import { AgentManager } from '../../agents/AgentManager';

/**
 * 状态栏提供器类
 * 
 * 负责提供状态栏信息和交互
 */
export class StatusBarProvider implements IUIComponent {
  public readonly id = 'status_bar';
  public readonly type = UIComponentType.STATUS_BAR;
  
  private _state: UIComponentState = UIComponentState.INITIALIZING;
  private context: vscode.ExtensionContext;
  private config: UIComponentConfig;
  private workflowEngine: WorkflowEngine;
  private agentManager: AgentManager;
  
  private statusBarItem: vscode.StatusBarItem;
  private activeWorkflowItem: vscode.StatusBarItem;
  private activeAgentsItem: vscode.StatusBarItem;
  
  /**
   * 获取组件状态
   */
  public get state(): UIComponentState {
    return this._state;
  }
  
  /**
   * 构造函数
   * 
   * @param context VSCode 扩展上下文
   * @param workflowEngine 工作流引擎
   * @param agentManager 代理管理器
   */
  constructor(context: vscode.ExtensionContext, workflowEngine: WorkflowEngine, agentManager: AgentManager) {
    this.context = context;
    this.workflowEngine = workflowEngine;
    this.agentManager = agentManager;
    
    // 创建状态栏项
    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    this.statusBarItem.text = "$(rocket) DeepAgents";
    this.statusBarItem.tooltip = "打开 DeepAgents 面板";
    this.statusBarItem.command = "deepagents.openMainPanel";
    
    this.activeWorkflowItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 99);
    this.activeWorkflowItem.text = "$(workflow) 无活动工作流";
    this.activeWorkflowItem.tooltip = "查看工作流";
    this.activeWorkflowItem.command = "deepagents.openWorkflowView";
    
    this.activeAgentsItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 98);
    this.activeAgentsItem.text = "$(person) 0 个代理";
    this.activeAgentsItem.tooltip = "查看代理";
    this.activeAgentsItem.command = "deepagents.openAgentsView";
    
    // 注册事件监听器
    this.registerEventListeners();
    
    // 显示状态栏项
    this.statusBarItem.show();
    this.activeWorkflowItem.show();
    this.activeAgentsItem.show();
    
    this._state = UIComponentState.READY;
  }
  
  /**
   * 初始化组件
   * 
   * @param context VSCode 扩展上下文
   * @param config 组件配置
   */
  public async initialize(context: vscode.ExtensionContext, config: UIComponentConfig): Promise<void> {
    this.context = context;
    this.config = config;
    this._state = UIComponentState.READY;
  }
  
  /**
   * 注册事件监听器
   */
  private registerEventListeners(): void {
    // 监听工作流变化
    this.workflowEngine.onWorkflowCreated((workflow) => {
      this.updateWorkflowStatus();
    });
    
    this.workflowEngine.onWorkflowUpdated((workflow) => {
      this.updateWorkflowStatus();
    });
    
    this.workflowEngine.onWorkflowRemoved((workflowId) => {
      this.updateWorkflowStatus();
    });
    
    // 监听代理变化
    this.agentManager.onAgentCreated((agent) => {
      this.updateAgentsStatus();
    });
    
    this.agentManager.onAgentRemoved((agentId) => {
      this.updateAgentsStatus();
    });
    
    this.agentManager.onAgentStateChanged((agent) => {
      this.updateAgentsStatus();
    });
  }
  
  /**
   * 更新工作流状态
   */
  private updateWorkflowStatus(): void {
    const workflows = this.workflowEngine.getAllWorkflows();
    const activeWorkflows = workflows.filter(w => w.isActive());
    
    if (activeWorkflows.length === 0) {
      this.activeWorkflowItem.text = "$(workflow) 无活动工作流";
    } else if (activeWorkflows.length === 1) {
      const workflow = activeWorkflows[0];
      const stage = workflow.getCurrentStage();
      this.activeWorkflowItem.text = `$(workflow) ${workflow.name}: ${stage.name}`;
    } else {
      this.activeWorkflowItem.text = `$(workflow) ${activeWorkflows.length} 个活动工作流`;
    }
  }
  
  /**
   * 更新代理状态
   */
  private updateAgentsStatus(): void {
    const agents = this.agentManager.getAllAgents();
    const activeAgents = agents.filter(a => a.isActive());
    
    if (agents.length === 0) {
      this.activeAgentsItem.text = "$(person) 0 个代理";
    } else if (activeAgents.length === 0) {
      this.activeAgentsItem.text = `$(person) ${agents.length} 个代理 (全部空闲)`;
    } else {
      this.activeAgentsItem.text = `$(person) ${activeAgents.length}/${agents.length} 个活动代理`;
    }
  }
  
  /**
   * 渲染组件
   * 
   * @returns 状态栏项
   */
  public render(): vscode.StatusBarItem {
    return this.statusBarItem;
  }
  
  /**
   * 更新组件
   * 
   * @param data 更新数据
   */
  public update(data: any): void {
    if (data.workflowStatus) {
      this.updateWorkflowStatus();
    }
    
    if (data.agentsStatus) {
      this.updateAgentsStatus();
    }
  }
  
  /**
   * 显示组件
   */
  public show(): void {
    this.statusBarItem.show();
    this.activeWorkflowItem.show();
    this.activeAgentsItem.show();
  }
  
  /**
   * 隐藏组件
   */
  public hide(): void {
    this.statusBarItem.hide();
    this.activeWorkflowItem.hide();
    this.activeAgentsItem.hide();
  }
  
  /**
   * 发送消息到组件
   * 
   * @param message 消息
   */
  public postMessage(message: UIComponentMessage): void {
    // 状态栏不支持接收消息
  }
  
  /**
   * 处理来自组件的消息
   * 
   * @param message 消息
   * @returns 处理结果
   */
  public async handleMessage(message: UIComponentMessage): Promise<any> {
    // 状态栏不支持处理消息
    return null;
  }
  
  /**
   * 销毁组件
   */
  public dispose(): void {
    this.statusBarItem.dispose();
    this.activeWorkflowItem.dispose();
    this.activeAgentsItem.dispose();
    this._state = UIComponentState.DISPOSED;
  }
}