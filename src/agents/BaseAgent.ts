import * as vscode from 'vscode';
import { IAgent, AgentRole, AgentCapability, AgentState, AgentConfig, AgentInput, AgentOutput, AgentAction } from './IAgent';
import { CollaborationPromptGenerator, CollaborationType } from './collaboration';

/**
 * 基础代理类，实现IAgent接口的基本功能
 */
export abstract class BaseAgent implements IAgent {
    public id: string;
    public name: string;
    public role: AgentRole;
    public capabilities: AgentCapability[];
    public state: AgentState;
    
    protected _config: AgentConfig;
    protected _disposables: vscode.Disposable[];
    protected _collaborationSessions: Map<string, { type: CollaborationType, agents: IAgent[] }>;
    
    constructor() {
        this.id = '';
        this.name = '';
        this.role = AgentRole.CUSTOM;
        this.capabilities = [];
        this.state = AgentState.IDLE;
        this._config = {} as AgentConfig;
        this._disposables = [];
        this._collaborationSessions = new Map();
    }
    
    /**
     * 初始化代理
     * @param config 代理配置
     */
    public async initialize(config: AgentConfig): Promise<void> {
        this.id = config.id || `agent-${Date.now()}`;
        this.name = config.name;
        this.role = config.role;
        this.capabilities = config.capabilities || [];
        this._config = config;
        
        this.setState(AgentState.INITIALIZING);
        
        try {
            await this.onInitialize();
            this.setState(AgentState.IDLE);
        } catch (error) {
            console.error(`Error initializing agent ${this.id}:`, error);
            this.setState(AgentState.ERROR);
            throw error;
        }
    }
    
    /**
     * 处理输入
     * @param input 代理输入
     * @returns 代理输出
     */
    public async process(input: AgentInput): Promise<AgentOutput> {
        this.setState(AgentState.PROCESSING);
        
        try {
            // 构建提示
            const prompt = this.buildPrompt(input);
            
            // 调用LLM获取响应
            const response = await this.callLLM(prompt);
            
            // 解析响应
            const { messages, actions } = this.parseResponse(response);
            
            // 执行动作
            if (actions && actions.length > 0) {
                for (const action of actions) {
                    await this.executeAction(action);
                }
            }
            
            // 创建输出
            const output: AgentOutput = {
                response: messages.join('\n'),
                actions,
                metadata: {
                    ...input.metadata,
                    processedAt: new Date().toISOString()
                }
            };
            
            this.setState(AgentState.IDLE);
            return output;
        } catch (error) {
            console.error(`Error processing input for agent ${this.id}:`, error);
            this.setState(AgentState.ERROR);
            throw error;
        }
    }
    
    /**
     * 构建提示
     * @param input 代理输入
     * @returns 提示字符串
     */
    public buildPrompt(input: AgentInput): string {
        // 基本提示构建逻辑
        let prompt = '';
        
        // 添加系统提示
        if (this._config.systemPrompt) {
            prompt += `${this._config.systemPrompt}\n\n`;
        }
        
        // 添加上下文
        if (input.context) {
            prompt += `上下文:\n${input.context}\n\n`;
        }
        
        // 添加文件内容
        if (input.files && input.files.length > 0) {
            prompt += '文件:\n';
            for (const file of input.files) {
                prompt += `文件路径: ${file.path}\n内容:\n${file.content}\n\n`;
            }
        }
        
        // 添加协作上下文
        if (input.metadata?.collaborationSessionId) {
            const session = this._collaborationSessions.get(input.metadata.collaborationSessionId);
            if (session) {
                let collaborationPrompt = '';
                
                switch (session.type) {
                    case CollaborationType.SEQUENTIAL:
                        collaborationPrompt = CollaborationPromptGenerator.generateSequentialPrompt(
                            session.agents,
                            input.metadata.previousAgentId,
                            input.metadata.nextAgentId
                        );
                        break;
                    case CollaborationType.PARALLEL:
                        collaborationPrompt = CollaborationPromptGenerator.generateParallelPrompt(
                            session.agents
                        );
                        break;
                    case CollaborationType.HIERARCHICAL:
                        if (input.metadata.isCoordinator) {
                            if (input.metadata.isIntegration) {
                                collaborationPrompt = CollaborationPromptGenerator.generateHierarchicalIntegrationPrompt(
                                    session.agents.filter(a => a.id !== this.id),
                                    input.metadata.workerResults || []
                                );
                            } else {
                                collaborationPrompt = CollaborationPromptGenerator.generateHierarchicalCoordinatorPrompt(
                                    session.agents,
                                    session.agents.filter(a => a.id !== this.id)
                                );
                            }
                        } else {
                            const coordinator = session.agents.find(a => a.id === input.metadata.coordinatorAgentId);
                            if (coordinator) {
                                collaborationPrompt = CollaborationPromptGenerator.generateHierarchicalWorkerPrompt(
                                    coordinator,
                                    input.metadata.task || ''
                                );
                            }
                        }
                        break;
                }
                
                if (collaborationPrompt) {
                    prompt += `协作上下文:\n${collaborationPrompt}\n\n`;
                }
            }
        }
        
        // 添加用户提示
        if (input.prompt) {
            prompt += `用户提示: ${input.prompt}\n`;
        }
        
        return prompt;
    }
    
    /**
     * 调用LLM
     * @param prompt 提示字符串
     * @returns LLM响应
     */
    protected async callLLM(prompt: string): Promise<string> {
        // 这里应该实现实际的LLM调用逻辑
        // 子类应该覆盖此方法以使用特定的LLM服务
        throw new Error('Method not implemented.');
    }
    
    /**
     * 解析响应
     * @param response LLM响应
     * @returns 解析后的消息和动作
     */
    public parseResponse(response: string): { messages: string[], actions: AgentAction[] } {
        // 基本响应解析逻辑
        // 子类可以覆盖此方法以实现特定的解析逻辑
        return {
            messages: [response],
            actions: []
        };
    }
    
    /**
     * 执行动作
     * @param action 代理动作
     * @returns 执行结果
     */
    public async executeAction(action: AgentAction): Promise<any> {
        // 基本动作执行逻辑
        // 子类应该覆盖此方法以实现特定的动作执行逻辑
        console.log(`Executing action: ${action.type}`);
        return null;
    }
    
    /**
     * 与其他代理协作
     * @param agents 协作代理数组
     * @param collaborationType 协作类型
     * @param sessionId 协作会话ID
     * @returns 协作结果
     */
    public async collaborate(
        agents: IAgent[],
        collaborationType: CollaborationType = CollaborationType.SEQUENTIAL,
        sessionId: string = `collab-${Date.now()}`
    ): Promise<AgentOutput> {
        console.log(`Agent ${this.id} collaborating with ${agents.length} agents in session ${sessionId}.`);
        
        // 保存协作会话信息
        this._collaborationSessions.set(sessionId, {
            type: collaborationType,
            agents: [this, ...agents]
        });
        
        // 根据协作类型执行不同的协作逻辑
        let output: AgentOutput;
        
        switch (collaborationType) {
            case CollaborationType.SEQUENTIAL:
                output = await this.executeSequentialCollaboration(agents, sessionId);
                break;
            case CollaborationType.PARALLEL:
                output = await this.executeParallelCollaboration(agents, sessionId);
                break;
            case CollaborationType.HIERARCHICAL:
                output = await this.executeHierarchicalCollaboration(agents, sessionId);
                break;
            default:
                throw new Error(`Unsupported collaboration type: ${collaborationType}`);
        }
        
        // 清理协作会话
        this._collaborationSessions.delete(sessionId);
        
        return output;
    }
    
    /**
     * 执行顺序协作
     * @param agents 协作代理数组
     * @param sessionId 协作会话ID
     * @returns 协作结果
     */
    protected async executeSequentialCollaboration(agents: IAgent[], sessionId: string): Promise<AgentOutput> {
        // 初始输入
        let input: AgentInput = {
            prompt: `这是一个顺序协作会话 ${sessionId}。请处理以下任务。`,
            metadata: {
                collaborationSessionId: sessionId,
                collaborationType: CollaborationType.SEQUENTIAL
            }
        };
        
        // 当前代理处理
        let output = await this.process(input);
        
        // 顺序处理每个代理
        for (let i = 0; i < agents.length; i++) {
            const agent = agents[i];
            const nextAgent = i < agents.length - 1 ? agents[i + 1] : null;
            
            // 准备输入
            input = {
                prompt: output.response,
                context: `这是来自 ${this.name} (${this.role}) 的输出。`,
                metadata: {
                    ...output.metadata,
                    collaborationSessionId: sessionId,
                    collaborationType: CollaborationType.SEQUENTIAL,
                    previousAgentId: i === 0 ? this.id : agents[i - 1].id,
                    nextAgentId: nextAgent ? nextAgent.id : null
                }
            };
            
            // 处理输入
            output = await agent.process(input);
        }
        
        return output;
    }
    
    /**
     * 执行并行协作
     * @param agents 协作代理数组
     * @param sessionId 协作会话ID
     * @returns 协作结果
     */
    protected async executeParallelCollaboration(agents: IAgent[], sessionId: string): Promise<AgentOutput> {
        // 初始输入
        const input: AgentInput = {
            prompt: `这是一个并行协作会话 ${sessionId}。请处理以下任务。`,
            metadata: {
                collaborationSessionId: sessionId,
                collaborationType: CollaborationType.PARALLEL
            }
        };
        
        // 当前代理处理
        const myOutput = await this.process(input);
        
        // 并行处理所有代理
        const agentPromises = agents.map(agent => agent.process({
            ...input,
            context: `这是一个并行协作任务，由 ${this.name} (${this.role}) 发起。`
        }));
        
        // 等待所有代理完成
        const agentOutputs = await Promise.all(agentPromises);
        
        // 合并结果
        const combinedResponse = [
            `${this.name} (${this.role}) 的输出:`,
            myOutput.response,
            ...agentOutputs.map((output, index) => 
                `${agents[index].name} (${agents[index].role}) 的输出:\n${output.response}`
            )
        ].join('\n\n');
        
        // 合并动作
        const combinedActions = [
            ...myOutput.actions,
            ...agentOutputs.flatMap(output => output.actions)
        ];
        
        return {
            response: combinedResponse,
            actions: combinedActions,
            metadata: {
                ...myOutput.metadata,
                parallelResults: agentOutputs.map((output, index) => ({
                    agentId: agents[index].id,
                    output: output.response
                }))
            }
        };
    }
    
    /**
     * 执行层级协作
     * @param agents 协作代理数组
     * @param sessionId 协作会话ID
     * @returns 协作结果
     */
    protected async executeHierarchicalCollaboration(agents: IAgent[], sessionId: string): Promise<AgentOutput> {
        // 初始输入 - 协调者角色
        const coordinatorInput: AgentInput = {
            prompt: `这是一个层级协作会话 ${sessionId}。你是协调者，请分配任务给工作者。`,
            metadata: {
                collaborationSessionId: sessionId,
                collaborationType: CollaborationType.HIERARCHICAL,
                isCoordinator: true
            }
        };
        
        // 当前代理作为协调者处理
        const coordinatorOutput = await this.process(coordinatorInput);
        
        // 解析任务分配
        const taskAssignments = this.parseTaskAssignments(coordinatorOutput.response);
        
        // 分配任务给工作者
        const workerPromises = taskAssignments.map(assignment => {
            const worker = agents.find(agent => agent.id === assignment.agentId);
            if (!worker) {
                throw new Error(`Worker agent with ID ${assignment.agentId} not found.`);
            }
            
            return worker.process({
                prompt: assignment.task,
                context: `这是由协调者 ${this.name} (${this.role}) 分配的任务。`,
                metadata: {
                    collaborationSessionId: sessionId,
                    collaborationType: CollaborationType.HIERARCHICAL,
                    isCoordinator: false,
                    coordinatorAgentId: this.id,
                    task: assignment.task
                }
            });
        });
        
        // 等待所有工作者完成
        const workerOutputs = await Promise.all(workerPromises);
        
        // 整合结果 - 协调者角色
        const integrationInput: AgentInput = {
            prompt: `请整合以下工作者的输出，提供一个综合的结果。`,
            context: `这是来自工作者的输出，需要你作为协调者进行整合。`,
            metadata: {
                collaborationSessionId: sessionId,
                collaborationType: CollaborationType.HIERARCHICAL,
                isCoordinator: true,
                isIntegration: true,
                workerResults: workerOutputs.map((output, index) => ({
                    agentId: taskAssignments[index].agentId,
                    output: output.response
                }))
            }
        };
        
        // 当前代理作为协调者整合结果
        return await this.process(integrationInput);
    }
    
    /**
     * 解析任务分配
     * @param response 协调者响应
     * @returns 任务分配数组
     */
    protected parseTaskAssignments(response: string): Array<{ agentId: string, task: string }> {
        // 尝试解析JSON格式的任务分配
        const actionMatch = response.match(/\[ACTION:task_assignment\]\s*\n([\s\S]*?)\n\[\/ACTION\]/i);
        if (actionMatch) {
            try {
                const assignments = JSON.parse(actionMatch[1]);
                return assignments.map((assignment: any) => ({
                    agentId: assignment.assignedTo,
                    task: assignment.description
                }));
            } catch (error) {
                console.error('Failed to parse task assignments JSON:', error);
            }
        }
        
        // 尝试解析文本格式的任务分配
        const assignments: Array<{ agentId: string, task: string }> = [];
        const lines = response.split('\n');
        let currentAgentId: string | null = null;
        let currentTask: string[] = [];
        
        for (const line of lines) {
            // 检查是否是新的任务分配行
            const assignmentMatch = line.match(/^([a-zA-Z0-9-_]+):\s*(.+)$/);
            if (assignmentMatch) {
                // 如果已有正在处理的任务，保存它
                if (currentAgentId && currentTask.length > 0) {
                    assignments.push({
                        agentId: currentAgentId,
                        task: currentTask.join('\n')
                    });
                    currentTask = [];
                }
                
                // 开始新任务
                currentAgentId = assignmentMatch[1];
                currentTask.push(assignmentMatch[2]);
            } else if (currentAgentId && line.trim()) {
                // 继续当前任务
                currentTask.push(line);
            }
        }
        
        // 保存最后一个任务
        if (currentAgentId && currentTask.length > 0) {
            assignments.push({
                agentId: currentAgentId,
                task: currentTask.join('\n')
            });
        }
        
        return assignments;
    }
    
    /**
     * 获取代理状态
     * @returns 代理状态
     */
    public getState(): AgentState {
        return this.state;
    }
    
    /**
     * 设置代理状态
     * @param state 代理状态
     */
    public setState(state: AgentState): void {
        this.state = state;
    }
    
    /**
     * 初始化回调
     * 子类可以覆盖此方法以实现特定的初始化逻辑
     */
    protected async onInitialize(): Promise<void> {
        // 默认实现为空
    }
    
    /**
     * 释放资源
     */
    public dispose(): void {
        // 释放所有订阅
        this._disposables.forEach(d => d.dispose());
        this._disposables = [];
        
        // 清理协作会话
        this._collaborationSessions.clear();
    }
}