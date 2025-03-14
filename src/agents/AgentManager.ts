import * as vscode from 'vscode';
import { LLMManager } from '../llm/LLMManager';
import { StorageManager, StorageNamespace } from '../storage/StorageManager';
import { ToolManager } from '../tools/ToolManager';
import { ProductManagerAgent } from './ProductManagerAgent';
import { ArchitectAgent } from './ArchitectAgent';
import { DeveloperAgent } from './DeveloperAgent';
import { TesterAgent } from './TesterAgent';
import { DevOpsAgent } from './DevOpsAgent';
import { DocumentationAgent } from './DocumentationAgent';

/**
 * 代理角色枚举
 */
export enum AgentRole {
  PRODUCT_MANAGER = 'product_manager',
  ARCHITECT = 'architect',
  DEVELOPER = 'developer',
  TESTER = 'tester',
  DEVOPS = 'devops',
  DOCUMENTATION = 'documentation',
  CUSTOM = 'custom'
}

/**
 * 代理能力枚举
 */
export enum AgentCapability {
  CODE_GENERATION = 'code_generation',
  CODE_REVIEW = 'code_review',
  TESTING = 'testing',
  DOCUMENTATION = 'documentation',
  DEPLOYMENT = 'deployment',
  REQUIREMENTS = 'requirements',
  DESIGN = 'design'
}

/**
 * 代理状态枚举
 */
export enum AgentState {
  IDLE = 'idle',
  BUSY = 'busy',
  ERROR = 'error'
}

/**
 * 代理配置接口
 */
export interface AgentConfig {
  name: string;
  role: AgentRole;
  capabilities: AgentCapability[];
  description?: string;
  systemPrompt?: string;
  model?: string;
  provider?: string;
}

/**
 * 代理输入接口
 */
export interface AgentInput {
  message: string;
  context?: any;
  files?: string[];
}

/**
 * 代理输出接口
 */
export interface AgentOutput {
  message: string;
  actions?: AgentAction[];
  state: AgentState;
  error?: string;
}

/**
 * 代理动作接口
 */
export interface AgentAction {
  type: string;
  payload: any;
}

/**
 * 任务接口
 */
export interface Task {
  id: string;
  title: string;
  description: string;
  assignedTo?: string;
  status: TaskStatus;
  dependencies?: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 任务状态枚举
 */
export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  REVIEW = 'review',
  DONE = 'done',
  BLOCKED = 'blocked'
}

/**
 * 任务结果接口
 */
export interface TaskResult {
  task: Task;
  success: boolean;
  output?: AgentOutput;
  error?: string;
}

/**
 * 代理接口
 */
export interface IAgent {
  id: string;
  name: string;
  role: AgentRole;
  capabilities: AgentCapability[];
  state: AgentState;
  
  initialize(config: AgentConfig): Promise<void>;
  process(input: AgentInput): Promise<AgentOutput>;
  collaborate(agents: IAgent[]): Promise<void>;
  getState(): AgentState;
  setState(state: AgentState): void;
}

/**
 * 代理管理器类
 * 
 * 负责创建和管理代理实例，协调代理之间的通信和协作
 */
export class AgentManager {
  private context: vscode.ExtensionContext;
  private llmManager: LLMManager;
  private storageManager: StorageManager;
  private toolManager: ToolManager;
  private agents: Map<string, IAgent> = new Map();
  
  // 事件发射器
  private _onAgentCreated = new vscode.EventEmitter<IAgent>();
  private _onAgentRemoved = new vscode.EventEmitter<string>();
  private _onAgentStateChanged = new vscode.EventEmitter<IAgent>();
  
  // 事件
  public readonly onAgentCreated = this._onAgentCreated.event;
  public readonly onAgentRemoved = this._onAgentRemoved.event;
  public readonly onAgentStateChanged = this._onAgentStateChanged.event;

  /**
   * 构造函数
   * 
   * @param context VSCode 扩展上下文
   * @param llmManager LLM 管理器
   * @param storageManager 存储管理器
   * @param toolManager 工具管理器
   */
  constructor(
    context: vscode.ExtensionContext,
    llmManager: LLMManager,
    storageManager: StorageManager,
    toolManager: ToolManager
  ) {
    this.context = context;
    this.llmManager = llmManager;
    this.storageManager = storageManager;
    this.toolManager = toolManager;
    this.initialize();
  }

  /**
   * 初始化代理管理器
   */
  private async initialize(): Promise<void> {
    // 加载保存的代理
    const agentStorage = this.storageManager.getStorage(StorageNamespace.AGENTS);
    if (agentStorage) {
      const savedAgents = await agentStorage.getAll();
      for (const [id, config] of savedAgents.entries()) {
        await this.createAgent(config.role, config);
      }
    }
  }

  /**
   * 创建代理
   * 
   * @param role 代理角色
   * @param config 代理配置
   * @returns 代理实例
   */
  public async createAgent(role: AgentRole, config: AgentConfig): Promise<IAgent> {
    const id = `agent_${Date.now()}`;
    let agent: IAgent;
    
    // 根据角色创建不同类型的代理
    switch (role) {
      case AgentRole.PRODUCT_MANAGER:
        agent = new ProductManagerAgent(id, this.llmManager);
        break;
      
      case AgentRole.ARCHITECT:
        agent = new ArchitectAgent(id, this.llmManager);
        break;
      
      case AgentRole.DEVELOPER:
        agent = new DeveloperAgent(id, this.llmManager, this.toolManager);
        break;
      
      case AgentRole.TESTER:
        agent = new TesterAgent(id, this.llmManager, this.toolManager);
        break;
      
      case AgentRole.DEVOPS:
        agent = new DevOpsAgent(id, this.llmManager, this.toolManager);
        break;
      
      case AgentRole.DOCUMENTATION:
        agent = new DocumentationAgent(id, this.llmManager, this.toolManager);
        break;
      
      default:
        // 创建一个基本的代理实例
        agent = {
          id,
          name: config.name,
          role: config.role,
          capabilities: config.capabilities,
          state: AgentState.IDLE,
          
          async initialize(config: AgentConfig): Promise<void> {
            console.log(`初始化代理: ${this.name}`);
          },
          
          async process(input: AgentInput): Promise<AgentOutput> {
            console.log(`处理输入: ${input.message}`);
            return {
              message: `代理 ${this.name} 收到消息: ${input.message}`,
              state: this.state
            };
          },
          
          async collaborate(agents: IAgent[]): Promise<void> {
            console.log(`与 ${agents.length} 个代理协作`);
          },
          
          getState(): AgentState {
            return this.state;
          },
          
          setState(state: AgentState): void {
            this.state = state;
          }
        };
    }
    
    // 初始化代理
    await agent.initialize(config);
    
    // 保存代理
    this.agents.set(agent.id, agent);
    
    // 保存到存储
    const agentStorage = this.storageManager.getStorage(StorageNamespace.AGENTS);
    if (agentStorage) {
      await agentStorage.set(agent.id, config);
    }
    
    // 触发代理创建事件
    this._onAgentCreated.fire(agent);
    
    return agent;
  }

  /**
   * 获取代理
   * 
   * @param id 代理 ID
   * @returns 代理实例，如果不存在则返回 null
   */
  public getAgent(id: string): IAgent | null {
    return this.agents.get(id) || null;
  }

  /**
   * 获取所有代理
   * 
   * @returns 所有代理实例
   */
  public getAllAgents(): IAgent[] {
    return Array.from(this.agents.values());
  }

  /**
   * 获取指定角色的代理
   * 
   * @param role 代理角色
   * @returns 指定角色的代理实例数组
   */
  public getAgentsByRole(role: AgentRole): IAgent[] {
    return Array.from(this.agents.values()).filter(agent => agent.role === role);
  }

  /**
   * 移除代理
   * 
   * @param id 代理 ID
   * @returns 是否成功移除
   */
  public async removeAgent(id: string): Promise<boolean> {
    const result = this.agents.delete(id);
    
    // 从存储中移除
    if (result) {
      const agentStorage = this.storageManager.getStorage(StorageNamespace.AGENTS);
      if (agentStorage) {
        await agentStorage.delete(id);
      }
      
      // 触发代理移除事件
      this._onAgentRemoved.fire(id);
    }
    
    return result;
  }

  /**
   * 协调代理完成任务
   * 
   * @param task 任务
   * @returns 任务结果
   */
  public async coordinateAgents(task: Task): Promise<TaskResult> {
    console.log(`协调代理完成任务: ${task.title}`);
    
    // 获取分配的代理
    const agent = task.assignedTo ? this.getAgent(task.assignedTo) : null;
    
    if (!agent) {
      return {
        task,
        success: false,
        error: '没有分配代理'
      };
    }
    
    try {
      // 设置代理状态
      agent.setState(AgentState.BUSY);
      
      // 触发代理状态变更事件
      this._onAgentStateChanged.fire(agent);
      
      // 处理任务
      const output = await agent.process({
        message: task.description,
        context: { task }
      });
      
      // 更新任务状态
      task.status = output.error ? TaskStatus.BLOCKED : TaskStatus.DONE;
      task.updatedAt = new Date();
      
      // 恢复代理状态
      agent.setState(AgentState.IDLE);
      
      // 触发代理状态变更事件
      this._onAgentStateChanged.fire(agent);
      
      return {
        task,
        success: !output.error,
        output,
        error: output.error
      };
    } catch (error) {
      // 恢复代理状态
      agent.setState(AgentState.ERROR);
      
      // 触发代理状态变更事件
      this._onAgentStateChanged.fire(agent);
      
      return {
        task,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * 检查代理是否处于活动状态
   * 
   * @param agent 代理实例
   * @returns 是否处于活动状态
   */
  public isAgentActive(agent: IAgent): boolean {
    return agent.state === AgentState.BUSY;
  }
  
  /**
   * 销毁代理管理器
   */
  public dispose(): void {
    this._onAgentCreated.dispose();
    this._onAgentRemoved.dispose();
    this._onAgentStateChanged.dispose();
  }
}