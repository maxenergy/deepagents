import * as vscode from 'vscode';
import { IAgent, AgentRole, AgentState, AgentInput, AgentOutput } from '../AgentManager';
import { LLMManager } from '../../llm/LLMManager';

/**
 * 协作类型枚举
 */
export enum CollaborationType {
  SEQUENTIAL = 'sequential',  // 顺序协作
  PARALLEL = 'parallel',      // 并行协作
  HIERARCHICAL = 'hierarchical' // 层级协作
}

/**
 * 协作消息接口
 */
export interface CollaborationMessage {
  from: string;
  to: string;
  content: string;
  timestamp: Date;
  metadata?: any;
}

/**
 * 协作会话接口
 */
export interface CollaborationSession {
  id: string;
  name: string;
  type: CollaborationType;
  agents: IAgent[];
  messages: CollaborationMessage[];
  startTime: Date;
  endTime?: Date;
  status: 'active' | 'completed' | 'failed';
  result?: any;
}

/**
 * 协作管理器类
 * 
 * 负责管理代理之间的协作
 */
export class CollaborationManager {
  private sessions: Map<string, CollaborationSession> = new Map();
  private llmManager: LLMManager;
  
  // 事件发射器
  private _onSessionStarted = new vscode.EventEmitter<CollaborationSession>();
  private _onSessionEnded = new vscode.EventEmitter<CollaborationSession>();
  private _onMessageSent = new vscode.EventEmitter<CollaborationMessage>();
  
  // 事件
  public readonly onSessionStarted = this._onSessionStarted.event;
  public readonly onSessionEnded = this._onSessionEnded.event;
  public readonly onMessageSent = this._onMessageSent.event;
  
  /**
   * 构造函数
   * 
   * @param llmManager LLM管理器
   */
  constructor(llmManager: LLMManager) {
    this.llmManager = llmManager;
  }
  
  /**
   * 创建协作会话
   * 
   * @param name 会话名称
   * @param type 协作类型
   * @param agents 参与协作的代理
   * @returns 协作会话
   */
  public createSession(name: string, type: CollaborationType, agents: IAgent[]): CollaborationSession {
    const id = `session_${Date.now()}`;
    const session: CollaborationSession = {
      id,
      name,
      type,
      agents,
      messages: [],
      startTime: new Date(),
      status: 'active'
    };
    
    this.sessions.set(id, session);
    this._onSessionStarted.fire(session);
    
    return session;
  }
  
  /**
   * 获取协作会话
   * 
   * @param id 会话ID
   * @returns 协作会话，如果不存在则返回null
   */
  public getSession(id: string): CollaborationSession | null {
    return this.sessions.get(id) || null;
  }
  
  /**
   * 获取所有协作会话
   * 
   * @returns 所有协作会话
   */
  public getAllSessions(): CollaborationSession[] {
    return Array.from(this.sessions.values());
  }
  
  /**
   * 发送协作消息
   * 
   * @param sessionId 会话ID
   * @param fromAgentId 发送代理ID
   * @param toAgentId 接收代理ID
   * @param content 消息内容
   * @param metadata 元数据
   * @returns 协作消息
   */
  public async sendMessage(
    sessionId: string,
    fromAgentId: string,
    toAgentId: string,
    content: string,
    metadata?: any
  ): Promise<CollaborationMessage> {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new Error(`协作会话不存在: ${sessionId}`);
    }
    
    const message: CollaborationMessage = {
      from: fromAgentId,
      to: toAgentId,
      content,
      timestamp: new Date(),
      metadata
    };
    
    session.messages.push(message);
    this._onMessageSent.fire(message);
    
    return message;
  }
  
  /**
   * 执行顺序协作
   * 
   * @param sessionId 会话ID
   * @param input 初始输入
   * @returns 协作结果
   */
  public async executeSequentialCollaboration(
    sessionId: string,
    input: AgentInput
  ): Promise<AgentOutput[]> {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new Error(`协作会话不存在: ${sessionId}`);
    }
    
    if (session.type !== CollaborationType.SEQUENTIAL) {
      throw new Error(`会话类型不是顺序协作: ${session.type}`);
    }
    
    const results: AgentOutput[] = [];
    let currentInput = input;
    
    // 按顺序让每个代理处理输入
    for (const agent of session.agents) {
      // 设置代理状态为忙碌
      agent.setState(AgentState.BUSY);
      
      try {
        // 处理输入
        const output = await agent.process(currentInput);
        results.push(output);
        
        // 将当前代理的输出作为下一个代理的输入
        currentInput = {
          message: output.message,
          context: {
            ...currentInput.context,
            previousAgent: {
              id: agent.id,
              name: agent.name,
              role: agent.role
            },
            previousOutput: output
          },
          files: currentInput.files
        };
        
        // 记录协作消息
        if (session.agents.indexOf(agent) < session.agents.length - 1) {
          const nextAgent = session.agents[session.agents.indexOf(agent) + 1];
          await this.sendMessage(
            sessionId,
            agent.id,
            nextAgent.id,
            output.message,
            { output }
          );
        }
        
        // 恢复代理状态为空闲
        agent.setState(AgentState.IDLE);
      } catch (error) {
        // 设置代理状态为错误
        agent.setState(AgentState.ERROR);
        
        // 记录错误
        console.error(`代理 ${agent.id} 处理失败:`, error);
        
        // 结束会话
        session.status = 'failed';
        session.endTime = new Date();
        session.result = {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          results
        };
        
        this._onSessionEnded.fire(session);
        
        throw error;
      }
    }
    
    // 完成会话
    session.status = 'completed';
    session.endTime = new Date();
    session.result = {
      success: true,
      results
    };
    
    this._onSessionEnded.fire(session);
    
    return results;
  }
  
  /**
   * 执行并行协作
   * 
   * @param sessionId 会话ID
   * @param input 初始输入
   * @returns 协作结果
   */
  public async executeParallelCollaboration(
    sessionId: string,
    input: AgentInput
  ): Promise<AgentOutput[]> {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new Error(`协作会话不存在: ${sessionId}`);
    }
    
    if (session.type !== CollaborationType.PARALLEL) {
      throw new Error(`会话类型不是并行协作: ${session.type}`);
    }
    
    // 并行处理
    const processingPromises = session.agents.map(async (agent) => {
      // 设置代理状态为忙碌
      agent.setState(AgentState.BUSY);
      
      try {
        // 处理输入
        const output = await agent.process(input);
        
        // 恢复代理状态为空闲
        agent.setState(AgentState.IDLE);
        
        return output;
      } catch (error) {
        // 设置代理状态为错误
        agent.setState(AgentState.ERROR);
        
        // 记录错误
        console.error(`代理 ${agent.id} 处理失败:`, error);
        
        throw error;
      }
    });
    
    try {
      // 等待所有代理处理完成
      const results = await Promise.all(processingPromises);
      
      // 完成会话
      session.status = 'completed';
      session.endTime = new Date();
      session.result = {
        success: true,
        results
      };
      
      this._onSessionEnded.fire(session);
      
      return results;
    } catch (error) {
      // 结束会话
      session.status = 'failed';
      session.endTime = new Date();
      session.result = {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
      
      this._onSessionEnded.fire(session);
      
      throw error;
    }
  }
  
  /**
   * 执行层级协作
   * 
   * @param sessionId 会话ID
   * @param input 初始输入
   * @param coordinatorAgentId 协调者代理ID
   * @returns 协作结果
   */
  public async executeHierarchicalCollaboration(
    sessionId: string,
    input: AgentInput,
    coordinatorAgentId: string
  ): Promise<AgentOutput> {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new Error(`协作会话不存在: ${sessionId}`);
    }
    
    if (session.type !== CollaborationType.HIERARCHICAL) {
      throw new Error(`会话类型不是层级协作: ${session.type}`);
    }
    
    // 获取协调者代理
    const coordinator = session.agents.find(agent => agent.id === coordinatorAgentId);
    if (!coordinator) {
      throw new Error(`协调者代理不存在: ${coordinatorAgentId}`);
    }
    
    // 获取工作者代理
    const workers = session.agents.filter(agent => agent.id !== coordinatorAgentId);
    
    // 设置协调者状态为忙碌
    coordinator.setState(AgentState.BUSY);
    
    try {
      // 协调者处理输入
      const coordinatorOutput = await coordinator.process({
        ...input,
        context: {
          ...input.context,
          collaborationMode: 'hierarchical',
          workers: workers.map(worker => ({
            id: worker.id,
            name: worker.name,
            role: worker.role,
            capabilities: worker.capabilities
          }))
        }
      });
      
      // 解析协调者输出，获取任务分配
      const tasks = this.parseCoordinatorOutput(coordinatorOutput);
      
      // 分配任务给工作者
      const workerResults: AgentOutput[] = [];
      
      for (const task of tasks) {
        const worker = workers.find(w => w.id === task.assignedTo);
        if (!worker) {
          throw new Error(`工作者代理不存在: ${task.assignedTo}`);
        }
        
        // 设置工作者状态为忙碌
        worker.setState(AgentState.BUSY);
        
        try {
          // 工作者处理任务
          const workerInput: AgentInput = {
            message: task.description,
            context: {
              ...input.context,
              task,
              coordinator: {
                id: coordinator.id,
                name: coordinator.name,
                role: coordinator.role
              }
            },
            files: input.files
          };
          
          const workerOutput = await worker.process(workerInput);
          workerResults.push(workerOutput);
          
          // 记录协作消息
          await this.sendMessage(
            sessionId,
            worker.id,
            coordinator.id,
            workerOutput.message,
            { task, output: workerOutput }
          );
          
          // 恢复工作者状态为空闲
          worker.setState(AgentState.IDLE);
        } catch (error) {
          // 设置工作者状态为错误
          worker.setState(AgentState.ERROR);
          
          // 记录错误
          console.error(`工作者代理 ${worker.id} 处理失败:`, error);
          
          // 继续处理其他任务
          workerResults.push({
            message: `处理任务失败: ${error instanceof Error ? error.message : String(error)}`,
            state: AgentState.ERROR,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
      
      // 协调者整合结果
      const finalInput: AgentInput = {
        message: input.message,
        context: {
          ...input.context,
          workerResults,
          originalInput: input
        },
        files: input.files
      };
      
      const finalOutput = await coordinator.process(finalInput);
      
      // 恢复协调者状态为空闲
      coordinator.setState(AgentState.IDLE);
      
      // 完成会话
      session.status = 'completed';
      session.endTime = new Date();
      session.result = {
        success: true,
        coordinatorOutput: finalOutput,
        workerResults
      };
      
      this._onSessionEnded.fire(session);
      
      return finalOutput;
    } catch (error) {
      // 设置协调者状态为错误
      coordinator.setState(AgentState.ERROR);
      
      // 结束会话
      session.status = 'failed';
      session.endTime = new Date();
      session.result = {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
      
      this._onSessionEnded.fire(session);
      
      throw error;
    }
  }
  
  /**
   * 解析协调者输出，获取任务分配
   * 
   * @param output 协调者输出
   * @returns 任务数组
   */
  private parseCoordinatorOutput(output: AgentOutput): { assignedTo: string, description: string }[] {
    // 尝试从动作中获取任务分配
    if (output.actions) {
      const taskAction = output.actions.find(action => action.type === 'task_assignment');
      if (taskAction && Array.isArray(taskAction.payload)) {
        return taskAction.payload;
      }
    }
    
    // 尝试从消息中解析任务分配
    const taskRegex = /任务分配：\s*\n([\s\S]*?)(?:\n\n|$)/g;
    const match = taskRegex.exec(output.message);
    if (match && match[1]) {
      const taskLines = match[1].split('\n').filter(line => line.trim());
      return taskLines.map(line => {
        const [assignedTo, description] = line.split(':').map(s => s.trim());
        return { assignedTo, description };
      });
    }
    
    // 如果无法解析，返回空数组
    return [];
  }
  
  /**
   * 结束协作会话
   * 
   * @param sessionId 会话ID
   * @param success 是否成功
   * @param result 结果
   */
  public endSession(sessionId: string, success: boolean, result?: any): void {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new Error(`协作会话不存在: ${sessionId}`);
    }
    
    session.status = success ? 'completed' : 'failed';
    session.endTime = new Date();
    session.result = result;
    
    this._onSessionEnded.fire(session);
  }
  
  /**
   * 销毁协作管理器
   */
  public dispose(): void {
    this._onSessionStarted.dispose();
    this._onSessionEnded.dispose();
    this._onMessageSent.dispose();
  }
}