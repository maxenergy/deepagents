import { v4 as uuidv4 } from 'uuid';
import { AgentRole, AgentState, IAgent } from '../IAgent';
import { 
  IProductManagerAgent, 
  ProductManagerAgentConfig, 
  ProductManagerAgentInput, 
  ProductManagerAgentOutput,
  Requirement,
  RequirementType,
  RequirementPriority,
  RequirementStatus,
  UserStory,
  ProductSpec
} from './IProductManagerAgent';
import { LLMManager } from '../../llm/LLMManager';
import { ILLMProvider } from '../../llm/ILLMProvider';
import { Logger } from '../../utils/Logger';

/**
 * 产品经理代理实现类
 */
export class ProductManagerAgent implements IProductManagerAgent {
  id: string;
  name: string;
  role: AgentRole;
  capabilities: string[];
  state: AgentState;
  
  private config: ProductManagerAgentConfig;
  private llmManager: LLMManager;
  private llmProvider: ILLMProvider | null = null;
  private requirements: Map<string, Requirement> = new Map();
  private userStories: Map<string, UserStory> = new Map();
  private productSpecs: Map<string, ProductSpec> = new Map();
  private logger: Logger;

  /**
   * 构造函数
   * @param name 代理名称
   * @param llmManager LLM管理器
   */
  constructor(name: string, llmManager: LLMManager) {
    this.id = uuidv4();
    this.name = name;
    this.role = AgentRole.PRODUCT_MANAGER;
    this.capabilities = [
      'requirements_analysis',
      'user_story_creation',
      'product_specification',
      'roadmap_generation'
    ];
    this.state = AgentState.IDLE;
    this.llmManager = llmManager;
    this.config = {
      id: this.id,
      name: this.name,
      role: this.role,
      requirementTemplates: {
        [RequirementType.FUNCTIONAL]: '系统应该能够...',
        [RequirementType.NON_FUNCTIONAL]: '系统应该...',
        [RequirementType.USER_STORY]: '作为一个...，我想要...，以便...',
        [RequirementType.BUSINESS]: '为了实现业务目标...',
        [RequirementType.TECHNICAL]: '系统需要使用...',
        [RequirementType.EPIC]: '作为一个大型功能...'
      },
      userStoryTemplate: '作为一个{role}，我想要{action}，以便{benefit}',
      prioritizationStrategy: '基于业务价值和技术复杂度',
      stakeholders: ['产品所有者', '开发团队', '用户代表', '业务分析师']
    };
    this.logger = new Logger('ProductManagerAgent');
  }

  /**
   * 初始化代理
   * @param config 代理配置
   */
  async initialize(config: ProductManagerAgentConfig): Promise<void> {
    this.logger.info(`Initializing product manager agent: ${this.name}`);
    this.config = { ...this.config, ...config };
    this.state = AgentState.INITIALIZING;
    
    try {
      // 获取LLM提供者
      const providers = this.llmManager.getAllProviders();
      if (providers.length === 0) {
        throw new Error('No LLM provider available');
      }
      
      this.llmProvider = providers[0]; // 使用第一个可用的提供者
      
      this.state = AgentState.IDLE; // 设置为就绪状态
      this.logger.info(`Product manager agent initialized: ${this.name}`);
    } catch (error) {
      this.state = AgentState.ERROR;
      this.logger.error(`Failed to initialize product manager agent: ${error}`);
      throw error;
    }
  }

  /**
   * 处理输入
   * @param input 代理输入
   * @returns 代理输出
   */
  async process(input: ProductManagerAgentInput): Promise<ProductManagerAgentOutput> {
    this.logger.info(`Processing input for product manager agent: ${this.name}`);
    this.state = AgentState.PROCESSING;
    
    try {
      // 导入现有需求和用户故事
      if (input.existingRequirements) {
        for (const req of input.existingRequirements) {
          this.requirements.set(req.id, req);
        }
      }
      
      if (input.existingUserStories) {
        for (const story of input.existingUserStories) {
          this.userStories.set(story.id, story);
        }
      }
      
      let result: ProductManagerAgentOutput = {
        agentId: this.id,
        timestamp: new Date(),
        status: 'success',
        message: 'Processing completed'
      };
      
      // 根据输入执行不同操作
      if (input.projectDescription) {
        // 分析项目描述，生成需求
        const requirements = await this.analyzeProjectDescription(input.projectDescription);
        result.generatedRequirements = requirements;
        
        // 基于需求创建用户故事
        const userStories = await this.createUserStories(requirements);
        result.generatedUserStories = userStories;
        
        // 生成产品规格
        const productSpec = await this.generateProductSpec(requirements, userStories);
        result.productSpec = productSpec;
        
        // 生成路线图
        const roadmap = await this.generateRoadmap(requirements);
        result.roadmap = roadmap;
      } else if (input.userFeedback && input.userFeedback.length > 0) {
        // 分析用户反馈，生成新需求
        const newRequirements = await this.analyzeUserFeedback(input.userFeedback);
        result.generatedRequirements = newRequirements;
      } else if (input.marketResearch) {
        // 分析市场研究，生成新需求
        const newRequirements = await this.analyzeMarketResearch(input.marketResearch);
        result.generatedRequirements = newRequirements;
      } else if (input.existingRequirements) {
        // 优先级排序现有需求
        const prioritizedRequirements = await this.prioritizeRequirements(input.existingRequirements);
        result.generatedRequirements = prioritizedRequirements;
      }
      
      this.state = AgentState.IDLE; // 设置为就绪状态
      return result;
    } catch (error) {
      this.state = AgentState.ERROR;
      this.logger.error(`Error processing input: ${error}`);
      return {
        agentId: this.id,
        timestamp: new Date(),
        status: 'error',
        message: `Error: ${error}`
      };
    }
  }

  /**
   * 与其他代理协作
   * @param agents 代理列表
   */
  async collaborate(agents: IAgent[]): Promise<void> {
    this.logger.info(`Collaborating with ${agents.length} agents`);
    // 实现与其他代理的协作逻辑
  }

  /**
   * 获取代理状态
   * @returns 代理状态
   */
  getState(): AgentState {
    return this.state;
  }

  /**
   * 设置代理状态
   * @param state 代理状态
   */
  setState(state: AgentState): void {
    this.state = state;
  }

  /**
   * 分析项目描述
   * @param description 项目描述
   * @returns 需求列表
   */
  async analyzeProjectDescription(description: string): Promise<Requirement[]> {
    this.logger.info('Analyzing project description');
    
    if (!this.llmProvider) {
      throw new Error('LLM provider not initialized');
    }
    
    try {
      // 构建提示
      const prompt = `You are an expert product manager. 
Please analyze the following project description and extract requirements:

Project Description:
${description}

Please output your response in the following format:
\`\`\`json
{
  "requirements": [
    {
      "title": "Requirement title",
      "description": "Detailed description",
      "type": "functional|non_functional|business|technical|user_story|epic",
      "priority": "critical|high|medium|low"
    }
  ]
}
\`\`\``;
      
      // 调用LLM
      const response = await this.callLLM(prompt);
      
      // 解析响应
      const requirements = this.parseRequirementsFromResponse(response);
      
      // 保存需求
      for (const req of requirements) {
        await this.saveRequirement(req);
      }
      
      return requirements;
    } catch (error) {
      this.logger.error(`Error analyzing project description: ${error}`);
      throw error;
    }
  }

  /**
   * 创建用户故事
   * @param requirements 需求列表
   * @returns 用户故事列表
   */
  async createUserStories(requirements: Requirement[]): Promise<UserStory[]> {
    this.logger.info(`Creating user stories from ${requirements.length} requirements`);
    
    if (!this.llmProvider) {
      throw new Error('LLM provider not initialized');
    }
    
    try {
      // 构建提示
      const prompt = `You are an expert product manager. 
Please create user stories from the following requirements:

Requirements:
${JSON.stringify(requirements, null, 2)}

Please output your response in the following format:
\`\`\`json
{
  "userStories": [
    {
      "title": "User story title",
      "description": "Detailed description",
      "asA": "Role",
      "iWant": "Action",
      "soThat": "Benefit",
      "points": 3,
      "priority": "critical|high|medium|low",
      "relatedRequirementIds": ["req-id-1", "req-id-2"]
    }
  ]
}
\`\`\``;
      
      // 调用LLM
      const response = await this.callLLM(prompt);
      
      // 解析响应
      const userStories = this.parseUserStoriesFromResponse(response, requirements);
      
      // 保存用户故事
      for (const story of userStories) {
        this.userStories.set(story.id, story);
      }
      
      return userStories;
    } catch (error) {
      this.logger.error(`Error creating user stories: ${error}`);
      throw error;
    }
  }

  /**
   * 优先级排序需求
   * @param requirements 需求列表
   * @returns 排序后的需求列表
   */
  async prioritizeRequirements(requirements: Requirement[]): Promise<Requirement[]> {
    this.logger.info(`Prioritizing ${requirements.length} requirements`);
    
    if (!this.llmProvider) {
      throw new Error('LLM provider not initialized');
    }
    
    try {
      // 构建提示
      const prompt = `You are an expert product manager. 
Please prioritize the following requirements based on business value and technical complexity:

Requirements:
${JSON.stringify(requirements, null, 2)}

Prioritization Strategy:
${this.config.prioritizationStrategy}

Please output your response in the following format:
\`\`\`json
{
  "prioritizedRequirements": [
    {
      "id": "requirement-id",
      "priority": "critical|high|medium|low",
      "rationale": "Explanation for the priority"
    }
  ]
}
\`\`\``;
      
      // 调用LLM
      const response = await this.callLLM(prompt);
      
      // 解析响应
      const prioritizedRequirements = this.parsePrioritizedRequirementsFromResponse(response, requirements);
      
      // 更新需求优先级
      for (const req of prioritizedRequirements) {
        await this.saveRequirement(req);
      }
      
      return prioritizedRequirements;
    } catch (error) {
      this.logger.error(`Error prioritizing requirements: ${error}`);
      throw error;
    }
  }

  /**
   * 生成产品规格
   * @param requirements 需求列表
   * @param userStories 用户故事列表
   * @returns 产品规格
   */
  async generateProductSpec(
    requirements: Requirement[],
    userStories?: UserStory[]
  ): Promise<ProductSpec> {
    this.logger.info(`Generating product spec from ${requirements.length} requirements`);
    
    if (!this.llmProvider) {
      throw new Error('LLM provider not initialized');
    }
    
    try {
      // 构建提示
      const prompt = `You are an expert product manager. 
Please generate a product specification from the following requirements and user stories:

Requirements:
${JSON.stringify(requirements, null, 2)}

${userStories ? `User Stories:
${JSON.stringify(userStories, null, 2)}` : ''}

Please output your response in the following format:
\`\`\`json
{
  "name": "Product Name",
  "description": "Product Description",
  "version": "1.0.0",
  "sections": [
    {
      "title": "Section Title",
      "content": "Section Content"
    }
  ]
}
\`\`\``;
      
      // 调用LLM
      const response = await this.callLLM(prompt);
      
      // 解析响应
      const productSpec = this.parseProductSpecFromResponse(response, requirements, userStories);
      
      // 保存产品规格
      this.productSpecs.set(productSpec.id, productSpec);
      
      return productSpec;
    } catch (error) {
      this.logger.error(`Error generating product spec: ${error}`);
      throw error;
    }
  }

  /**
   * 生成产品路线图
   * @param requirements 需求列表
   * @returns 产品路线图
   */
  async generateRoadmap(requirements: Requirement[]): Promise<any> {
    this.logger.info(`Generating roadmap from ${requirements.length} requirements`);
    
    if (!this.llmProvider) {
      throw new Error('LLM provider not initialized');
    }
    
    try {
      // 构建提示
      const prompt = `You are an expert product manager. 
Please generate a product roadmap from the following requirements:

Requirements:
${JSON.stringify(requirements, null, 2)}

Please output your response in the following format:
\`\`\`json
{
  "phases": [
    {
      "name": "Phase 1: MVP",
      "duration": "Q1 2023",
      "description": "Phase description",
      "requirements": ["req-id-1", "req-id-2"],
      "deliverables": ["Deliverable 1", "Deliverable 2"]
    }
  ]
}
\`\`\``;
      
      // 调用LLM
      const response = await this.callLLM(prompt);
      
      // 解析响应
      const roadmap = this.parseRoadmapFromResponse(response, requirements);
      
      return roadmap;
    } catch (error) {
      this.logger.error(`Error generating roadmap: ${error}`);
      throw error;
    }
  }

  /**
   * 分析用户反馈
   * @param feedback 用户反馈
   * @returns 新的需求列表
   */
  async analyzeUserFeedback(feedback: any[]): Promise<Requirement[]> {
    this.logger.info(`Analyzing ${feedback.length} user feedback items`);
    
    if (!this.llmProvider) {
      throw new Error('LLM provider not initialized');
    }
    
    try {
      // 构建提示
      const prompt = `You are an expert product manager. 
Please analyze the following user feedback and extract new requirements:

User Feedback:
${JSON.stringify(feedback, null, 2)}

Please output your response in the following format:
\`\`\`json
{
  "requirements": [
    {
      "title": "Requirement title",
      "description": "Detailed description",
      "type": "functional|non_functional|business|technical|user_story|epic",
      "priority": "critical|high|medium|low",
      "source": "feedback-id"
    }
  ]
}
\`\`\``;
      
      // 调用LLM
      const response = await this.callLLM(prompt);
      
      // 解析响应
      const requirements = this.parseRequirementsFromResponse(response);
      
      // 保存需求
      for (const req of requirements) {
        await this.saveRequirement(req);
      }
      
      return requirements;
    } catch (error) {
      this.logger.error(`Error analyzing user feedback: ${error}`);
      throw error;
    }
  }

  /**
   * 分析市场研究
   * @param research 市场研究
   * @returns 新的需求列表
   */
  async analyzeMarketResearch(research: any): Promise<Requirement[]> {
    this.logger.info('Analyzing market research');
    
    if (!this.llmProvider) {
      throw new Error('LLM provider not initialized');
    }
    
    try {
      // 构建提示
      const prompt = `You are an expert product manager. 
Please analyze the following market research and extract new requirements:

Market Research:
${JSON.stringify(research, null, 2)}

Please output your response in the following format:
\`\`\`json
{
  "requirements": [
    {
      "title": "Requirement title",
      "description": "Detailed description",
      "type": "functional|non_functional|business|technical|user_story|epic",
      "priority": "critical|high|medium|low",
      "marketTrend": "Related market trend"
    }
  ]
}
\`\`\``;
      
      // 调用LLM
      const response = await this.callLLM(prompt);
      
      // 解析响应
      const requirements = this.parseRequirementsFromResponse(response);
      
      // 保存需求
      for (const req of requirements) {
        await this.saveRequirement(req);
      }
      
      return requirements;
    } catch (error) {
      this.logger.error(`Error analyzing market research: ${error}`);
      throw error;
    }
  }

  /**
   * 验证需求
   * @param requirements 需求列表
   * @returns 验证结果
   */
  async validateRequirements(
    requirements: Requirement[]
  ): Promise<{
    valid: boolean;
    issues: { requirementId: string; issue: string }[];
  }> {
    this.logger.info(`Validating ${requirements.length} requirements`);
    
    if (!this.llmProvider) {
      throw new Error('LLM provider not initialized');
    }
    
    try {
      // 构建提示
      const prompt = `You are an expert product manager. 
Please validate the following requirements for completeness, clarity, and consistency:

Requirements:
${JSON.stringify(requirements, null, 2)}

Please output your response in the following format:
\`\`\`json
{
  "valid": true|false,
  "issues": [
    {
      "requirementId": "req-id",
      "issue": "Description of the issue"
    }
  ]
}
\`\`\``;
      
      // 调用LLM
      const response = await this.callLLM(prompt);
      
      // 解析响应
      const validationResult = this.parseValidationResultFromResponse(response);
      
      return validationResult;
    } catch (error) {
      this.logger.error(`Error validating requirements: ${error}`);
      throw error;
    }
  }

  /**
   * 获取需求
   * @param id 需求ID
   * @returns 需求
   */
  async getRequirement(id: string): Promise<Requirement | null> {
    return this.requirements.get(id) || null;
  }

  /**
   * 获取所有需求
   * @returns 所有需求
   */
  async getAllRequirements(): Promise<Requirement[]> {
    return Array.from(this.requirements.values());
  }

  /**
   * 保存需求
   * @param requirement 需求
   * @returns 保存的需求
   */
  async saveRequirement(requirement: Requirement): Promise<Requirement> {
    // 如果没有ID，生成一个
    if (!requirement.id) {
      requirement.id = uuidv4();
    }
    
    // 设置时间戳
    if (!requirement.createdAt) {
      requirement.createdAt = new Date();
    }
    requirement.updatedAt = new Date();
    
    // 保存到内存
    this.requirements.set(requirement.id, requirement);
    
    return requirement;
  }

  /**
   * 删除需求
   * @param id 需求ID
   * @returns 是否成功删除
   */
  async deleteRequirement(id: string): Promise<boolean> {
    return this.requirements.delete(id);
  }

  /**
   * 调用LLM
   * @param prompt 提示
   * @returns 响应文本
   */
  private async callLLM(prompt: string): Promise<string> {
    if (!this.llmProvider) {
      throw new Error('LLM provider not initialized');
    }
    
    try {
      const response = await this.llmProvider.query(prompt, {});
      return response.content;
    } catch (error) {
      this.logger.error(`Error calling LLM: ${error}`);
      throw error;
    }
  }

  /**
   * 从响应中解析需求
   * @param response LLM响应
   * @returns 需求列表
   */
  private parseRequirementsFromResponse(response: string): Requirement[] {
    try {
      // 尝试从响应中提取JSON
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/) || 
                        response.match(/```\n([\s\S]*?)\n```/) ||
                        response.match(/{[\s\S]*?}/);
      
      if (!jsonMatch) {
        throw new Error('Could not parse JSON from LLM response');
      }
      
      const jsonStr = jsonMatch[1] || jsonMatch[0];
      const parsed = JSON.parse(jsonStr);
      
      if (!parsed.requirements || !Array.isArray(parsed.requirements)) {
        throw new Error('Invalid response format: missing requirements array');
      }
      
      // 转换为Requirement对象
      return parsed.requirements.map((req: any) => ({
        id: uuidv4(),
        title: req.title,
        description: req.description,
        type: req.type as RequirementType,
        priority: req.priority as RequirementPriority,
        status: RequirementStatus.DRAFT,
        acceptanceCriteria: req.acceptanceCriteria || [],
        dependencies: req.dependencies || [],
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          source: req.source || 'llm',
          marketTrend: req.marketTrend || null
        }
      }));
    } catch (error) {
      this.logger.error(`Error parsing requirements from LLM response: ${error}`);
      throw error;
    }
  }

  /**
   * 从响应中解析用户故事
   * @param response LLM响应
   * @param requirements 相关需求
   * @returns 用户故事列表
   */
  private parseUserStoriesFromResponse(response: string, requirements: Requirement[]): UserStory[] {
    try {
      // 尝试从响应中提取JSON
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/) || 
                        response.match(/```\n([\s\S]*?)\n```/) ||
                        response.match(/{[\s\S]*?}/);
      
      if (!jsonMatch) {
        throw new Error('Could not parse JSON from LLM response');
      }
      
      const jsonStr = jsonMatch[1] || jsonMatch[0];
      const parsed = JSON.parse(jsonStr);
      
      if (!parsed.userStories || !Array.isArray(parsed.userStories)) {
        throw new Error('Invalid response format: missing userStories array');
      }
      
      // 转换为UserStory对象
      return parsed.userStories.map((story: any) => {
        // 查找相关需求
        const relatedRequirements = story.relatedRequirementIds 
          ? story.relatedRequirementIds.map((reqId: string) => 
              requirements.find(r => r.id === reqId)
            ).filter(Boolean)
          : [];
        
        return {
          id: uuidv4(),
          title: story.title,
          description: story.description,
          type: RequirementType.USER_STORY,
          priority: story.priority as RequirementPriority,
          status: RequirementStatus.DRAFT,
          asA: story.asA,
          iWant: story.iWant,
          soThat: story.soThat,
          points: story.points || null,
          epic: story.epic || null,
          dependencies: relatedRequirements.map(r => r.id),
          createdAt: new Date(),
          updatedAt: new Date(),
          metadata: {
            relatedRequirements: relatedRequirements.map(r => r.title)
          }
        };
      });
    } catch (error) {
      this.logger.error(`Error parsing user stories from LLM response: ${error}`);
      throw error;
    }
  }

  /**
   * 从响应中解析优先级排序后的需求
   * @param response LLM响应
   * @param originalRequirements 原始需求
   * @returns 优先级排序后的需求
   */
  private parsePrioritizedRequirementsFromResponse(
    response: string, 
    originalRequirements: Requirement[]
  ): Requirement[] {
    try {
      // 尝试从响应中提取JSON
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/) || 
                        response.match(/```\n([\s\S]*?)\n```/) ||
                        response.match(/{[\s\S]*?}/);
      
      if (!jsonMatch) {
        throw new Error('Could not parse JSON from LLM response');
      }
      
      const jsonStr = jsonMatch[1] || jsonMatch[0];
      const parsed = JSON.parse(jsonStr);
      
      if (!parsed.prioritizedRequirements || !Array.isArray(parsed.prioritizedRequirements)) {
        throw new Error('Invalid response format: missing prioritizedRequirements array');
      }
      
      // 创建需求ID到优先级的映射
      const priorityMap = new Map<string, { priority: RequirementPriority, rationale: string }>();
      for (const item of parsed.prioritizedRequirements) {
        priorityMap.set(item.id, { 
          priority: item.priority as RequirementPriority, 
          rationale: item.rationale 
        });
      }
      
      // 更新原始需求的优先级
      return originalRequirements.map(req => {
        const priorityInfo = priorityMap.get(req.id);
        if (priorityInfo) {
          return {
            ...req,
            priority: priorityInfo.priority,
            updatedAt: new Date(),
            metadata: {
              ...req.metadata,
              prioritizationRationale: priorityInfo.rationale
            }
          };
        }
        return req;
      });
    } catch (error) {
      this.logger.error(`Error parsing prioritized requirements from LLM response: ${error}`);
      throw error;
    }
  }

  /**
   * 从响应中解析产品规格
   * @param response LLM响应
   * @param requirements 需求列表
   * @param userStories 用户故事列表
   * @returns 产品规格
   */
  private parseProductSpecFromResponse(
    response: string, 
    requirements: Requirement[],
    userStories?: UserStory[]
  ): ProductSpec {
    try {
      // 尝试从响应中提取JSON
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/) || 
                        response.match(/```\n([\s\S]*?)\n```/) ||
                        response.match(/{[\s\S]*?}/);
      
      if (!jsonMatch) {
        throw new Error('Could not parse JSON from LLM response');
      }
      
      const jsonStr = jsonMatch[1] || jsonMatch[0];
      const parsed = JSON.parse(jsonStr);
      
      // 创建ProductSpec对象
      return {
        id: uuidv4(),
        name: parsed.name,
        description: parsed.description,
        version: parsed.version,
        requirements: requirements,
        userStories: userStories || [],
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          sections: parsed.sections || [],
          generatedBy: this.name
        }
      };
    } catch (error) {
      this.logger.error(`Error parsing product spec from LLM response: ${error}`);
      throw error;
    }
  }

    /**
   * 从响应中解析路线图
   * @param response LLM响应
   * @param requirements 需求列表
   * @returns 路线图
   */
    private parseRoadmapFromResponse(response: string, requirements: Requirement[]): any {
        try {
          // 尝试从响应中提取JSON
          const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/) || 
                            response.match(/```\n([\s\S]*?)\n```/) ||
                            response.match(/{[\s\S]*?}/);
          
          if (!jsonMatch) {
            throw new Error('Could not parse JSON from LLM response');
          }
          
          const jsonStr = jsonMatch[1] || jsonMatch[0];
          const parsed = JSON.parse(jsonStr);
          
          if (!parsed.phases || !Array.isArray(parsed.phases)) {
            throw new Error('Invalid response format: missing phases array');
          }
          
          // 创建需求ID到需求的映射
          const requirementMap = new Map<string, Requirement>();
          for (const req of requirements) {
            requirementMap.set(req.id, req);
          }
          
          // 处理路线图中的需求引用
          const roadmap = {
            id: uuidv4(),
            phases: parsed.phases.map((phase: any) => ({
              ...phase,
              requirementDetails: phase.requirements
                ? phase.requirements.map((reqId: string) => requirementMap.get(reqId) || null)
                    .filter(Boolean)
                : []
            })),
            createdAt: new Date(),
            updatedAt: new Date(),
            metadata: {
              generatedBy: this.name
            }
          };
          
          return roadmap;
        } catch (error) {
          this.logger.error(`Error parsing roadmap from LLM response: ${error}`);
          throw error;
        }
      }
    
      /**
       * 从响应中解析验证结果
       * @param response LLM响应
       * @returns 验证结果
       */
      private parseValidationResultFromResponse(response: string): {
        valid: boolean;
        issues: { requirementId: string; issue: string }[];
      } {
        try {
          // 尝试从响应中提取JSON
          const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/) || 
                            response.match(/```\n([\s\S]*?)\n```/) ||
                            response.match(/{[\s\S]*?}/);
          
          if (!jsonMatch) {
            throw new Error('Could not parse JSON from LLM response');
          }
          
          const jsonStr = jsonMatch[1] || jsonMatch[0];
          const parsed = JSON.parse(jsonStr);
          
          if (typeof parsed.valid !== 'boolean') {
            throw new Error('Invalid response format: missing valid boolean');
          }
          
          return {
            valid: parsed.valid,
            issues: Array.isArray(parsed.issues) ? parsed.issues : []
          };
        } catch (error) {
          this.logger.error(`Error parsing validation result from LLM response: ${error}`);
          throw error;
        }
      }
    }