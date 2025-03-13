import { AgentConfig, AgentInput, AgentOutput, IAgent } from '../IAgent';

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
export interface ArchitectAgentInput extends AgentInput {
  requirements?: any[];
  existingArchitecture?: ArchitectureDesign;
  designConstraints?: string[];
  preferredTechnologies?: string[];
  excludedTechnologies?: string[];
  qualityAttributes?: {
    name: string;
    importance: number;
  }[];
}

/**
 * 架构师代理输出接口
 */
export interface ArchitectAgentOutput extends AgentOutput {
  architectureDesign?: ArchitectureDesign;
  technologyStack?: TechnologyStack;
  designDecisions?: {
    id: string;
    topic: string;
    options: {
      name: string;
      description: string;
      pros: string[];
      cons: string[];
    }[];
    decision: string;
    rationale: string;
  }[];
  technicalDebt?: {
    id: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
    remediationStrategy?: string;
  }[];
}

/**
 * 架构师代理接口
 */
export interface IArchitectAgent extends IAgent {
  /**
   * 创建架构设计
   * @param requirements 需求列表
   * @param constraints 约束条件
   * @returns 架构设计
   */
  createArchitectureDesign(
    requirements: any[],
    constraints?: string[]
  ): Promise<ArchitectureDesign>;

  /**
   * 更新架构设计
   * @param designId 设计ID
   * @param updates 更新内容
   * @returns 更新后的架构设计
   */
  updateArchitectureDesign(
    designId: string,
    updates: Partial<ArchitectureDesign>
  ): Promise<ArchitectureDesign>;

  /**
   * 添加架构组件
   * @param designId 设计ID
   * @param component 组件
   * @returns 更新后的架构设计
   */
  addComponent(
    designId: string,
    component: ArchitectureComponent
  ): Promise<ArchitectureDesign>;

  /**
   * 更新架构组件
   * @param designId 设计ID
   * @param componentId 组件ID
   * @param updates 更新内容
   * @returns 更新后的架构设计
   */
  updateComponent(
    designId: string,
    componentId: string,
    updates: Partial<ArchitectureComponent>
  ): Promise<ArchitectureDesign>;

  /**
   * 删除架构组件
   * @param designId 设计ID
   * @param componentId 组件ID
   * @returns 更新后的架构设计
   */
  removeComponent(
    designId: string,
    componentId: string
  ): Promise<ArchitectureDesign>;

  /**
   * 添加架构关系
   * @param designId 设计ID
   * @param relationship 关系
   * @returns 更新后的架构设计
   */
  addRelationship(
    designId: string,
    relationship: ArchitectureRelationship
  ): Promise<ArchitectureDesign>;

  /**
   * 更新架构关系
   * @param designId 设计ID
   * @param relationshipId 关系ID
   * @param updates 更新内容
   * @returns 更新后的架构设计
   */
  updateRelationship(
    designId: string,
    relationshipId: string,
    updates: Partial<ArchitectureRelationship>
  ): Promise<ArchitectureDesign>;

  /**
   * 删除架构关系
   * @param designId 设计ID
   * @param relationshipId 关系ID
   * @returns 更新后的架构设计
   */
  removeRelationship(
    designId: string,
    relationshipId: string
  ): Promise<ArchitectureDesign>;

  /**
   * 评估架构设计
   * @param designId 设计ID
   * @param qualityAttributes 质量属性
   * @returns 评估结果
   */
  evaluateArchitecture(
    designId: string,
    qualityAttributes?: string[]
  ): Promise<{
    overallScore: number;
    attributeScores: Record<string, number>;
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  }>;

  /**
   * 推荐技术栈
   * @param designId 设计ID
   * @param constraints 约束条件
   * @returns 技术栈
   */
  recommendTechnologyStack(
    designId: string,
    constraints?: string[]
  ): Promise<TechnologyStack>;

  /**
   * 生成架构图
   * @param designId 设计ID
   * @param diagramType 图表类型
   * @returns 架构图
   */
  generateArchitectureDiagram(
    designId: string,
    diagramType: string
  ): Promise<{
    id: string;
    name: string;
    type: string;
    content: string;
  }>;

  /**
   * 分析技术债务
   * @param designId 设计ID
   * @returns 技术债务列表
   */
  analyzeTechnicalDebt(
    designId: string
  ): Promise<{
    id: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
    remediationStrategy?: string;
  }[]>;

  /**
   * 验证架构设计
   * @param designId 设计ID
   * @param requirements 需求列表
   * @returns 验证结果
   */
  validateArchitecture(
    designId: string,
    requirements: any[]
  ): Promise<{
    isValid: boolean;
    issues: {
      componentId?: string;
      relationshipId?: string;
      description: string;
      severity: 'critical' | 'major' | 'minor';
    }[];
    requirementsCoverage: number;
  }>;
}
