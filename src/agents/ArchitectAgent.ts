import { 
  IAgent, 
  AgentRole, 
  AgentCapability, 
  AgentState, 
  AgentConfig, 
  AgentInput, 
  AgentOutput 
} from './AgentManager';
import { LLMManager } from '../llm/LLMManager';

/**
 * 架构师代理类
 * 
 * 负责系统设计和技术选型
 */
export class ArchitectAgent implements IAgent {
  public id: string;
  public name: string;
  public role: AgentRole;
  public capabilities: AgentCapability[];
  public state: AgentState;
  
  private llmManager: LLMManager;
  private systemPrompt: string;
  private provider?: string;
  private model?: string;
  private context: any = {};

  /**
   * 构造函数
   * 
   * @param id 代理ID
   * @param llmManager LLM管理器
   */
  constructor(id: string, llmManager: LLMManager) {
    this.id = id;
    this.name = '架构师';
    this.role = AgentRole.ARCHITECT;
    this.capabilities = [
      AgentCapability.DESIGN,
      AgentCapability.CODE_REVIEW
    ];
    this.state = AgentState.IDLE;
    this.llmManager = llmManager;
    this.systemPrompt = this.getDefaultSystemPrompt();
  }

  /**
   * 获取默认系统提示
   * 
   * @returns 默认系统提示
   */
  private getDefaultSystemPrompt(): string {
    return `你是一名经验丰富的软件架构师，负责系统设计和技术选型。
你的职责包括：
1. 设计系统架构和组件
2. 选择适当的技术栈和框架
3. 定义接口和数据模型
4. 确保系统的可扩展性、性能和安全性
5. 指导开发团队实现架构

在回答问题时，你应该：
- 提供清晰的架构图和组件说明
- 解释技术选择的理由
- 考虑非功能性需求（如性能、安全性、可维护性）
- 评估技术风险和缓解策略
- 平衡技术债务和交付速度

请使用专业的架构设计术语和方法论，如微服务、领域驱动设计、SOLID原则等。`;
  }

  /**
   * 初始化代理
   * 
   * @param config 代理配置
   */
  public async initialize(config: AgentConfig): Promise<void> {
    this.name = config.name || this.name;
    this.systemPrompt = config.systemPrompt || this.systemPrompt;
    this.provider = config.provider;
    this.model = config.model;
    
    console.log(`初始化架构师代理: ${this.name}`);
  }

  /**
   * 处理输入
   * 
   * @param input 代理输入
   * @returns 代理输出
   */
  public async process(input: AgentInput): Promise<AgentOutput> {
    console.log(`架构师代理处理输入: ${input.message}`);
    
    try {
      // 设置状态为忙碌
      this.state = AgentState.BUSY;
      
      // 更新上下文
      if (input.context) {
        this.context = { ...this.context, ...input.context };
      }
      
      // 构建提示
      const prompt = this.buildPrompt(input);
      
      // 调用LLM
      const response = await this.llmManager.query(
        prompt,
        {
          temperature: 0.5,
          maxTokens: 2000,
          model: this.model
        },
        this.provider
      );
      
      // 设置状态为空闲
      this.state = AgentState.IDLE;
      
      return {
        message: response.text,
        state: this.state
      };
    } catch (error) {
      // 设置状态为错误
      this.state = AgentState.ERROR;
      
      return {
        message: '处理输入时发生错误',
        state: this.state,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 构建提示
   * 
   * @param input 代理输入
   * @returns 提示字符串
   */
  private buildPrompt(input: AgentInput): string {
    // 构建基本提示
    let prompt = `${this.systemPrompt}\n\n`;
    
    // 添加上下文信息
    if (Object.keys(this.context).length > 0) {
      prompt += `上下文信息:\n${JSON.stringify(this.context, null, 2)}\n\n`;
    }
    
    // 添加文件信息
    if (input.files && input.files.length > 0) {
      prompt += `相关文件:\n${input.files.join('\n')}\n\n`;
    }
    
    // 添加用户消息
    prompt += `用户: ${input.message}\n\n架构师:`;
    
    return prompt;
  }

  /**
   * 与其他代理协作
   * 
   * @param agents 其他代理
   */
  public async collaborate(agents: IAgent[]): Promise<void> {
    console.log(`架构师代理与 ${agents.length} 个代理协作`);
    
    // 这里将实现与其他代理的协作逻辑
    // 例如，与开发者代理协作确定实现细节
  }

  /**
   * 获取代理状态
   * 
   * @returns 代理状态
   */
  public getState(): AgentState {
    return this.state;
  }

  /**
   * 设置代理状态
   * 
   * @param state 代理状态
   */
  public setState(state: AgentState): void {
    this.state = state;
  }
}