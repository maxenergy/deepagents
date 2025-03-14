import { IAgent, AgentConfig, AgentInput, AgentOutput } from '../IAgent';

/**
 * 产品需求接口
 */
export interface ProductRequirement {
    id: string;
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    status: 'draft' | 'approved' | 'rejected' | 'implemented';
    acceptanceCriteria: string[];
    createdAt: Date;
    updatedAt: Date;
    metadata?: Record<string, any>;
}

/**
 * 产品规格接口
 */
export interface ProductSpecification {
    id: string;
    title: string;
    description: string;
    requirements: ProductRequirement[];
    features: string[];
    userStories: string[];
    createdAt: Date;
    updatedAt: Date;
    metadata?: Record<string, any>;
}

/**
 * 产品经理代理配置接口
 */
export interface ProductManagerAgentConfig extends AgentConfig {
    requirementTemplates?: string[];
    specificationTemplates?: string[];
    analysisPrompts?: string[];
    prioritizationStrategy?: string;
}

/**
 * 产品经理代理输入接口
 */
export interface ProductManagerAgentInput extends AgentInput {
    requirementDraft?: string;
    existingRequirements?: ProductRequirement[];
    userFeedback?: string;
    marketResearch?: string;
    competitorAnalysis?: string;
}

/**
 * 产品经理代理输出接口
 */
export interface ProductManagerAgentOutput extends AgentOutput {
    requirements?: ProductRequirement[];
    specification?: ProductSpecification;
    analysis?: string;
    recommendations?: string[];
}

/**
 * 产品经理代理接口
 */
export interface IProductManagerAgent extends IAgent {
    // 需求管理方法
    createRequirement(draft: string): Promise<ProductRequirement>;
    updateRequirement(id: string, updates: Partial<ProductRequirement>): Promise<ProductRequirement>;
    deleteRequirement(id: string): Promise<boolean>;
    getAllRequirements(): Promise<ProductRequirement[]>;
    
    // 规格管理方法
    createSpecification(title: string, description: string): Promise<ProductSpecification>;
    updateSpecification(id: string, updates: Partial<ProductSpecification>): Promise<ProductSpecification>;
    generateSpecificationFromRequirements(requirementIds: string[]): Promise<ProductSpecification>;
    
    // 分析方法
    analyzeRequirements(requirements: ProductRequirement[]): Promise<string>;
    prioritizeRequirements(requirements: ProductRequirement[]): Promise<ProductRequirement[]>;
    validateRequirement(requirement: ProductRequirement): Promise<{isValid: boolean, issues: string[]}>;
}
