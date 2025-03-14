import * as vscode from 'vscode';
import { IUIComponent, UIComponentConfig, UIComponentType, UIComponentState, UIComponentMessage } from './IUIComponent';
import { StorageManager, StorageNamespace } from '../storage/StorageManager';
import { MainPanelProvider, WorkflowViewProvider, AgentsViewProvider, StatusBarProvider, TreeViewProvider } from './providers';
import { WorkflowEngine } from '../workflow/WorkflowEngine';
import { AgentManager } from '../agents/AgentManager';
import { LLMService } from '../llm/LLMService';

/**
 * UI管理器类
 * 
 * 负责管理和协调UI组件，处理组件之间的通信
 */
export class UIManager {
  private context: vscode.ExtensionContext;
  private storageManager: StorageManager;
  private workflowEngine: WorkflowEngine;
  private agentManager: AgentManager;
  private llmService: LLMService;
  private components: Map<string, IUIComponent> = new Map();
  private eventEmitter: vscode.EventEmitter<UIComponentMessage> = new vscode.EventEmitter<UIComponentMessage>();
  
  /**
   * 组件消息事件
   */
  public readonly onComponentMessage: vscode.Event<UIComponentMessage> = this.eventEmitter.event;
  
  /**
   * 构造函数
   * 
   * @param context VSCode扩展上下文
   * @param storageManager 存储管理器
   * @param workflowEngine 工作流引擎
   * @param agentManager 代理管理器
   * @param llmService LLM服务
   */
  constructor(
    context: vscode.ExtensionContext, 
    storageManager: StorageManager,
    workflowEngine: WorkflowEngine,
    agentManager: AgentManager,
    llmService: LLMService
  ) {
    this.context = context;
    this.storageManager = storageManager;
    this.workflowEngine = workflowEngine;
    this.agentManager = agentManager;
    this.llmService = llmService;
    
    // 注册命令
    this.registerCommands();
  }
  
  /**
   * 注册命令
   */
  private registerCommands(): void {
    // 注册打开主面板命令
    this.context.subscriptions.push(
      vscode.commands.registerCommand('deepagents.openMainPanel', () => {
        this.showComponent('main_panel');
      })
    );
    
    // 注册打开工作流视图命令
    this.context.subscriptions.push(
      vscode.commands.registerCommand('deepagents.openWorkflowView', () => {
        vscode.commands.executeCommand('deepagents.workflowView.focus');
      })
    );
    
    // 注册打开代理视图命令
    this.context.subscriptions.push(
      vscode.commands.registerCommand('deepagents.openAgentsView', () => {
        vscode.commands.executeCommand('deepagents.agentsView.focus');
      })
    );
    
    // 注册刷新树视图命令
    this.context.subscriptions.push(
      vscode.commands.registerCommand('deepagents.refreshTreeView', () => {
        const treeView = this.getComponent('tree_view');
        if (treeView) {
          treeView.update({});
        }
      })
    );
    
    // 注册执行工作流阶段命令
    this.context.subscriptions.push(
      vscode.commands.registerCommand('deepagents.executeWorkflowStage', async (workflowId: string, stageId: string) => {
        try {
          const workflow = this.workflowEngine.getWorkflow(workflowId);
          if (!workflow) {
            throw new Error(`工作流 ${workflowId} 不存在`);
          }
          
          const stage = workflow.getStage(stageId);
          if (!stage) {
            throw new Error(`阶段 ${stageId} 不存在`);
          }
          
          const result = await this.workflowEngine.executeStage(workflow, stage);
          
          // 更新所有组件
          this.broadcastMessage({
            command: 'workflowStageExecuted',
            data: {
              workflowId,
              stageId,
              result
            }
          });
          
          return result;
        } catch (error) {
          vscode.window.showErrorMessage(`执行工作流阶段失败: ${error instanceof Error ? error.message : String(error)}`);
          return null;
        }
      })
    );
    
    // 注册创建代理命令
    this.context.subscriptions.push(
      vscode.commands.registerCommand('deepagents.createAgent', async (role: string, config: any) => {
        try {
          const agent = await this.agentManager.createAgent(role, config);
          
          // 更新所有组件
          this.broadcastMessage({
            command: 'agentCreated',
            data: {
              agent
            }
          });
          
          return agent;
        } catch (error) {
          vscode.window.showErrorMessage(`创建代理失败: ${error instanceof Error ? error.message : String(error)}`);
          return null;
        }
      })
    );
  }
  
  /**
   * 初始化UI组件
   */
  public async initialize(): Promise<void> {
    // 创建主面板提供器
    const mainPanelProvider = new MainPanelProvider(this.context, this.agentManager, this.workflowEngine, this.llmService);
    this.registerComponent(mainPanelProvider);
    
    // 创建工作流视图提供器
    const workflowViewProvider = new WorkflowViewProvider(this.context, this.workflowEngine);
    this.registerComponent(workflowViewProvider);
    vscode.window.registerWebviewViewProvider(WorkflowViewProvider.viewType, workflowViewProvider);
    
    // 创建代理视图提供器
    const agentsViewProvider = new AgentsViewProvider(this.context, this.agentManager);
    this.registerComponent(agentsViewProvider);
    vscode.window.registerWebviewViewProvider(AgentsViewProvider.viewType, agentsViewProvider);
    
    // 创建状态栏提供器
    const statusBarProvider = new StatusBarProvider(this.context, this.workflowEngine, this.agentManager);
    this.registerComponent(statusBarProvider);
    
    // 创建树视图提供器
    const treeViewProvider = new TreeViewProvider(this.context, this.workflowEngine, this.agentManager);
    this.registerComponent(treeViewProvider);
    
    // 注册组件间通信
    this.registerComponentCommunication();
    
    // 从存储中恢复UI状态
    await this.restoreUIState();
  }
  
  /**
   * 注册组件间通信
   */
  private registerComponentCommunication(): void {
    // 监听工作流引擎事件
    this.workflowEngine.onWorkflowCreated((workflow) => {
      this.broadcastMessage({
        command: 'workflowCreated',
        data: {
          workflow
        }
      });
    });
    
    this.workflowEngine.onWorkflowUpdated((workflow) => {
      this.broadcastMessage({
        command: 'workflowUpdated',
        data: {
          workflow
        }
      });
    });
    
    this.workflowEngine.onWorkflowRemoved((workflowId) => {
      this.broadcastMessage({
        command: 'workflowRemoved',
        data: {
          workflowId
        }
      });
    });
    
    // 监听代理管理器事件
    this.agentManager.onAgentCreated((agent) => {
      this.broadcastMessage({
        command: 'agentCreated',
        data: {
          agent
        }
      });
    });
    
    this.agentManager.onAgentRemoved((agentId) => {
      this.broadcastMessage({
        command: 'agentRemoved',
        data: {
          agentId
        }
      });
    });
    
    this.agentManager.onAgentStateChanged((agent) => {
      this.broadcastMessage({
        command: 'agentStateChanged',
        data: {
          agent
        }
      });
    });
    
    // 监听 LLM 服务事件
    this.llmService.on('request_start', (data) => {
      this.broadcastMessage({
        command: 'llmRequestStart',
        data
      });
    });
    
    this.llmService.on('request_end', (data) => {
      this.broadcastMessage({
        command: 'llmRequestEnd',
        data
      });
    });
    
    this.llmService.on('request_error', (data) => {
      this.broadcastMessage({
        command: 'llmRequestError',
        data
      });
    });
  }
  
  /**
   * 从存储中恢复UI状态
   */
  private async restoreUIState(): Promise<void> {
    try {
      const uiState = await this.storageManager.get(StorageNamespace.UI, 'uiState');
      if (uiState) {
        // 恢复各组件状态
        for (const [id, state] of Object.entries(uiState)) {
          const component = this.getComponent(id);
          if (component) {
            component.update(state);
          }
        }
      }
    } catch (error) {
      console.error('恢复UI状态失败:', error);
    }
  }
  
  /**
   * 保存UI状态到存储
   */
  private async saveUIState(): Promise<void> {
    try {
      const uiState: Record<string, any> = {};
      
      // 收集各组件状态
      for (const [id, component] of this.components.entries()) {
        if (component.state === UIComponentState.READY) {
          uiState[id] = {};
        }
      }
      
      await this.storageManager.set(StorageNamespace.UI, 'uiState', uiState);
    } catch (error) {
      console.error('保存UI状态失败:', error);
    }
  }
  
  /**
   * 注册组件
   * 
   * @param component UI组件
   */
  public registerComponent(component: IUIComponent): void {
    this.components.set(component.id, component);
  }
  
  /**
   * 获取组件
   * 
   * @param id 组件ID
   * @returns UI组件，如果不存在则返回null
   */
  public getComponent(id: string): IUIComponent | null {
    return this.components.get(id) || null;
  }
  
  /**
   * 获取所有组件
   * 
   * @returns 所有UI组件
   */
  public getAllComponents(): IUIComponent[] {
    return Array.from(this.components.values());
  }
  
  /**
   * 获取特定类型的组件
   * 
   * @param type 组件类型
   * @returns 指定类型的UI组件数组
   */
  public getComponentsByType(type: UIComponentType): IUIComponent[] {
    return this.getAllComponents().filter(component => component.type === type);
  }
  
  /**
   * 显示组件
   * 
   * @param id 组件ID
   */
  public async showComponent(id: string): Promise<void> {
    const component = this.getComponent(id);
    if (component) {
      component.show();
    } else {
      throw new Error(`组件不存在: ${id}`);
    }
  }
  
  /**
   * 隐藏组件
   * 
   * @param id 组件ID
   */
  public async hideComponent(id: string): Promise<void> {
    const component = this.getComponent(id);
    if (component) {
      component.hide();
    } else {
      throw new Error(`组件不存在: ${id}`);
    }
  }
  
  /**
   * 更新组件
   * 
   * @param id 组件ID
   * @param data 更新数据
   */
  public updateComponent(id: string, data: any): void {
    const component = this.getComponent(id);
    if (component) {
      component.update(data);
    } else {
      throw new Error(`组件不存在: ${id}`);
    }
  }
  
  /**
   * 发送消息到组件
   * 
   * @param id 组件ID
   * @param message 消息
   */
  public postMessageToComponent(id: string, message: UIComponentMessage): void {
    const component = this.getComponent(id);
    if (component) {
      component.postMessage(message);
    } else {
      throw new Error(`组件不存在: ${id}`);
    }
  }
  
  /**
   * 广播消息到所有组件
   * 
   * @param message 消息
   */
  public broadcastMessage(message: UIComponentMessage): void {
    for (const component of this.components.values()) {
      component.postMessage(message);
    }
    
    // 触发消息事件
    this.eventEmitter.fire(message);
  }
  
  /**
   * 广播消息到特定类型的组件
   * 
   * @param type 组件类型
   * @param message 消息
   */
  public broadcastMessageByType(type: UIComponentType, message: UIComponentMessage): void {
    const components = this.getComponentsByType(type);
    for (const component of components) {
      component.postMessage(message);
    }
  }
  
  /**
   * 处理来自组件的消息
   * 
   * @param componentId 组件ID
   * @param message 消息
   */
  public async handleComponentMessage(componentId: string, message: UIComponentMessage): Promise<any> {
    // 触发消息事件
    this.eventEmitter.fire({
      command: `component.${componentId}.${message.command}`,
      data: {
        componentId,
        ...message.data
      }
    });
    
    // 获取组件
    const component = this.getComponent(componentId);
    if (!component) {
      throw new Error(`组件不存在: ${componentId}`);
    }
    
    // 处理消息
    return await component.handleMessage(message);
  }
  
  /**
   * 销毁组件
   * 
   * @param id 组件ID
   */
  public disposeComponent(id: string): void {
    const component = this.getComponent(id);
    if (component) {
      component.dispose();
      this.components.delete(id);
    }
  }
  
  /**
   * 销毁所有组件
   */
  public disposeAllComponents(): void {
    // 保存UI状态
    this.saveUIState();
    
    // 销毁所有组件
    for (const component of this.components.values()) {
      component.dispose();
    }
    this.components.clear();
  }
  
  /**
   * 销毁UI管理器
   */
  public dispose(): void {
    this.disposeAllComponents();
    this.eventEmitter.dispose();
  }
}