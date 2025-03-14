import * as vscode from 'vscode';
import { BaseTool } from '../../tools/BaseTool';
import { CollaborationManager, CollaborationType, CollaborationSession } from './CollaborationManager';
import { AgentManager, IAgent, AgentInput, AgentOutput } from '../AgentManager';

/**
 * 协作工具参数接口
 */
export interface CollaborationToolParams {
  command: string;
  sessionId?: string;
  sessionName?: string;
  collaborationType?: CollaborationType;
  agentIds?: string[];
  input?: AgentInput;
  coordinatorAgentId?: string;
}

/**
 * 协作工具结果接口
 */
export interface CollaborationToolResult {
  success: boolean;
  sessionId?: string;
  output?: AgentOutput | AgentOutput[];
  error?: string;
}

/**
 * 协作工具类
 * 
 * 提供代理之间协作的工具
 */
export class CollaborationTool extends BaseTool {
  private collaborationManager: CollaborationManager;
  private agentManager: AgentManager;
  
  /**
   * 构造函数
   * 
   * @param collaborationManager 协作管理器
   * @param agentManager 代理管理器
   */
  constructor(collaborationManager: CollaborationManager, agentManager: AgentManager) {
    super('collaboration', '代理协作工具');
    this.collaborationManager = collaborationManager;
    this.agentManager = agentManager;
  }
  
  /**
   * 执行工具
   * 
   * @param params 工具参数
   * @returns 工具结果
   */
  public async execute(params: CollaborationToolParams): Promise<CollaborationToolResult> {
    try {
      switch (params.command) {
        case 'create_session':
          return await this.createSession(params);
        
        case 'execute_sequential':
          return await this.executeSequential(params);
        
        case 'execute_parallel':
          return await this.executeParallel(params);
        
        case 'execute_hierarchical':
          return await this.executeHierarchical(params);
        
        case 'end_session':
          return await this.endSession(params);
        
        case 'get_session':
          return await this.getSession(params);
        
        default:
          throw new Error(`未知命令: ${params.command}`);
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * 创建协作会话
   * 
   * @param params 工具参数
   * @returns 工具结果
   */
  private async createSession(params: CollaborationToolParams): Promise<CollaborationToolResult> {
    if (!params.sessionName) {
      throw new Error('会话名称不能为空');
    }
    
    if (!params.collaborationType) {
      throw new Error('协作类型不能为空');
    }
    
    if (!params.agentIds || params.agentIds.length === 0) {
      throw new Error('代理ID列表不能为空');
    }
    
    // 获取代理
    const agents: IAgent[] = [];
    for (const agentId of params.agentIds) {
      const agent = this.agentManager.getAgent(agentId);
      if (!agent) {
        throw new Error(`代理不存在: ${agentId}`);
      }
      agents.push(agent);
    }
    
    // 创建会话
    const session = this.collaborationManager.createSession(
      params.sessionName,
      params.collaborationType,
      agents
    );
    
    return {
      success: true,
      sessionId: session.id
    };
  }
  
  /**
   * 执行顺序协作
   * 
   * @param params 工具参数
   * @returns 工具结果
   */
  private async executeSequential(params: CollaborationToolParams): Promise<CollaborationToolResult> {
    if (!params.sessionId) {
      throw new Error('会话ID不能为空');
    }
    
    if (!params.input) {
      throw new Error('输入不能为空');
    }
    
    // 执行顺序协作
    const results = await this.collaborationManager.executeSequentialCollaboration(
      params.sessionId,
      params.input
    );
    
    return {
      success: true,
      sessionId: params.sessionId,
      output: results
    };
  }
  
  /**
   * 执行并行协作
   * 
   * @param params 工具参数
   * @returns 工具结果
   */
  private async executeParallel(params: CollaborationToolParams): Promise<CollaborationToolResult> {
    if (!params.sessionId) {
      throw new Error('会话ID不能为空');
    }
    
    if (!params.input) {
      throw new Error('输入不能为空');
    }
    
    // 执行并行协作
    const results = await this.collaborationManager.executeParallelCollaboration(
      params.sessionId,
      params.input
    );
    
    return {
      success: true,
      sessionId: params.sessionId,
      output: results
    };
  }
  
  /**
   * 执行层级协作
   * 
   * @param params 工具参数
   * @returns 工具结果
   */
  private async executeHierarchical(params: CollaborationToolParams): Promise<CollaborationToolResult> {
    if (!params.sessionId) {
      throw new Error('会话ID不能为空');
    }
    
    if (!params.input) {
      throw new Error('输入不能为空');
    }
    
    if (!params.coordinatorAgentId) {
      throw new Error('协调者代理ID不能为空');
    }
    
    // 执行层级协作
    const result = await this.collaborationManager.executeHierarchicalCollaboration(
      params.sessionId,
      params.input,
      params.coordinatorAgentId
    );
    
    return {
      success: true,
      sessionId: params.sessionId,
      output: result
    };
  }
  
  /**
   * 结束协作会话
   * 
   * @param params 工具参数
   * @returns 工具结果
   */
  private async endSession(params: CollaborationToolParams): Promise<CollaborationToolResult> {
    if (!params.sessionId) {
      throw new Error('会话ID不能为空');
    }
    
    // 结束会话
    this.collaborationManager.endSession(params.sessionId, true);
    
    return {
      success: true,
      sessionId: params.sessionId
    };
  }
  
  /**
   * 获取协作会话
   * 
   * @param params 工具参数
   * @returns 工具结果
   */
  private async getSession(params: CollaborationToolParams): Promise<CollaborationToolResult> {
    if (!params.sessionId) {
      throw new Error('会话ID不能为空');
    }
    
    // 获取会话
    const session = this.collaborationManager.getSession(params.sessionId);
    if (!session) {
      throw new Error(`协作会话不存在: ${params.sessionId}`);
    }
    
    return {
      success: true,
      sessionId: session.id,
      output: {
        message: JSON.stringify(session, (key, value) => {
          // 避免循环引用
          if (key === 'agents') {
            return value.map((agent: IAgent) => ({
              id: agent.id,
              name: agent.name,
              role: agent.role
            }));
          }
          return value;
        }, 2),
        state: session.status === 'active' ? 'busy' : session.status === 'completed' ? 'idle' : 'error'
      }
    };
  }
}