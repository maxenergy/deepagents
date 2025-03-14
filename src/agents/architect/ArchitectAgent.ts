import { v4 as uuidv4 } from 'uuid';
import { AgentRole, AgentState, AgentCapability, AgentConfig, AgentInput, AgentOutput, IAgent } from '../IAgent';
import { BaseAgent } from '../BaseAgent';
import { LLMService } from '../../llm/LLMService';
import { LLMProviderType, LLMModelRole, LLMRequestOptions } from '../../llm/ILLMProvider';
import { StorageManager, StorageNamespace, IStorage } from '../../storage/StorageManager';
import { ToolManager } from '../../tools/ToolManager';
import { Requirement, UserStory } from '../product/ProductRequirementsAgent';
import { IArchitectAgent, ArchitectAgentInput, ArchitectAgentOutput } from './IArchitectAgent';
import { CollaborationType } from '../collaboration';

/**
 * 架构类型枚举
 */
export enum ArchitectureType {
  MONOLITHIC = 'monolithic',
  MICROSERVICES = 'microservices',
  SERVERLESS = 'serverless',
  EVENT_DRIVEN = 'event_driven',
  LAYERED = 'layered',
  MODULAR = 'modular',
  HYBRID = 'hybrid'
}

/**
 * 技术栈类型枚举
 */
export enum TechStackType {
  FRONTEND = 'frontend',
  BACKEND = 'backend',
  DATABASE = 'database',
  DEVOPS = 'devops',
  TESTING = 'testing',
  SECURITY = 'security',
  MONITORING = 'monitoring'
}

/**
 * 技术选择接口
 */
export interface TechChoice {
  id: string;
  name: string;
  type: TechStackType;
  description: string;
  pros: string[];
  cons: string[];
  alternatives: string[];
  version?: string;
  url?: string;
  tags?: string[];
}

/**
 * 系统组件接口
 */
export interface SystemComponent {
  id: string;
  name: string;
  description: string;
  responsibilities: string[];
  dependencies: string[];
  techChoices: TechChoice[];
  apis?: string[];
  dataModels?: string[];
}

/**
 * 架构设计接口
 */
export interface ArchitectureDesign {
  id: string;
  name: string;
  description: string;
  type: ArchitectureType;
  components: SystemComponent[];
  diagrams?: string[];
  designPatterns?: string[];
  nonFunctionalRequirements?: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 架构师代理配置接口
 */
export interface ArchitectAgentConfig extends AgentConfig {
  systemPrompt?: string;
  provider?: LLMProviderType;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  preferredTechnologies?: Record<TechStackType, string[]>;
  avoidedTechnologies?: string[];
}

/**
 * 架构师代理类
 * 
 * 负责系统架构设计和技术选型
 */
export class ArchitectAgent extends BaseAgent implements IArchitectAgent {
  private architectureDesigns: Map<string, ArchitectureDesign> = new Map();
  private techChoices: Map<string, TechChoice> = new Map();
  private llmService: LLMService;
  private storageManager: StorageManager;
  private architectStorage: IStorage | null;
  private systemPrompt: string;
  private provider?: LLMProviderType;
  private model?: string;
  private preferredTechnologies: Record<TechStackType, string[]>;
  private avoidedTechnologies: string[];
  
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
    config?: ArchitectAgentConfig
  ) {
    super();
    
    this.llmService = llmService;
    this.storageManager = storageManager;
    
    // 初始化基本属性
    this.id = uuidv4();
    this.name = '架构师代理';
    this.role = AgentRole.ARCHITECT;
    this.capabilities = [
      AgentCapability.SYSTEM_DESIGN
    ];
    this.state = AgentState.IDLE;
    
    // 设置系统提示
    this.systemPrompt = config?.systemPrompt || `你是一个专业的软件架构师，负责设计系统架构和选择技术栈。
你的主要职责包括：
1. 分析需求并设计合适的系统架构
2. 选择适合项目的技术栈
3. 定义系统组件及其职责
4. 确定组件之间的交互方式
5. 考虑非功能性需求（如可扩展性、性能、安全性等）
6. 评估不同架构方案的优缺点

请始终保持专业、客观，并确保你的设计决策有充分的理由支持。`;
    
    // 设置提供商和模型
    if (config?.provider) {
      this.provider = config.provider;
    }
    
    if (config?.model) {
      this.model = config.model;
    }
    
    // 设置技术偏好
    this.preferredTechnologies = config?.preferredTechnologies || {
      [TechStackType.FRONTEND]: ['React', 'TypeScript', 'Next.js'],
      [TechStackType.BACKEND]: ['Node.js', 'Express', 'NestJS'],
      [TechStackType.DATABASE]: ['PostgreSQL', 'MongoDB'],
      [TechStackType.DEVOPS]: ['Docker', 'Kubernetes', 'GitHub Actions'],
      [TechStackType.TESTING]: ['Jest', 'Cypress'],
      [TechStackType.SECURITY]: ['OAuth 2.0', 'JWT'],
      [TechStackType.MONITORING]: ['Prometheus', 'Grafana']
    };
    
    this.avoidedTechnologies = config?.avoidedTechnologies || [];
    
    // 获取存储
    this.architectStorage = this.storageManager.getStorage(StorageNamespace.AGENTS);
    
    // 加载存储的架构数据
    this.loadData();
  }
  
  /**
   * 初始化时的回调
   */
  protected async onInitialize(): Promise<void> {
    // 加载存储的架构数据
    await this.loadData();
  }
  
  /**
   * 处理输入
   * 
   * @param input 输入
   * @returns 输出
   */
  public async process(input: ArchitectAgentInput): Promise<ArchitectAgentOutput> {
    // 设置状态为处理中
    this.setState(AgentState.PROCESSING);
    
    try {
      let result: ArchitectAgentOutput = {
        agentId: this.id,
        timestamp: new Date(),
        status: 'in_progress',
        message: '处理中...'
      };
      
      // 根据输入类型处理不同的请求
      if (input.type === 'create_architecture' && input.requirements && input.projectDescription) {
        const architectureDesign = await this.createArchitecture(
          input.requirements,
          input.userStories || [],
          input.projectDescription,
          input.architectureType
        );
        
        result = {
          ...result,
          status: 'success',
          message: `成功创建架构设计: ${architectureDesign.name}`,
          architectureDesign
        };
      } else if (input.type === 'evaluate_architecture' && input.existingArchitectureId) {
        const evaluation = await this.evaluateArchitecture(input.existingArchitectureId);
        
        result = {
          ...result,
          status: 'success',
          message: '架构评估完成',
          evaluation
        };
      } else if (input.type === 'suggest_tech_stack' && input.requirements) {
        const techChoices = await this.suggestTechStack(
          input.requirements,
          input.techStackTypes || Object.values(TechStackType)
        );
        
        result = {
          ...result,
          status: 'success',
          message: `成功推荐 ${techChoices.length} 个技术选择`,
          techChoices
        };
      } else if (input.type === 'analyze_requirements' && input.requirements) {
        const analysis = await this.analyzeRequirements(input.requirements);
        
        result = {
          ...result,
          status: 'success',
          message: '需求分析完成',
          analysis
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
   * 创建架构设计
   * 
   * @param requirements 需求列表
   * @param userStories 用户故事列表
   * @param projectDescription 项目描述
   * @param architectureType 架构类型（可选）
   * @returns 创建的架构设计
   */
  public async createArchitecture(
    requirements: Requirement[],
    userStories: UserStory[],
    projectDescription: string,
    architectureType?: ArchitectureType
  ): Promise<ArchitectureDesign> {
    const prompt = `请根据以下项目描述、需求和用户故事，设计一个合适的系统架构。
${architectureType ? `请使用 ${architectureType} 架构类型。` : '请选择最合适的架构类型。'}

项目描述：
${projectDescription}

需求列表：
${requirements.map((req, index) => `${index + 1}. ${req.title}: ${req.description} (类型: ${req.type}, 优先级: ${req.priority})`).join('\n')}

${userStories.length > 0 ? `用户故事：
${userStories.map((story, index) => `${index + 1}. ${story.title}: ${story.description}`).join('\n')}` : ''}

请设计一个完整的系统架构，包括：
1. 架构类型和总体描述
2. 主要系统组件及其职责
3. 组件之间的依赖关系
4. 每个组件的技术选择
5. 考虑的设计模式
6. 如何满足非功能性需求

请以JSON格式返回结果，格式如下：
{
  "name": "架构名称",
  "description": "架构总体描述",
  "type": "架构类型(monolithic|microservices|serverless|event_driven|layered|modular|hybrid)",
  "components": [
    {
      "name": "组件名称",
      "description": "组件描述",
      "responsibilities": ["职责1", "职责2"],
      "dependencies": ["依赖组件1", "依赖组件2"],
      "techChoices": [
        {
          "name": "技术名称",
          "type": "技术类型(frontend|backend|database|devops|testing|security|monitoring)",
          "description": "技术描述",
          "pros": ["优点1", "优点2"],
          "cons": ["缺点1", "缺点2"],
          "alternatives": ["替代技术1", "替代技术2"]
        }
      ]
    }
  ],
  "designPatterns": ["设计模式1", "设计模式2"],
  "nonFunctionalRequirements": ["非功能性需求1", "非功能性需求2"]
}`;
    
    const requestOptions: LLMRequestOptions = {
      messages: [
        { role: LLMModelRole.SYSTEM, content: this.systemPrompt },
        { role: LLMModelRole.USER, content: prompt }
      ],
      model: this.model || 'gpt-4',
      temperature: 0.7,
      maxTokens: 4000
    };
    
    const response = await this.llmService.sendRequest(requestOptions, this.provider);
    
    try {
      const result = JSON.parse(response.content);
      
      // 创建技术选择
      const allTechChoices: TechChoice[] = [];
      
      // 处理组件和技术选择
      const components: SystemComponent[] = result.components.map((comp: any) => {
        const techChoices: TechChoice[] = comp.techChoices.map((tech: any) => {
          const techChoice: TechChoice = {
            id: uuidv4(),
            name: tech.name,
            type: this.mapTechStackType(tech.type),
            description: tech.description,
            pros: tech.pros || [],
            cons: tech.cons || [],
            alternatives: tech.alternatives || [],
            tags: []
          };
          
          // 存储技术选择
          this.techChoices.set(techChoice.id, techChoice);
          allTechChoices.push(techChoice);
          
          return techChoice;
        });
        
        return {
          id: uuidv4(),
          name: comp.name,
          description: comp.description,
          responsibilities: comp.responsibilities || [],
          dependencies: comp.dependencies || [],
          techChoices,
          apis: comp.apis || [],
          dataModels: comp.dataModels || []
        };
      });
      
      // 创建架构设计
      const architectureDesign: ArchitectureDesign = {
        id: uuidv4(),
        name: result.name,
        description: result.description,
        type: this.mapArchitectureType(result.type),
        components,
        designPatterns: result.designPatterns || [],
        nonFunctionalRequirements: result.nonFunctionalRequirements || [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // 存储架构设计
      this.architectureDesigns.set(architectureDesign.id, architectureDesign);
      
      // 保存数据
      this.saveData();
      
      return architectureDesign;
    } catch (error) {
      console.error('解析架构设计失败:', error);
      throw new Error('解析架构设计失败');
    }
  }
  
  /**
   * 评估架构设计
   * 
   * @param architectureId 架构设计ID
   * @returns 评估结果
   */
  public async evaluateArchitecture(architectureId: string): Promise<string> {
    const architecture = this.architectureDesigns.get(architectureId);
    
    if (!architecture) {
      throw new Error(`架构设计不存在: ${architectureId}`);
    }
    
    const prompt = `请评估以下系统架构设计，包括其优点、缺点、潜在风险和改进建议。

架构名称: ${architecture.name}
架构描述: ${architecture.description}
架构类型: ${architecture.type}

系统组件:
${architecture.components.map((comp, index) => {
  return `${index + 1}. ${comp.name}:
   描述: ${comp.description}
   职责: ${comp.responsibilities.join(', ')}
   依赖: ${comp.dependencies.join(', ')}
   技术选择: ${comp.techChoices.map(tech => tech.name).join(', ')}`;
}).join('\n')}

设计模式: ${architecture.designPatterns?.join(', ') || '无'}
非功能性需求: ${architecture.nonFunctionalRequirements?.join(', ') || '无'}

请从以下几个方面进行评估：
1. 架构的整体合理性
2. 组件划分和职责分配
3. 技术选择的适当性
4. 可扩展性和可维护性
5. 性能和安全性考虑
6. 潜在的风险和挑战
7. 改进建议

请提供详细的评估报告。`;
    
    const requestOptions: LLMRequestOptions = {
      messages: [
        { role: LLMModelRole.SYSTEM, content: this.systemPrompt },
        { role: LLMModelRole.USER, content: prompt }
      ],
      model: this.model || 'gpt-4',
      temperature: 0.7
    };
    
    const response = await this.llmService.sendRequest(requestOptions, this.provider);
    return response.content;
  }
  
  /**
   * 推荐技术栈
   * 
   * @param requirements 需求列表
   * @param techStackTypes 技术栈类型列表
   * @returns 推荐的技术选择列表
   */
  public async suggestTechStack(
    requirements: Requirement[],
    techStackTypes: TechStackType[]
  ): Promise<TechChoice[]> {
    const prompt = `请根据以下项目需求，推荐合适的技术栈。
我们特别关注以下技术领域: ${techStackTypes.join(', ')}

需求列表：
${requirements.map((req, index) => `${index + 1}. ${req.title}: ${req.description} (类型: ${req.type}, 优先级: ${req.priority})`).join('\n')}

${this.preferredTechnologies && Object.keys(this.preferredTechnologies).length > 0 ? 
`我们倾向于使用以下技术:
${Object.entries(this.preferredTechnologies)
  .filter(([type]) => techStackTypes.includes(type as TechStackType))
  .map(([type, techs]) => `${type}: ${techs.join(', ')}`)
  .join('\n')}` : ''}

${this.avoidedTechnologies && this.avoidedTechnologies.length > 0 ? 
`我们希望避免使用以下技术:
${this.avoidedTechnologies.join(', ')}` : ''}

请为每个技术领域推荐最合适的技术，并说明选择理由。

请以JSON格式返回结果，格式如下：
{
  "techChoices": [
    {
      "name": "技术名称",
      "type": "技术类型(frontend|backend|database|devops|testing|security|monitoring)",
      "description": "技术描述",
      "pros": ["优点1", "优点2"],
      "cons": ["缺点1", "缺点2"],
      "alternatives": ["替代技术1", "替代技术2"],
      "version": "推荐版本"
    }
  ]
}`;
    
    const requestOptions: LLMRequestOptions = {
      messages: [
        { role: LLMModelRole.SYSTEM, content: this.systemPrompt },
        { role: LLMModelRole.USER, content: prompt }
      ],
      model: this.model || 'gpt-4',
      temperature: 0.7
    };
    
    const response = await this.llmService.sendRequest(requestOptions, this.provider);
    
    try {
      const result = JSON.parse(response.content);
      const techChoices: TechChoice[] = result.techChoices.map((tech: any) => {
        const techChoice: TechChoice = {
          id: uuidv4(),
          name: tech.name,
          type: this.mapTechStackType(tech.type),
          description: tech.description,
          pros: tech.pros || [],
          cons: tech.cons || [],
          alternatives: tech.alternatives || [],
          version: tech.version,
          url: tech.url,
          tags: []
        };
        
        // 存储技术选择
        this.techChoices.set(techChoice.id, techChoice);
        
        return techChoice;
      });
      
      // 保存数据
      this.saveData();
      
      return techChoices;
    } catch (error) {
      console.error('解析技术栈推荐失败:', error);
      throw new Error('解析技术栈推荐失败');
    }
  }
  
  /**
   * 分析需求
   * 
   * @param requirements 需求列表
   * @returns 分析结果
   */
  public async analyzeRequirements(requirements: Requirement[]): Promise<string> {
    const prompt = `请从架构设计的角度分析以下需求，包括技术挑战、架构考虑因素和可能的实现方案。

需求列表：
${requirements.map((req, index) => `${index + 1}. ${req.title}: ${req.description} (类型: ${req.type}, 优先级: ${req.priority})`).join('\n')}

请从以下几个方面进行分析：
1. 技术挑战和复杂性
2. 架构设计考虑因素
3. 可能的实现方案
4. 技术风险和缓解策略
5. 对系统架构的影响

请提供详细的分析报告。`;
    
    const requestOptions: LLMRequestOptions = {
      messages: [
        { role: LLMModelRole.SYSTEM, content: this.systemPrompt },
        { role: LLMModelRole.USER, content: prompt }
      ],
      model: this.model || 'gpt-4',
      temperature: 0.7
    };
    
    const response = await this.llmService.sendRequest(requestOptions, this.provider);
    return response.content;
  }
  
  /**
   * 获取架构设计
   * 
   * @param id 架构设计ID
   * @returns 架构设计，如果不存在则返回undefined
   */
  public getArchitectureDesign(id: string): ArchitectureDesign | undefined {
    return this.architectureDesigns.get(id);
  }
  
  /**
   * 获取所有架构设计
   * 
   * @returns 所有架构设计
   */
  public getAllArchitectureDesigns(): ArchitectureDesign[] {
    return Array.from(this.architectureDesigns.values());
  }
  
  /**
   * 获取技术选择
   * 
   * @param id 技术选择ID
   * @returns 技术选择，如果不存在则返回undefined
   */
  public getTechChoice(id: string): TechChoice | undefined {
    return this.techChoices.get(id);
  }
  
  /**
   * 获取所有技术选择
   * 
   * @returns 所有技术选择
   */
  public getAllTechChoices(): TechChoice[] {
    return Array.from(this.techChoices.values());
  }
  
  /**
   * 更新架构设计
   * 
   * @param architectureDesign 架构设计
   * @returns 更新后的架构设计
   */
  public updateArchitectureDesign(architectureDesign: ArchitectureDesign): ArchitectureDesign {
    architectureDesign.updatedAt = new Date();
    this.architectureDesigns.set(architectureDesign.id, architectureDesign);
    
    // 保存数据
    this.saveData();
    
    return architectureDesign;
  }
  
  /**
   * 删除架构设计
   * 
   * @param id 架构设计ID
   * @returns 是否成功删除
   */
  public deleteArchitectureDesign(id: string): boolean {
    const result = this.architectureDesigns.delete(id);
    
    if (result) {
      // 保存数据
      this.saveData();
    }
    
    return result;
  }
  
  /**
   * 加载数据
   */
  private async loadData(): Promise<void> {
    try {
      if (this.architectStorage) {
        // 加载架构设计数据
        const architectureData = await this.architectStorage.get('architectureDesigns');
        if (architectureData) {
          for (const [id, design] of Object.entries(architectureData as Record<string, ArchitectureDesign>)) {
            this.architectureDesigns.set(id, design as ArchitectureDesign);
          }
        }
        
        // 加载技术选择数据
        const techChoicesData = await this.architectStorage.get('techChoices');
        if (techChoicesData) {
          for (const [id, choice] of Object.entries(techChoicesData as Record<string, TechChoice>)) {
            this.techChoices.set(id, choice as TechChoice);
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
      if (this.architectStorage) {
        // 保存架构设计数据
        const architectureData: Record<string, ArchitectureDesign> = {};
        for (const [id, design] of this.architectureDesigns.entries()) {
          architectureData[id] = design;
        }
        await this.architectStorage.set('architectureDesigns', architectureData);
        
        // 保存技术选择数据
        const techChoicesData: Record<string, TechChoice> = {};
        for (const [id, choice] of this.techChoices.entries()) {
          techChoicesData[id] = choice;
        }
        await this.architectStorage.set('techChoices', techChoicesData);
      }
    } catch (error) {
      console.error('保存数据失败:', error);
    }
  }
  
  /**
   * 映射架构类型
   * 
   * @param type 架构类型字符串
   * @returns 架构类型枚举
   */
  private mapArchitectureType(type: string): ArchitectureType {
    switch (type.toLowerCase()) {
      case 'monolithic':
        return ArchitectureType.MONOLITHIC;
      case 'microservices':
        return ArchitectureType.MICROSERVICES;
      case 'serverless':
        return ArchitectureType.SERVERLESS;
      case 'event_driven':
      case 'event-driven':
        return ArchitectureType.EVENT_DRIVEN;
      case 'layered':
        return ArchitectureType.LAYERED;
      case 'modular':
        return ArchitectureType.MODULAR;
      case 'hybrid':
        return ArchitectureType.HYBRID;
      default:
        return ArchitectureType.MODULAR;
    }
  }
  
  /**
   * 映射技术栈类型
   * 
   * @param type 技术栈类型字符串
   * @returns 技术栈类型枚举
   */
  private mapTechStackType(type: string): TechStackType {
    switch (type.toLowerCase()) {
      case 'frontend':
        return TechStackType.FRONTEND;
      case 'backend':
        return TechStackType.BACKEND;
      case 'database':
        return TechStackType.DATABASE;
      case 'devops':
        return TechStackType.DEVOPS;
      case 'testing':
        return TechStackType.TESTING;
      case 'security':
        return TechStackType.SECURITY;
      case 'monitoring':
        return TechStackType.MONITORING;
      default:
        return TechStackType.BACKEND;
    }
  }
}
