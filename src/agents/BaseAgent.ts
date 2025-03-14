import * as vscode from 'vscode';
import { IAgent, AgentRole, AgentCapability, AgentState, AgentConfig, AgentInput, AgentOutput, AgentAction } from './IAgent';

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
    
    constructor() {
        this.id = '';
        this.name = '';
        this.role = AgentRole.CUSTOM;
        this.capabilities = [];
        this.state = AgentState.IDLE;
        this._config = {} as AgentConfig;
        this._disposables = [];
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
     */
    public async collaborate(agents: IAgent[]): Promise<void> {
        // 基本协作逻辑
        // 子类应该覆盖此方法以实现特定的协作逻辑
        console.log(`Agent ${this.id} collaborating with ${agents.length} agents.`);
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
    }
}

