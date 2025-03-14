import * as vscode from 'vscode';
import { IUIComponent, UIComponentConfig, UIComponentType, UIComponentState, UIComponentMessage } from '../IUIComponent';
import { WorkflowEngine } from '../../workflow/WorkflowEngine';
import { AgentManager } from '../../agents/AgentManager';

/**
 * 树节点类型枚举
 */
export enum TreeNodeType {
  CATEGORY = 'category',
  WORKFLOW = 'workflow',
  STAGE = 'stage',
  AGENT = 'agent',
  TASK = 'task'
}

/**
 * 树节点接口
 */
export interface TreeNode {
  id: string;
  label: string;
  type: TreeNodeType;
  description?: string;
  tooltip?: string;
  iconPath?: string | vscode.Uri | { light: string | vscode.Uri; dark: string | vscode.Uri };
  contextValue?: string;
  children?: TreeNode[];
  data?: any;
}

/**
 * 树视图数据提供器类
 */
export class TreeDataProvider implements vscode.TreeDataProvider<TreeNode> {
  private _onDidChangeTreeData: vscode.EventEmitter<TreeNode | undefined | null> = new vscode.EventEmitter<TreeNode | undefined | null>();
  readonly onDidChangeTreeData: vscode.Event<TreeNode | undefined | null> = this._onDidChangeTreeData.event;
  
  private workflowEngine: WorkflowEngine;
  private agentManager: AgentManager;
  private rootNodes: TreeNode[] = [];
  
  /**
   * 构造函数
   * 
   * @param workflowEngine 工作流引擎
   * @param agentManager 代理管理器
   */
  constructor(workflowEngine: WorkflowEngine, agentManager: AgentManager) {
    this.workflowEngine = workflowEngine;
    this.agentManager = agentManager;
    
    // 初始化根节点
    this.initializeRootNodes();
    
    // 注册事件监听器
    this.registerEventListeners();
  }
  
  /**
   * 初始化根节点
   */
  private initializeRootNodes(): void {
    this.rootNodes = [
      {
        id: 'workflows',
        label: '工作流',
        type: TreeNodeType.CATEGORY,
        contextValue: 'workflowCategory',
        iconPath: new vscode.ThemeIcon('workflow'),
        children: this.getWorkflowNodes()
      },
      {
        id: 'agents',
        label: '代理',
        type: TreeNodeType.CATEGORY,
        contextValue: 'agentCategory',
        iconPath: new vscode.ThemeIcon('person'),
        children: this.getAgentNodes()
      }
    ];
  }
  
  /**
   * 注册事件监听器
   */
  private registerEventListeners(): void {
    // 监听工作流变化
    this.workflowEngine.onWorkflowCreated(() => {
      this.refresh();
    });
    
    this.workflowEngine.onWorkflowUpdated(() => {
      this.refresh();
    });
    
    this.workflowEngine.onWorkflowRemoved(() => {
      this.refresh();
    });
    
    // 监听代理变化
    this.agentManager.onAgentCreated(() => {
      this.refresh();
    });
    
    this.agentManager.onAgentRemoved(() => {
      this.refresh();
    });
    
    this.agentManager.onAgentStateChanged(() => {
      this.refresh();
    });
  }
  
  /**
   * 获取工作流节点
   * 
   * @returns 工作流节点数组
   */
  private getWorkflowNodes(): TreeNode[] {
    const workflows = this.workflowEngine.getAllWorkflows();
    
    if (workflows.length === 0) {
      return [
        {
          id: 'no-workflows',
          label: '暂无工作流',
          type: TreeNodeType.CATEGORY,
          contextValue: 'emptyWorkflows'
        }
      ];
    }
    
    return workflows.map(workflow => {
      const stages = workflow.getAllStages();
      const currentStage = workflow.getCurrentStage();
      
      return {
        id: `workflow-${workflow.id}`,
        label: workflow.name,
        type: TreeNodeType.WORKFLOW,
        description: workflow.isActive() ? '活动' : '空闲',
        tooltip: `工作流: ${workflow.name}\n状态: ${workflow.isActive() ? '活动' : '空闲'}`,
        iconPath: new vscode.ThemeIcon(workflow.isActive() ? 'play' : 'debug-pause'),
        contextValue: `workflow-${workflow.isActive() ? 'active' : 'inactive'}`,
        data: workflow,
        children: stages.map(stage => ({
          id: `stage-${stage.id}`,
          label: stage.name,
          type: TreeNodeType.STAGE,
          description: stage.id === currentStage.id ? '当前' : stage.isCompleted() ? '已完成' : '待执行',
          tooltip: `阶段: ${stage.name}\n状态: ${stage.id === currentStage.id ? '当前' : stage.isCompleted() ? '已完成' : '待执行'}`,
          iconPath: new vscode.ThemeIcon(
            stage.id === currentStage.id ? 'play-circle' : 
            stage.isCompleted() ? 'check' : 'circle-outline'
          ),
          contextValue: `stage-${stage.id === currentStage.id ? 'current' : stage.isCompleted() ? 'completed' : 'pending'}`,
          data: stage
        }))
      };
    });
  }
  
  /**
   * 获取代理节点
   * 
   * @returns 代理节点数组
   */
  private getAgentNodes(): TreeNode[] {
    const agents = this.agentManager.getAllAgents();
    
    if (agents.length === 0) {
      return [
        {
          id: 'no-agents',
          label: '暂无代理',
          type: TreeNodeType.CATEGORY,
          contextValue: 'emptyAgents'
        }
      ];
    }
    
    return agents.map(agent => {
      return {
        id: `agent-${agent.id}`,
        label: agent.name,
        type: TreeNodeType.AGENT,
        description: agent.isActive() ? '活动' : '空闲',
        tooltip: `代理: ${agent.name}\n角色: ${agent.role}\n状态: ${agent.isActive() ? '活动' : '空闲'}`,
        iconPath: new vscode.ThemeIcon(agent.isActive() ? 'person' : 'person-outline'),
        contextValue: `agent-${agent.isActive() ? 'active' : 'inactive'}`,
        data: agent,
        children: agent.getTasks().map(task => ({
          id: `task-${task.id}`,
          label: task.name,
          type: TreeNodeType.TASK,
          description: task.status,
          tooltip: `任务: ${task.name}\n状态: ${task.status}`,
          iconPath: new vscode.ThemeIcon(
            task.status === 'completed' ? 'check' : 
            task.status === 'in_progress' ? 'loading' : 
            task.status === 'failed' ? 'error' : 'circle-outline'
          ),
          contextValue: `task-${task.status}`,
          data: task
        }))
      };
    });
  }
  
  /**
   * 刷新树视图
   * 
   * @param node 要刷新的节点，如果为空则刷新整个树
   */
  public refresh(node?: TreeNode): void {
    this.initializeRootNodes();
    this._onDidChangeTreeData.fire(node);
  }
  
  /**
   * 获取树项
   * 
   * @param element 树节点
   * @returns 树项
   */
  getTreeItem(element: TreeNode): vscode.TreeItem {
    const treeItem = new vscode.TreeItem(
      element.label,
      element.children && element.children.length > 0 ? 
        vscode.TreeItemCollapsibleState.Expanded : 
        vscode.TreeItemCollapsibleState.None
    );
    
    treeItem.id = element.id;
    treeItem.description = element.description;
    treeItem.tooltip = element.tooltip;
    treeItem.iconPath = element.iconPath;
    treeItem.contextValue = element.contextValue;
    
    return treeItem;
  }
  
  /**
   * 获取子节点
   * 
   * @param element 父节点
   * @returns 子节点数组
   */
  getChildren(element?: TreeNode): Thenable<TreeNode[]> {
    if (!element) {
      return Promise.resolve(this.rootNodes);
    }
    
    return Promise.resolve(element.children || []);
  }
  
  /**
   * 获取父节点
   * 
   * @param element 子节点
   * @returns 父节点
   */
  getParent(element: TreeNode): vscode.ProviderResult<TreeNode> {
    // 这里简化实现，实际应用中可能需要更复杂的逻辑
    return null;
  }
}

/**
 * 树视图提供器类
 * 
 * 负责提供树视图
 */
export class TreeViewProvider implements IUIComponent {
  public readonly id = 'tree_view';
  public readonly type = UIComponentType.TREE_VIEW;
  
  private _state: UIComponentState = UIComponentState.INITIALIZING;
  private context: vscode.ExtensionContext;
  private config: UIComponentConfig;
  private workflowEngine: WorkflowEngine;
  private agentManager: AgentManager;
  
  private treeDataProvider: TreeDataProvider;
  private treeView: vscode.TreeView<TreeNode>;
  
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
    
    // 创建树数据提供器
    this.treeDataProvider = new TreeDataProvider(workflowEngine, agentManager);
    
    // 创建树视图
    this.treeView = vscode.window.createTreeView('deepagents.treeView', {
      treeDataProvider: this.treeDataProvider,
      showCollapseAll: true
    });
    
    // 注册事件监听器
    this.registerEventListeners();
    
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
    // 监听树视图选择变化
    this.treeView.onDidChangeSelection(event => {
      const selectedNode = event.selection[0];
      if (selectedNode) {
        this.handleNodeSelection(selectedNode);
      }
    });
    
    // 监听树视图可见性变化
    this.treeView.onDidChangeVisibility(event => {
      if (event.visible) {
        this.treeDataProvider.refresh();
      }
    });
  }
  
  /**
   * 处理节点选择
   * 
   * @param node 选中的节点
   */
  private handleNodeSelection(node: TreeNode): void {
    switch (node.type) {
      case TreeNodeType.WORKFLOW:
        vscode.commands.executeCommand('deepagents.openWorkflowView');
        break;
      case TreeNodeType.AGENT:
        vscode.commands.executeCommand('deepagents.openAgentsView');
        break;
      case TreeNodeType.STAGE:
        vscode.commands.executeCommand('deepagents.openWorkflowView');
        break;
      case TreeNodeType.TASK:
        vscode.commands.executeCommand('deepagents.openMainPanel');
        break;
    }
  }
  
  /**
   * 渲染组件
   * 
   * @returns 树视图
   */
  public render(): vscode.TreeView<TreeNode> {
    return this.treeView;
  }
  
  /**
   * 更新组件
   * 
   * @param data 更新数据
   */
  public update(data: any): void {
    this.treeDataProvider.refresh();
  }
  
  /**
   * 显示组件
   */
  public show(): void {
    // 树视图的显示由 VSCode 管理
  }
  
  /**
   * 隐藏组件
   */
  public hide(): void {
    // 树视图的隐藏由 VSCode 管理
  }
  
  /**
   * 发送消息到组件
   * 
   * @param message 消息
   */
  public postMessage(message: UIComponentMessage): void {
    // 树视图不支持接收消息
  }
  
  /**
   * 处理来自组件的消息
   * 
   * @param message 消息
   * @returns 处理结果
   */
  public async handleMessage(message: UIComponentMessage): Promise<any> {
    switch (message.command) {
      case 'refresh':
        this.treeDataProvider.refresh();
        return true;
      case 'selectNode':
        if (message.data && message.data.nodeId) {
          // 这里需要实现选择特定节点的逻辑
          return true;
        }
        return false;
      default:
        return null;
    }
  }
  
  /**
   * 销毁组件
   */
  public dispose(): void {
    this.treeView.dispose();
    this._state = UIComponentState.DISPOSED;
  }
}