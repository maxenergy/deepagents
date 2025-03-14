import { 
  IAgent, 
  AgentRole, 
  AgentCapability, 
  AgentState, 
  AgentConfig, 
  AgentInput, 
  AgentOutput,
  AgentAction
} from './AgentManager';
import { LLMManager } from '../llm/LLMManager';
import { ToolManager } from '../tools/ToolManager';

/**
 * 测试员代理类
 * 
 * 负责测试用例设计和执行
 */
export class TesterAgent implements IAgent {
  public id: string;
  public name: string;
  public role: AgentRole;
  public capabilities: AgentCapability[];
  public state: AgentState;
  
  private llmManager: LLMManager;
  private toolManager: ToolManager;
  private systemPrompt: string;
  private provider?: string;
  private model?: string;
  private context: any = {};

  /**
   * 构造函数
   * 
   * @param id 代理ID
   * @param llmManager LLM管理器
   * @param toolManager 工具管理器
   */
  constructor(id: string, llmManager: LLMManager, toolManager: ToolManager) {
    this.id = id;
    this.name = '测试员';
    this.role = AgentRole.TESTER;
    this.capabilities = [
      AgentCapability.TESTING,
      AgentCapability.CODE_REVIEW
    ];
    this.state = AgentState.IDLE;
    this.llmManager = llmManager;
    this.toolManager = toolManager;
    this.systemPrompt = this.getDefaultSystemPrompt();
  }

  /**
   * 获取默认系统提示
   * 
   * @returns 默认系统提示
   */
  private getDefaultSystemPrompt(): string {
    return `你是一名经验丰富的软件测试员，负责测试用例设计和执行。
你的职责包括：
1. 设计测试用例和测试计划
2. 编写自动化测试脚本
3. 执行测试并报告结果
4. 发现和跟踪bug
5. 确保软件质量和可靠性

在回答问题时，你应该：
- 提供全面的测试策略，包括单元测试、集成测试和端到端测试
- 设计有效的测试用例，覆盖正常路径和边缘情况
- 提供清晰的测试步骤和预期结果
- 分析测试结果并提出改进建议
- 遵循测试最佳实践和方法论

请使用专业的测试术语和方法论，如测试驱动开发、行为驱动开发、测试金字塔等。`;
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
    
    console.log(`初始化测试员代理: ${this.name}`);
  }

  /**
   * 处理输入
   * 
   * @param input 代理输入
   * @returns 代理输出
   */
  public async process(input: AgentInput): Promise<AgentOutput> {
    console.log(`测试员代理处理输入: ${input.message}`);
    
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
          temperature: 0.4,
          maxTokens: 2500,
          model: this.model
        }
      );
      
      // 解析响应，提取测试用例和动作
      const { message, actions } = this.parseResponse(response.content);
      
      // 执行动作
      if (actions && actions.length > 0) {
        for (const action of actions) {
          await this.executeAction(action);
        }
      }
      
      // 设置状态为空闲
      this.state = AgentState.IDLE;
      
      return {
        message: message,
        actions,
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
    
    // 添加可用工具信息
    const tools = this.toolManager.getAllTools();
    if (tools.length > 0) {
      prompt += `可用工具:\n`;
      tools.forEach(tool => {
        prompt += `- ${tool.name}: ${tool.description}\n`;
      });
      prompt += `\n`;
    }
    
    // 添加动作格式说明
    prompt += `如果你需要执行特定操作，请使用以下格式：
[ACTION:action_type]
action_payload
[/ACTION]

可用的动作类型包括：
- testing: 执行测试
- code_analysis: 分析代码
- bug_report: 报告bug

例如：
[ACTION:testing]
{
  "type": "unit",
  "target": "example.ts",
  "testFile": "example.test.ts",
  "testCases": [
    {
      "name": "should return correct value",
      "input": "test input",
      "expected": "expected output"
    }
  ]
}
[/ACTION]

`;
    
    // 添加用户消息
    prompt += `用户: ${input.message}\n\n测试员:`;
    
    return prompt;
  }

  /**
   * 解析响应
   * 
   * @param response LLM响应
   * @returns 解析后的消息和动作
   */
  private parseResponse(response: string): { message: string, actions?: AgentAction[] } {
    const actions: AgentAction[] = [];
    
    // 提取动作
    const actionRegex = /\[ACTION:(\w+)\]([\s\S]*?)\[\/ACTION\]/g;
    let message = response;
    
    let match;
    while ((match = actionRegex.exec(response)) !== null) {
      const actionType = match[1];
      const actionPayload = match[2].trim();
      
      try {
        const payload = JSON.parse(actionPayload);
        actions.push({
          type: actionType,
          payload
        });
      } catch (error) {
        console.error(`解析动作负载失败: ${error}`);
        actions.push({
          type: actionType,
          payload: actionPayload
        });
      }
      
      // 从消息中移除动作
      message = message.replace(match[0], '');
    }
    
    return {
      message: message.trim(),
      actions: actions.length > 0 ? actions : undefined
    };
  }

  /**
   * 执行动作
   * 
   * @param action 代理动作
   */
  private async executeAction(action: AgentAction): Promise<void> {
    console.log(`执行动作: ${action.type}`);
    
    switch (action.type) {
      case 'testing':
        // 这里将实现测试执行逻辑
        const testResult = await this.toolManager.executeTool('testing', action.payload);
        console.log(`测试结果: ${JSON.stringify(testResult)}`);
        break;
      
      case 'code_analysis':
        // 这里将实现代码分析逻辑
        const analysisResult = await this.toolManager.executeTool('code_analysis', action.payload);
        console.log(`代码分析结果: ${JSON.stringify(analysisResult)}`);
        break;
      
      case 'bug_report':
        // 这里将实现bug报告逻辑
        console.log(`报告bug: ${JSON.stringify(action.payload)}`);
        break;
      
      default:
        console.warn(`未知动作类型: ${action.type}`);
    }
  }

  /**
   * 与其他代理协作
   * 
   * @param agents 其他代理
   */
  public async collaborate(agents: IAgent[]): Promise<void> {
    console.log(`测试员代理与 ${agents.length} 个代理协作`);
    
    // 这里将实现与其他代理的协作逻辑
    // 例如，与开发者代理协作修复bug
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