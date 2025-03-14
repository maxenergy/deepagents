import { AgentConfig, AgentInput, AgentOutput, IAgent } from '../IAgent';
import { Requirement, UserStory } from '../product/ProductRequirementsAgent';
import { ArchitectureType, TechStackType, TechChoice, ArchitectureDesign } from './ArchitectAgent';
import { CollaborationType } from '../collaboration';

/**
 * 架构设计类型枚举
 */
export enum ArchitectureType {
  MONOLITHIC = 'monolithic',
  MICROSERVICES = 'microservices',
  SERVERLESS = 'serverless',
  EVENT_DRIVEN = 'event_driven',
  LAYERED = 'layered',
  MODULAR = 'modular',
  CUSTOM = 'custom'
}

/**
 * 架构组件接口
 */
export interface ArchitectureComponent {
  id: string;
  name: string;
  type: string;
  description: string;
  responsibilities: string[];
  dependencies: string[];
  technologies?: string[];
  interfaces?: {
    name: string;
    description: string;
    methods: {
      name: string;
      parameters: string[];
      returnType: string;
      description: string;
    }[];
  }[];
  metadata?: Record<string, any>;
}

/**
 * 架构关系接口
 */
export interface ArchitectureRelationship {
  id: string;
  sourceId: string;
  targetId: string;
  type: string;
  description: string;
  properties?: Record<string, any>;
}

/**
 * 架构设计接口
 */
export interface ArchitectureDesign {
  id: string;
  name: string;
  description: string;
  type: ArchitectureType;
  components: ArchitectureComponent[];
  relationships: ArchitectureRelationship[];
  principles: string[];
  constraints: string[];
  qualityAttributes: {
    name: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
  }[];
  diagrams?: {
    id: string;
    name: string;
    type: string;
    content: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

/**
 * 技术栈接口
 */
export interface TechnologyStack {
  id: string;
  name: string;
  description: string;
  categories: {
    name: string;
    technologies: {
      name: string;
      version?: string;
      description: string;
      url?: string;
      pros?: string[];
      cons?: string[];
    }[];
  }[];
  recommendations?: {
    scenario: string;
    recommendation: string;
    alternatives: string[];
  }[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 架构师代理配置接口
 */
export interface ArchitectAgentConfig extends AgentConfig {
  architectureTemplates?: string[];
  componentTemplates?: string[];
  technologyEvaluationStrategy?: string;
  designPrinciples?: string[];
  qualityAttributeWeights?: Record<string, number>;
}

/**
 * 架构师代理输入接口
 */
export interface ArchitectAgentInput {
  type: 'create_architecture' | 'evaluate_architecture' | 'suggest_tech_stack' | 'analyze_requirements';
  requirements?: Requirement[];
  userStories?: UserStory[];
  projectDescription?: string;
  architectureType?: ArchitectureType;
  existingArchitectureId?: string;
  techStackTypes?: TechStackType[];
}

/**
 * 架构师代理输出接口
 */
export interface ArchitectAgentOutput extends AgentOutput {
  architectureDesign?: ArchitectureDesign;
  evaluation?: string;
  techChoices?: TechChoice[];
  analysis?: string;
}

/**
 * 架构师代理接口
 */
export interface IArchitectAgent extends IAgent {
  /**
   * 创建架构设计
   * @param requirements 需求列表
   * @param userStories 用户故事列表
   * @param projectDescription 项目描述
   * @param architectureType 架构类型（可选）
   * @returns 创建的架构设计
   */
  createArchitecture(
    requirements: Requirement[],
    userStories: UserStory[],
    projectDescription: string,
    architectureType?: ArchitectureType
  ): Promise<ArchitectureDesign>;
  
  /**
   * 评估架构设计
   * @param architectureId 架构设计ID
   * @returns 评估结果
   */
  evaluateArchitecture(architectureId: string): Promise<string>;
  
  /**
   * 推荐技术栈
   * @param requirements 需求列表
   * @param techStackTypes 技术栈类型列表
   * @returns 推荐的技术选择列表
   */
  suggestTechStack(
    requirements: Requirement[],
    techStackTypes: TechStackType[]
  ): Promise<TechChoice[]>;
  
  /**
   * 分析需求
   * @param requirements 需求列表
   * @returns 分析结果
   */
  analyzeRequirements(requirements: Requirement[]): Promise<string>;
  
  /**
   * 获取架构设计
   * @param id 架构设计ID
   * @returns 架构设计，如果不存在则返回undefined
   */
  getArchitectureDesign(id: string): ArchitectureDesign | undefined;
  
  /**
   * 获取所有架构设计
   * @returns 所有架构设计
   */
  getAllArchitectureDesigns(): ArchitectureDesign[];
  
  /**
   * 获取技术选择
   * @param id 技术选择ID
   * @returns 技术选择，如果不存在则返回undefined
   */
  getTechChoice(id: string): TechChoice | undefined;
  
  /**
   * 获取所有技术选择
   * @returns 所有技术选择
   */
  getAllTechChoices(): TechChoice[];
  
  /**
   * 更新架构设计
   * @param architectureDesign 架构设计
   * @returns 更新后的架构设计
   */
  updateArchitectureDesign(architectureDesign: ArchitectureDesign): ArchitectureDesign;
  
  /**
   * 删除架构设计
   * @param id 架构设计ID
   * @returns 是否成功删除
   */
  deleteArchitectureDesign(id: string): boolean;
  
  /**
   * 与其他代理协作
   * 
   * @param agents 协作代理数组
   * @param collaborationType 协作类型
   * @param sessionId 会话ID
   * @returns 协作结果
   */
  collaborate(
    agents: IAgent[],
    collaborationType?: CollaborationType,
    sessionId?: string
  ): Promise<AgentOutput>;
}
