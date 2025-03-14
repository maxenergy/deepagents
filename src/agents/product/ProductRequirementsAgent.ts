import { v4 as uuidv4 } from 'uuid';
import { AgentRole, AgentState, AgentCapability, AgentConfig, AgentInput, AgentOutput } from '../IAgent';
import { BaseAgent } from '../BaseAgent';
import { LLMService } from '../../llm/LLMService';
import { LLMProviderType, LLMModelRole, LLMRequestOptions } from '../../llm/ILLMProvider';
import { StorageManager, StorageNamespace, IStorage } from '../../storage/StorageManager';
import { ToolManager } from '../../tools/ToolManager';

/**
 * 需求类型枚举
 */
export enum RequirementType {
  FUNCTIONAL = 'functional',
  NON_FUNCTIONAL = 'non_functional',
  TECHNICAL = 'technical',
  BUSINESS = 'business'
}

/**
 * 需求优先级枚举
 */
export enum RequirementPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * 需求状态枚举
 */
export enum RequirementStatus {
  DRAFT = 'draft',
  REVIEW = 'review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  IMPLEMENTED = 'implemented',
  VERIFIED = 'verified'
}

/**
 * 需求接口
 */
export interface Requirement {
  id: string;
  title: string;
  description: string;
  type: RequirementType;
  priority: RequirementPriority;
  status: RequirementStatus;
  createdAt: Date;
  updatedAt: Date;
  assignedTo?: string;
  dependencies?: string[];
  acceptanceCriteria?: string[];
  tags?: string[];
}

/**
 * 用户故事接口
 */
export interface UserStory {
  id: string;
  title: string;
  description: string;
  asA: string;
  iWant: string;
  soThat: string;
  acceptanceCriteria: string[];
  priority: RequirementPriority;
  status: RequirementStatus;
  estimatedEffort?: number;
  relatedRequirements?: string[];
}

/**
 * 产品规格接口
 */
export interface ProductSpec {
  id: string;
  name: string;
  version: string;
  description: string;
  requirements: Requirement[];
  userStories: UserStory[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 产品需求代理配置接口
 */
export interface ProductRequirementsAgentConfig extends AgentConfig {
  systemPrompt?: string;
  provider?: LLMProviderType;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * 产品需求代理输入接口
 */
export interface ProductRequirementsAgentInput extends AgentInput {
  type: 'extract_requirements' | 'create_user_stories' | 'create_product_spec';
  description?: string;
  requirementIds?: string[];
  name?: string;
  userStoryIds?: string[];
}

/**
 * 产品需求代理输出接口
 */
export interface ProductRequirementsAgentOutput extends AgentOutput {
  requirements?: Requirement[];
  userStories?: UserStory[];
  productSpec?: ProductSpec;
}

/**
 * 产品需求代理类
 * 
 * 负责需求收集、分析和管理
 */
export class ProductRequirementsAgent extends BaseAgent {
  private requirements: Map<string, Requirement> = new Map();
  private userStories: Map<string, UserStory> = new Map();
  private productSpecs: Map<string, ProductSpec> = new Map();
  private llmService: LLMService;
  private storageManager: StorageManager;
  private requirementsStorage: IStorage | null;
  private systemPrompt: string;
  private provider?: LLMProviderType;
  private model?: string;
  
  /**
   * 构造函数
   * 
   * @param llmService LLM服务
   * @param storageManager 存储管理器
   * @param toolManager 工具管理器
   * @param config 配置
   */
  constructor(
    llmService: LLMService,
    storageManager: StorageManager,
    toolManager: ToolManager,
    config?: ProductRequirementsAgentConfig
  ) {
    super();
    
    this.llmService = llmService;
    this.storageManager = storageManager;
    
    // 初始化基本属性
    this.id = uuidv4();
    this.name = '产品需求代理';
    this.role = AgentRole.PRODUCT_MANAGER;
    this.capabilities = [
      AgentCapability.REQUIREMENTS_ANALYSIS,
      AgentCapability.SYSTEM_DESIGN
    ];
    this.state = AgentState.IDLE;
    
    // 设置系统提示
    this.systemPrompt = config?.systemPrompt || `你是一个专业的产品需求分析师，负责收集、分析和管理产品需求。
你的主要职责包括：
1. 从用户描述中提取需求
2. 将需求分类为功能性需求和非功能性需求
3. 创建用户故事
4. 确定需求优先级
5. 编写需求文档
6. 与开发团队沟通需求

请始终保持专业、客观，并确保需求的清晰性和可测试性。`;
    
    // 设置提供商和模型
    if (config?.provider) {
      this.provider = config.provider;
    }
    
    if (config?.model) {
      this.model = config.model;
    }
    
    // 获取存储
    this.requirementsStorage = this.storageManager.getStorage(StorageNamespace.AGENTS);
    
    // 加载存储的需求数据
    this.loadData();
  }
  
  /**
   * 初始化时的回调
   */
  protected async onInitialize(): Promise<void> {
    // 加载存储的需求数据
    await this.loadData();
  }
  
  /**
   * 处理输入
   * 
   * @param input 输入
   * @returns 输出
   */
  public async process(input: ProductRequirementsAgentInput): Promise<ProductRequirementsAgentOutput> {
    // 设置状态为处理中
    this.setState(AgentState.PROCESSING);
    
    try {
      let result: ProductRequirementsAgentOutput = {
        agentId: this.id,
        timestamp: new Date(),
        status: 'in_progress',
        message: '处理中...'
      };
      
      // 根据输入类型处理不同的请求
      if (input.type === 'extract_requirements' && input.description) {
        const requirements = await this.extractRequirements(input.description);
        result = {
          ...result,
          status: 'success',
          message: `成功提取 ${requirements.length} 个需求`,
          requirements
        };
      } else if (input.type === 'create_user_stories' && input.requirementIds) {
        const userStories = await this.createUserStories(input.requirementIds);
        result = {
          ...result,
          status: 'success',
          message: `成功创建 ${userStories.length} 个用户故事`,
          userStories
        };
      } else if (input.type === 'create_product_spec' && input.name && input.description && input.requirementIds && input.userStoryIds) {
        const productSpec = this.createProductSpec(
          input.name,
          input.description,
          input.requirementIds,
          input.userStoryIds
        );
        result = {
          ...result,
          status: 'success',
          message: `成功创建产品规格: ${productSpec.name}`,
          productSpec
        };
      } else {
        result = {
          ...result,
          status: 'error',
          message: `不支持的输入类型或缺少必要参数: ${input.type}`
        };
      }
      
      // 设置状态为空闲
      this.setState(AgentState.IDLE);
      
      return result;
    } catch (error: any) {
      // 设置状态为错误
      this.setState(AgentState.ERROR);
      
      return {
        agentId: this.id,
        timestamp: new Date(),
        status: 'error',
        message: `处理失败: ${error.message}`
      };
    }
  }
  
  /**
   * 从用户输入中提取需求
   * 
   * @param input 用户输入
   * @returns 提取的需求列表
   */
  public async extractRequirements(input: string): Promise<Requirement[]> {
    const prompt = `请从以下用户描述中提取产品需求，并按照功能性需求和非功能性需求进行分类。
对于每个需求，请提供：
1. 标题
2. 详细描述
3. 类型（功能性/非功能性/技术性/业务性）
4. 优先级（低/中/高/关键）

用户描述：
${input}

请以JSON格式返回结果，格式如下：
{
  "requirements": [
    {
      "title": "需求标题",
      "description": "需求详细描述",
      "type": "functional|non_functional|technical|business",
      "priority": "low|medium|high|critical"
    }
  ]
}`;
    
    const requestOptions: LLMRequestOptions = {
      messages: [
        { role: LLMModelRole.SYSTEM, content: this.systemPrompt },
        { role: LLMModelRole.USER, content: prompt }
      ],
      model: this.model || 'gpt-4'
    };
    
    const response = await this.llmService.sendRequest(requestOptions, this.provider);
    
    try {
      const result = JSON.parse(response.content);
      const requirements: Requirement[] = [];
      
      for (const req of result.requirements) {
        const requirement: Requirement = {
          id: uuidv4(),
          title: req.title,
          description: req.description,
          type: this.mapRequirementType(req.type),
          priority: this.mapRequirementPriority(req.priority),
          status: RequirementStatus.DRAFT,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        requirements.push(requirement);
        this.requirements.set(requirement.id, requirement);
      }
      
      // 保存需求数据
      this.saveData();
      
      return requirements;
    } catch (error) {
      console.error('解析需求失败:', error);
      throw new Error('解析需求失败');
    }
  }
  
  /**
   * 创建用户故事
   * 
   * @param requirementIds 需求ID列表
   * @returns 创建的用户故事列表
   */
  public async createUserStories(requirementIds: string[]): Promise<UserStory[]> {
    const requirements = requirementIds.map(id => this.requirements.get(id)).filter(Boolean) as Requirement[];
    
    if (requirements.length === 0) {
      throw new Error('未找到有效的需求');
    }
    
    const prompt = `请根据以下需求创建用户故事。
对于每个用户故事，请提供：
1. 标题
2. 作为...（用户角色）
3. 我想要...（功能）
4. 以便...（价值）
5. 验收标准（列表）

需求：
${requirements.map(req => `- ${req.title}: ${req.description}`).join('\n')}

请以JSON格式返回结果，格式如下：
{
  "userStories": [
    {
      "title": "用户故事标题",
      "asA": "用户角色",
      "iWant": "功能",
      "soThat": "价值",
      "acceptanceCriteria": ["验收标准1", "验收标准2"],
      "relatedRequirements": ["需求ID"]
    }
  ]
}`;
    
    const requestOptions: LLMRequestOptions = {
      messages: [
        { role: LLMModelRole.SYSTEM, content: this.systemPrompt },
        { role: LLMModelRole.USER, content: prompt }
      ],
      model: this.model || 'gpt-4'
    };
    
    const response = await this.llmService.sendRequest(requestOptions, this.provider);
    
    try {
      const result = JSON.parse(response.content);
      const userStories: UserStory[] = [];
      
      for (const story of result.userStories) {
        const userStory: UserStory = {
          id: uuidv4(),
          title: story.title,
          description: `作为${story.asA}，我想要${story.iWant}，以便${story.soThat}`,
          asA: story.asA,
          iWant: story.iWant,
          soThat: story.soThat,
          acceptanceCriteria: story.acceptanceCriteria,
          priority: RequirementPriority.MEDIUM,
          status: RequirementStatus.DRAFT,
          relatedRequirements: story.relatedRequirements || []
        };
        
        userStories.push(userStory);
        this.userStories.set(userStory.id, userStory);
      }
      
      // 保存用户故事数据
      this.saveData();
      
      return userStories;
    } catch (error) {
      console.error('创建用户故事失败:', error);
      throw new Error('创建用户故事失败');
    }
  }
  
  /**
   * 创建产品规格
   * 
   * @param name 产品名称
   * @param description 产品描述
   * @param requirementIds 需求ID列表
   * @param userStoryIds 用户故事ID列表
   * @returns 创建的产品规格
   */
  public createProductSpec(
    name: string,
    description: string,
    requirementIds: string[],
    userStoryIds: string[]
  ): ProductSpec {
    const requirements = requirementIds
      .map(id => this.requirements.get(id))
      .filter(Boolean) as Requirement[];
    
    const userStories = userStoryIds
      .map(id => this.userStories.get(id))
      .filter(Boolean) as UserStory[];
    
    const productSpec: ProductSpec = {
      id: uuidv4(),
      name,
      version: '1.0.0',
      description,
      requirements,
      userStories,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.productSpecs.set(productSpec.id, productSpec);
    
    // 保存产品规格数据
    this.saveData();
    
    return productSpec;
  }
  
  /**
   * 获取需求
   * 
   * @param id 需求ID
   * @returns 需求，如果不存在则返回undefined
   */
  public getRequirement(id: string): Requirement | undefined {
    return this.requirements.get(id);
  }
  
  /**
   * 获取所有需求
   * 
   * @returns 所有需求
   */
  public getAllRequirements(): Requirement[] {
    return Array.from(this.requirements.values());
  }
  
  /**
   * 获取用户故事
   * 
   * @param id 用户故事ID
   * @returns 用户故事，如果不存在则返回undefined
   */
  public getUserStory(id: string): UserStory | undefined {
    return this.userStories.get(id);
  }
  
  /**
   * 获取所有用户故事
   * 
   * @returns 所有用户故事
   */
  public getAllUserStories(): UserStory[] {
    return Array.from(this.userStories.values());
  }
  
  /**
   * 获取产品规格
   * 
   * @param id 产品规格ID
   * @returns 产品规格，如果不存在则返回undefined
   */
  public getProductSpec(id: string): ProductSpec | undefined {
    return this.productSpecs.get(id);
  }
  
  /**
   * 获取所有产品规格
   * 
   * @returns 所有产品规格
   */
  public getAllProductSpecs(): ProductSpec[] {
    return Array.from(this.productSpecs.values());
  }
  
  /**
   * 更新需求
   * 
   * @param requirement 需求
   * @returns 更新后的需求
   */
  public updateRequirement(requirement: Requirement): Requirement {
    requirement.updatedAt = new Date();
    this.requirements.set(requirement.id, requirement);
    
    // 保存需求数据
    this.saveData();
    
    return requirement;
  }
  
  /**
   * 更新用户故事
   * 
   * @param userStory 用户故事
   * @returns 更新后的用户故事
   */
  public updateUserStory(userStory: UserStory): UserStory {
    this.userStories.set(userStory.id, userStory);
    
    // 保存用户故事数据
    this.saveData();
    
    return userStory;
  }
  
  /**
   * 更新产品规格
   * 
   * @param productSpec 产品规格
   * @returns 更新后的产品规格
   */
  public updateProductSpec(productSpec: ProductSpec): ProductSpec {
    productSpec.updatedAt = new Date();
    this.productSpecs.set(productSpec.id, productSpec);
    
    // 保存产品规格数据
    this.saveData();
    
    return productSpec;
  }
  
  /**
   * 删除需求
   * 
   * @param id 需求ID
   * @returns 是否成功删除
   */
  public deleteRequirement(id: string): boolean {
    const result = this.requirements.delete(id);
    
    if (result) {
      // 保存需求数据
      this.saveData();
    }
    
    return result;
  }
  
  /**
   * 删除用户故事
   * 
   * @param id 用户故事ID
   * @returns 是否成功删除
   */
  public deleteUserStory(id: string): boolean {
    const result = this.userStories.delete(id);
    
    if (result) {
      // 保存用户故事数据
      this.saveData();
    }
    
    return result;
  }
  
  /**
   * 删除产品规格
   * 
   * @param id 产品规格ID
   * @returns 是否成功删除
   */
  public deleteProductSpec(id: string): boolean {
    const result = this.productSpecs.delete(id);
    
    if (result) {
      // 保存产品规格数据
      this.saveData();
    }
    
    return result;
  }
  
  /**
   * 加载数据
   */
  private async loadData(): Promise<void> {
    try {
      if (this.requirementsStorage) {
        // 加载需求数据
        const requirementsData = await this.requirementsStorage.get('requirements');
        if (requirementsData) {
          for (const [id, requirement] of Object.entries(requirementsData as Record<string, Requirement>)) {
            this.requirements.set(id, requirement as Requirement);
          }
        }
        
        // 加载用户故事数据
        const userStoriesData = await this.requirementsStorage.get('userStories');
        if (userStoriesData) {
          for (const [id, userStory] of Object.entries(userStoriesData as Record<string, UserStory>)) {
            this.userStories.set(id, userStory as UserStory);
          }
        }
        
        // 加载产品规格数据
        const productSpecsData = await this.requirementsStorage.get('productSpecs');
        if (productSpecsData) {
          for (const [id, productSpec] of Object.entries(productSpecsData as Record<string, ProductSpec>)) {
            this.productSpecs.set(id, productSpec as ProductSpec);
          }
        }
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    }
  }
  
  /**
   * 保存数据
   */
  private async saveData(): Promise<void> {
    try {
      if (this.requirementsStorage) {
        // 保存需求数据
        const requirementsData: Record<string, Requirement> = {};
        for (const [id, requirement] of this.requirements.entries()) {
          requirementsData[id] = requirement;
        }
        await this.requirementsStorage.set('requirements', requirementsData);
        
        // 保存用户故事数据
        const userStoriesData: Record<string, UserStory> = {};
        for (const [id, userStory] of this.userStories.entries()) {
          userStoriesData[id] = userStory;
        }
        await this.requirementsStorage.set('userStories', userStoriesData);
        
        // 保存产品规格数据
        const productSpecsData: Record<string, ProductSpec> = {};
        for (const [id, productSpec] of this.productSpecs.entries()) {
          productSpecsData[id] = productSpec;
        }
        await this.requirementsStorage.set('productSpecs', productSpecsData);
      }
    } catch (error) {
      console.error('保存数据失败:', error);
    }
  }
  
  /**
   * 映射需求类型
   * 
   * @param type 需求类型字符串
   * @returns 需求类型枚举
   */
  private mapRequirementType(type: string): RequirementType {
    switch (type.toLowerCase()) {
      case 'functional':
        return RequirementType.FUNCTIONAL;
      case 'non_functional':
      case 'non-functional':
        return RequirementType.NON_FUNCTIONAL;
      case 'technical':
        return RequirementType.TECHNICAL;
      case 'business':
        return RequirementType.BUSINESS;
      default:
        return RequirementType.FUNCTIONAL;
    }
  }
  
  /**
   * 映射需求优先级
   * 
   * @param priority 需求优先级字符串
   * @returns 需求优先级枚举
   */
  private mapRequirementPriority(priority: string): RequirementPriority {
    switch (priority.toLowerCase()) {
      case 'low':
        return RequirementPriority.LOW;
      case 'medium':
        return RequirementPriority.MEDIUM;
      case 'high':
        return RequirementPriority.HIGH;
      case 'critical':
        return RequirementPriority.CRITICAL;
      default:
        return RequirementPriority.MEDIUM;
    }
  }
} 