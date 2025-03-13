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
 * 产品经理代理类
 * 
 * 负责需求分析和产品规划
 */
export class ProductManagerAgent implements IAgent {
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
    this.name = '产品经理';
    this.role = AgentRole.PRODUCT_MANAGER;
    this.capabilities = [
      AgentCapability.REQUIREMENTS,
      AgentCapability.DESIGN
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
    return `你是一名经验丰富的产品经理，负责需求分析和产品规划。
你的职责包括：
1. 理解用户需求并转化为明确的产品需求
2. 创建用户故事和用例
3. 定义产品功能和优先级
4. 制定产品路线图
5. 与开发团队协作，确保产品按计划实现

在回答问题时，你应该：
- 提出深入的问题以澄清需求
- 考虑用户体验和商业价值
- 提供结构化的需求文档
- 考虑技术可行性
- 平衡短期目标和长期愿景

请使用专业的产品管理术语和方法论，如用户故事、MVP、产品路线图等。`;
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
    
    console.log(`初始化产品经理代理: ${this.name}`);
  }

  /**
   * 处理输入
   * 
   * @param input 代理输入
   * @returns 代理输出
   */
  public async process(input: AgentInput): Promise<AgentOutput> {
    console.log(`产品经理代理处理输入: ${input.message}`);
    
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
          temperature: 0.7,
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
    prompt += `用户: ${input.message}\n\n产品经理:`;
    
    return prompt;
  }

  /**
   * 与其他代理协作
   * 
   * @param agents 其他代理
   */
  public async collaborate(agents: IAgent[]): Promise<void> {
    console.log(`产品经理代理与 ${agents.length} 个代理协作`);
    
    // 这里将实现与其他代理的协作逻辑
    // 例如，与架构师代理协作确定技术可行性
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