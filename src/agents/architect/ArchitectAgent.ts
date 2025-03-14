import * as vscode from 'vscode';
import { v4 as uuidv4 } from 'uuid';
import { BaseAgent } from '../BaseAgent';
import { AgentRole, AgentCapability, AgentState, AgentInput, AgentOutput, AgentAction, AgentConfig } from '../IAgent';
import { 
    IArchitectAgent, 
    ArchitectAgentConfig, 
    ArchitectAgentInput, 
    ArchitectAgentOutput,
    ArchitectureDesign,
    ArchitectureComponent,
    ArchitectureRelationship,
    ArchitectureType,
    TechnologyStack
} from './IArchitectAgent';
import { LLMService } from '../../llm/LLMService';
import { LLMModelRole } from '../../llm/ILLMProvider';

/**
 * 架构师代理类，负责系统设计和技术选型
 */
export class ArchitectAgent extends BaseAgent implements IArchitectAgent {
    private _designs: Map<string, ArchitectureDesign>;
    private _technologyStacks: Map<string, TechnologyStack>;
    private _llmService: LLMService;
    protected _architectConfig: ArchitectAgentConfig;

    constructor() {
        super();
        this.role = AgentRole.ARCHITECT;
        this.capabilities = [
            AgentCapability.SYSTEM_DESIGN,
            AgentCapability.DOCUMENTATION
        ];
        this._designs = new Map<string, ArchitectureDesign>();
        this._technologyStacks = new Map<string, TechnologyStack>();
        this._llmService = LLMService.getInstance();
        this._architectConfig = {} as ArchitectAgentConfig;
    }

    /**
     * 初始化回调
     */
    protected async onInitialize(): Promise<void> {
        this._architectConfig = this._config as ArchitectAgentConfig;
        console.log(`ArchitectAgent ${this.id} initialized with ${this._architectConfig.architectureTemplates?.length || 0} architecture templates.`);
    }

    /**
     * 处理输入
     * @param input 代理输入
     * @returns 代理输出
     */
    public async process(input: AgentInput): Promise<AgentOutput> {
        const architectInput = input as ArchitectAgentInput;
        
        // 处理需求创建架构设计
        if (architectInput.requirements && architectInput.requirements.length > 0) {
            const constraints = architectInput.designConstraints || [];
            const design = await this.createArchitectureDesign(architectInput.requirements, constraints);
            const technologyStack = await this.recommendTechnologyStack(design.id, constraints);
            
            return {
                agentId: this.id,
                timestamp: new Date(),
                status: 'success',
                message: `已创建架构设计: ${design.name}`,
                response: `已创建架构设计: ${design.name}`,
                actions: [{
                    type: 'architecture_created',
                    payload: {
                        design,
                        technologyStack
                    }
                }],
                architectureDesign: design,
                technologyStack: technologyStack
            } as ArchitectAgentOutput;
        }
        
        // 处理现有架构评估
        if (architectInput.existingArchitecture) {
            const designId = architectInput.existingArchitecture.id;
            this._designs.set(designId, architectInput.existingArchitecture);
            
            const evaluation = await this.evaluateArchitecture(
                designId, 
                architectInput.qualityAttributes?.map(qa => qa.name)
            );
            
            const technicalDebt = await this.analyzeTechnicalDebt(designId);
            
            return {
                agentId: this.id,
                timestamp: new Date(),
                status: 'success',
                message: `架构评估完成，总体得分: ${evaluation.overallScore}`,
                response: `架构评估完成，总体得分: ${evaluation.overallScore}`,
                actions: [{
                    type: 'architecture_evaluated',
                    payload: {
                        evaluation,
                        technicalDebt
                    }
                }],
                architectureDesign: architectInput.existingArchitecture,
                technicalDebt: technicalDebt
            } as ArchitectAgentOutput;
        }
        
        // 默认处理
        return await super.process(input);
    }

    /**
     * 调用LLM
     * @param prompt 提示字符串
     * @returns LLM响应
     */
    protected async callLLM(prompt: string): Promise<string> {
        try {
            const response = await this._llmService.sendRequest({
                model: this._architectConfig.model || 'gpt-4',
                messages: [{ role: LLMModelRole.USER, content: prompt }],
                temperature: this._architectConfig.temperature || 0.7,
                maxTokens: this._architectConfig.maxTokens || 3000
            });
            
            return response.content || '';
        } catch (error) {
            console.error('Error calling LLM:', error);
            throw error;
        }
    }

    /**
     * 创建架构设计
     * @param requirements 需求列表
     * @param constraints 约束条件
     * @returns 架构设计
     */
    public async createArchitectureDesign(
        requirements: any[],
        constraints?: string[]
    ): Promise<ArchitectureDesign> {
        const prompt = this._buildArchitecturePrompt(requirements, constraints);
        const response = await this.callLLM(prompt);
        
        try {
            // 尝试解析JSON响应
            const designData = JSON.parse(response);
            
            const design: ArchitectureDesign = {
                id: uuidv4(),
                name: designData.name || '系统架构设计',
                description: designData.description || '',
                type: this._parseArchitectureType(designData.type),
                components: this._parseComponents(designData.components || []),
                relationships: this._parseRelationships(designData.relationships || []),
                principles: designData.principles || [],
                constraints: constraints || [],
                qualityAttributes: designData.qualityAttributes || [],
                createdAt: new Date(),
                updatedAt: new Date(),
                metadata: {
                    source: 'ai_generated',
                    requirementsCount: requirements.length
                }
            };
            
            // 存储设计
            this._designs.set(design.id, design);
            
            return design;
        } catch (error) {
            console.error('Error parsing architecture design from LLM response:', error);
            
            // 创建一个基本设计
            const design: ArchitectureDesign = {
                id: uuidv4(),
                name: '基本系统架构',
                description: '基于需求自动生成的架构设计',
                type: ArchitectureType.LAYERED,
                components: [],
                relationships: [],
                principles: [],
                constraints: constraints || [],
                qualityAttributes: [],
                createdAt: new Date(),
                updatedAt: new Date(),
                metadata: {
                    source: 'fallback',
                    requirementsCount: requirements.length
                }
            };
            
            // 存储设计
            this._designs.set(design.id, design);
            
            return design;
        }
    }

    /**
     * 更新架构设计
     * @param designId 设计ID
     * @param updates 更新内容
     * @returns 更新后的架构设计
     */
    public async updateArchitectureDesign(
        designId: string,
        updates: Partial<ArchitectureDesign>
    ): Promise<ArchitectureDesign> {
        const design = this._designs.get(designId);
        
        if (!design) {
            throw new Error(`Architecture design with id ${designId} not found.`);
        }
        
        const updatedDesign: ArchitectureDesign = {
            ...design,
            ...updates,
            updatedAt: new Date()
        };
        
        // 存储更新后的设计
        this._designs.set(designId, updatedDesign);
        
        return updatedDesign;
    }

    /**
     * 添加架构组件
     * @param designId 设计ID
     * @param component 组件
     * @returns 更新后的架构设计
     */
    public async addComponent(
        designId: string,
        component: ArchitectureComponent
    ): Promise<ArchitectureDesign> {
        const design = this._designs.get(designId);
        
        if (!design) {
            throw new Error(`Architecture design with id ${designId} not found.`);
        }
        
        // 确保组件有ID
        if (!component.id) {
            component.id = uuidv4();
        }
        
        const updatedDesign: ArchitectureDesign = {
            ...design,
            components: [...design.components, component],
            updatedAt: new Date()
        };
        
        // 存储更新后的设计
        this._designs.set(designId, updatedDesign);
        
        return updatedDesign;
    }

    /**
     * 更新架构组件
     * @param designId 设计ID
     * @param componentId 组件ID
     * @param updates 更新内容
     * @returns 更新后的架构设计
     */
    public async updateComponent(
        designId: string,
        componentId: string,
        updates: Partial<ArchitectureComponent>
    ): Promise<ArchitectureDesign> {
        const design = this._designs.get(designId);
        
        if (!design) {
            throw new Error(`Architecture design with id ${designId} not found.`);
        }
        
        const componentIndex = design.components.findIndex(c => c.id === componentId);
        
        if (componentIndex === -1) {
            throw new Error(`Component with id ${componentId} not found in design ${designId}.`);
        }
        
        const updatedComponents = [...design.components];
        updatedComponents[componentIndex] = {
            ...updatedComponents[componentIndex],
            ...updates
        };
        
        const updatedDesign: ArchitectureDesign = {
            ...design,
            components: updatedComponents,
            updatedAt: new Date()
        };
        
        // 存储更新后的设计
        this._designs.set(designId, updatedDesign);
        
        return updatedDesign;
    }

    /**
     * 删除架构组件
     * @param designId 设计ID
     * @param componentId 组件ID
     * @returns 更新后的架构设计
     */
    public async removeComponent(
        designId: string,
        componentId: string
    ): Promise<ArchitectureDesign> {
        const design = this._designs.get(designId);
        
        if (!design) {
            throw new Error(`Architecture design with id ${designId} not found.`);
        }
        
        // 过滤掉要删除的组件
        const updatedComponents = design.components.filter(c => c.id !== componentId);
        
        // 同时删除与该组件相关的关系
        const updatedRelationships = design.relationships.filter(
            r => r.sourceId !== componentId && r.targetId !== componentId
        );
        
        const updatedDesign: ArchitectureDesign = {
            ...design,
            components: updatedComponents,
            relationships: updatedRelationships,
            updatedAt: new Date()
        };
        
        // 存储更新后的设计
        this._designs.set(designId, updatedDesign);
        
        return updatedDesign;
    }

    /**
     * 添加架构关系
     * @param designId 设计ID
     * @param relationship 关系
     * @returns 更新后的架构设计
     */
    public async addRelationship(
        designId: string,
        relationship: ArchitectureRelationship
    ): Promise<ArchitectureDesign> {
        const design = this._designs.get(designId);
        
        if (!design) {
            throw new Error(`Architecture design with id ${designId} not found.`);
        }
        
        // 确保关系有ID
        if (!relationship.id) {
            relationship.id = uuidv4();
        }
        
        // 验证源组件和目标组件存在
        const sourceExists = design.components.some(c => c.id === relationship.sourceId);
        const targetExists = design.components.some(c => c.id === relationship.targetId);
        
        if (!sourceExists) {
            throw new Error(`Source component with id ${relationship.sourceId} not found in design ${designId}.`);
        }
        
        if (!targetExists) {
            throw new Error(`Target component with id ${relationship.targetId} not found in design ${designId}.`);
        }
        
        const updatedDesign: ArchitectureDesign = {
            ...design,
            relationships: [...design.relationships, relationship],
            updatedAt: new Date()
        };
        
        // 存储更新后的设计
        this._designs.set(designId, updatedDesign);
        
        return updatedDesign;
    }

    /**
     * 更新架构关系
     * @param designId 设计ID
     * @param relationshipId 关系ID
     * @param updates 更新内容
     * @returns 更新后的架构设计
     */
    public async updateRelationship(
        designId: string,
        relationshipId: string,
        updates: Partial<ArchitectureRelationship>
    ): Promise<ArchitectureDesign> {
        const design = this._designs.get(designId);
        
        if (!design) {
            throw new Error(`Architecture design with id ${designId} not found.`);
        }
        
        const relationshipIndex = design.relationships.findIndex(r => r.id === relationshipId);
        
        if (relationshipIndex === -1) {
            throw new Error(`Relationship with id ${relationshipId} not found in design ${designId}.`);
        }
        
        const updatedRelationships = [...design.relationships];
        updatedRelationships[relationshipIndex] = {
            ...updatedRelationships[relationshipIndex],
            ...updates
        };
        
        const updatedDesign: ArchitectureDesign = {
            ...design,
            relationships: updatedRelationships,
            updatedAt: new Date()
        };
        
        // 存储更新后的设计
        this._designs.set(designId, updatedDesign);
        
        return updatedDesign;
    }

    /**
     * 删除架构关系
     * @param designId 设计ID
     * @param relationshipId 关系ID
     * @returns 更新后的架构设计
     */
    public async removeRelationship(
        designId: string,
        relationshipId: string
    ): Promise<ArchitectureDesign> {
        const design = this._designs.get(designId);
        
        if (!design) {
            throw new Error(`Architecture design with id ${designId} not found.`);
        }
        
        // 过滤掉要删除的关系
        const updatedRelationships = design.relationships.filter(r => r.id !== relationshipId);
        
        const updatedDesign: ArchitectureDesign = {
            ...design,
            relationships: updatedRelationships,
            updatedAt: new Date()
        };
        
        // 存储更新后的设计
        this._designs.set(designId, updatedDesign);
        
        return updatedDesign;
    }

    /**
     * 评估架构设计
     * @param designId 设计ID
     * @param qualityAttributes 质量属性
     * @returns 评估结果
     */
    public async evaluateArchitecture(
        designId: string,
        qualityAttributes?: string[]
    ): Promise<{
        overallScore: number;
        attributeScores: Record<string, number>;
        strengths: string[];
        weaknesses: string[];
        recommendations: string[];
    }> {
        const design = this._designs.get(designId);
        
        if (!design) {
            throw new Error(`Architecture design with id ${designId} not found.`);
        }
        
        const prompt = this._buildEvaluationPrompt(design, qualityAttributes);
        const response = await this.callLLM(prompt);
        
        try {
            // 尝试解析JSON响应
            const evaluationData = JSON.parse(response);
            
            return {
                overallScore: evaluationData.overallScore || 0,
                attributeScores: evaluationData.attributeScores || {},
                strengths: evaluationData.strengths || [],
                weaknesses: evaluationData.weaknesses || [],
                recommendations: evaluationData.recommendations || []
            };
        } catch (error) {
            console.error('Error parsing architecture evaluation from LLM response:', error);
            
            // 返回基本评估
            return {
                overallScore: 5,
                attributeScores: {},
                strengths: ['架构设计已完成'],
                weaknesses: ['需要进一步细化'],
                recommendations: ['添加更多组件细节', '定义更清晰的接口']
            };
        }
    }

    /**
     * 推荐技术栈
     * @param designId 设计ID
     * @param constraints 约束条件
     * @returns 技术栈
     */
    public async recommendTechnologyStack(
        designId: string,
        constraints?: string[]
    ): Promise<TechnologyStack> {
        const design = this._designs.get(designId);
        
        if (!design) {
            throw new Error(`Architecture design with id ${designId} not found.`);
        }
        
        const prompt = this._buildTechnologyStackPrompt(design, constraints);
        const response = await this.callLLM(prompt);
        
        try {
            // 尝试解析JSON响应
            const techStackData = JSON.parse(response);
            
            const technologyStack: TechnologyStack = {
                id: uuidv4(),
                name: techStackData.name || '推荐技术栈',
                description: techStackData.description || '',
                categories: techStackData.categories || [],
                recommendations: techStackData.recommendations || [],
                createdAt: new Date(),
                updatedAt: new Date()
            };
            
            // 存储技术栈
            this._technologyStacks.set(technologyStack.id, technologyStack);
            
            return technologyStack;
        } catch (error) {
            console.error('Error parsing technology stack from LLM response:', error);
            
            // 创建一个基本技术栈
            const technologyStack: TechnologyStack = {
                id: uuidv4(),
                name: '基本技术栈',
                description: '基于架构设计自动生成的技术栈推荐',
                categories: [
                    {
                        name: '前端',
                        technologies: [
                            {
                                name: 'React',
                                version: '18.x',
                                description: '用户界面库'
                            }
                        ]
                    },
                    {
                        name: '后端',
                        technologies: [
                            {
                                name: 'Node.js',
                                version: '18.x',
                                description: '服务器运行时'
                            }
                        ]
                    }
                ],
                createdAt: new Date(),
                updatedAt: new Date()
            };
            
            // 存储技术栈
            this._technologyStacks.set(technologyStack.id, technologyStack);
            
            return technologyStack;
        }
    }

    /**
     * 生成架构图
     * @param designId 设计ID
     * @param diagramType 图表类型
     * @returns 架构图
     */
    public async generateArchitectureDiagram(
        designId: string,
        diagramType: string
    ): Promise<{
        id: string;
        name: string;
        type: string;
        content: string;
    }> {
        const design = this._designs.get(designId);
        
        if (!design) {
            throw new Error(`Architecture design with id ${designId} not found.`);
        }
        
        const prompt = this._buildDiagramPrompt(design, diagramType);
        const response = await this.callLLM(prompt);
        
        try {
            // 尝试解析JSON响应
            const diagramData = JSON.parse(response);
            
            const diagram = {
                id: uuidv4(),
                name: diagramData.name || `${diagramType} 图`,
                type: diagramType,
                content: diagramData.content || ''
            };
            
            // 更新设计中的图表
            const updatedDiagrams = design.diagrams ? [...design.diagrams] : [];
            updatedDiagrams.push(diagram);
            
            await this.updateArchitectureDesign(designId, { diagrams: updatedDiagrams });
            
            return diagram;
        } catch (error) {
            console.error('Error parsing diagram from LLM response:', error);
            
            // 创建一个基本图表
            const diagram = {
                id: uuidv4(),
                name: `${diagramType} 图`,
                type: diagramType,
                content: '// 基本图表内容'
            };
            
            return diagram;
        }
    }

    /**
     * 分析技术债务
     * @param designId 设计ID
     * @returns 技术债务列表
     */
    public async analyzeTechnicalDebt(
        designId: string
    ): Promise<{
        id: string;
        description: string;
        impact: 'high' | 'medium' | 'low';
        remediationStrategy?: string;
    }[]> {
        const design = this._designs.get(designId);
        
        if (!design) {
            throw new Error(`Architecture design with id ${designId} not found.`);
        }
        
        const prompt = this._buildTechnicalDebtPrompt(design);
        const response = await this.callLLM(prompt);
        
        try {
            // 尝试解析JSON响应
            const debtItems = JSON.parse(response);
            
            if (Array.isArray(debtItems)) {
                return debtItems.map(item => ({
                    id: uuidv4(),
                    description: item.description || '',
                    impact: item.impact || 'medium',
                    remediationStrategy: item.remediationStrategy
                }));
            }
            
            return [];
        } catch (error) {
            console.error('Error parsing technical debt from LLM response:', error);
            
            // 返回基本技术债务
            return [
                {
                    id: uuidv4(),
                    description: '架构文档不完整',
                    impact: 'medium',
                    remediationStrategy: '完善架构文档，添加更多细节'
                }
            ];
        }
    }

    /**
     * 验证架构设计
     * @param designId 设计ID
     * @param requirements 需求列表
     * @returns 验证结果
     */
    public async validateArchitecture(
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
    }> {
        const design = this._designs.get(designId);
        
        if (!design) {
            throw new Error(`Architecture design with id ${designId} not found.`);
        }
        
        const prompt = this._buildValidationPrompt(design, requirements);
        const response = await this.callLLM(prompt);
        
        try {
            // 尝试解析JSON响应
            const validationData = JSON.parse(response);
            
            return {
                isValid: validationData.isValid || false,
                issues: validationData.issues || [],
                requirementsCoverage: validationData.requirementsCoverage || 0
            };
        } catch (error) {
            console.error('Error parsing validation result from LLM response:', error);
            
            // 返回基本验证结果
            return {
                isValid: design.components.length > 0,
                issues: [
                    {
                        description: '需要进一步验证架构设计是否满足所有需求',
                        severity: 'major'
                    }
                ],
                requirementsCoverage: 0.5
            };
        }
    }

    /**
     * 构建架构提示
     * @param requirements 需求列表
     * @param constraints 约束条件
     * @returns 提示字符串
     */
    private _buildArchitecturePrompt(requirements: any[], constraints?: string[]): string {
        let prompt = '';
        
        // 使用模板（如果有）
        if (this._architectConfig.architectureTemplates && this._architectConfig.architectureTemplates.length > 0) {
            prompt += this._architectConfig.architectureTemplates[0] + '\n\n';
        } else {
            prompt += `你是一名经验丰富的软件架构师，负责设计系统架构。
请根据以下需求和约束条件，创建一个完整的架构设计。
返回一个JSON对象，包含以下字段：
- name: 架构名称
- description: 架构描述
- type: 架构类型（monolithic, microservices, serverless, event_driven, layered, modular, custom）
- components: 组件数组，每个组件包含id, name, type, description, responsibilities, dependencies
- relationships: 关系数组，每个关系包含sourceId, targetId, type, description
- principles: 架构原则数组
- qualityAttributes: 质量属性数组，每个包含name, description, priority

只返回JSON对象，不要包含其他解释。\n\n`;
        }
        
        prompt += `需求列表:\n`;
        requirements.forEach((req, index) => {
            prompt += `${index + 1}. `;
            if (typeof req === 'string') {
                prompt += req + '\n';
            } else if (req.title) {
                prompt += `${req.title}\n`;
                if (req.description) {
                    prompt += `   描述: ${req.description}\n`;
                }
                if (req.priority) {
                    prompt += `   优先级: ${req.priority}\n`;
                }
            }
        });
        
        if (constraints && constraints.length > 0) {
            prompt += `\n约束条件:\n`;
            constraints.forEach((constraint, index) => {
                prompt += `${index + 1}. ${constraint}\n`;
            });
        }
        
        // 添加设计原则（如果有）
        if (this._architectConfig.designPrinciples && this._architectConfig.designPrinciples.length > 0) {
            prompt += `\n设计原则:\n`;
            this._architectConfig.designPrinciples.forEach((principle, index) => {
                prompt += `${index + 1}. ${principle}\n`;
            });
        }
        
        return prompt;
    }

    /**
     * 构建评估提示
     * @param design 架构设计
     * @param qualityAttributes 质量属性
     * @returns 提示字符串
     */
    private _buildEvaluationPrompt(design: ArchitectureDesign, qualityAttributes?: string[]): string {
        let prompt = `你是一名经验丰富的软件架构评估专家，负责评估架构设计的质量。
请对以下架构设计进行全面评估，并返回一个JSON对象，包含以下字段：
- overallScore: 总体评分（0-10）
- attributeScores: 各质量属性的评分（键值对）
- strengths: 优点数组
- weaknesses: 缺点数组
- recommendations: 改进建议数组

只返回JSON对象，不要包含其他解释。\n\n`;
        
        prompt += `架构设计:\n`;
        prompt += `名称: ${design.name}\n`;
        prompt += `描述: ${design.description}\n`;
        prompt += `类型: ${design.type}\n\n`;
        
        prompt += `组件 (${design.components.length}):\n`;
        design.components.forEach((component, index) => {
            prompt += `${index + 1}. ${component.name} (${component.type})\n`;
            prompt += `   描述: ${component.description}\n`;
            prompt += `   职责: ${component.responsibilities.join(', ')}\n`;
            if (component.dependencies.length > 0) {
                prompt += `   依赖: ${component.dependencies.join(', ')}\n`;
            }
        });
        
        prompt += `\n关系 (${design.relationships.length}):\n`;
        design.relationships.forEach((rel, index) => {
            const source = design.components.find(c => c.id === rel.sourceId);
            const target = design.components.find(c => c.id === rel.targetId);
            prompt += `${index + 1}. ${source?.name || rel.sourceId} -> ${target?.name || rel.targetId} (${rel.type})\n`;
            prompt += `   描述: ${rel.description}\n`;
        });
        
        if (design.principles.length > 0) {
            prompt += `\n原则:\n`;
            design.principles.forEach((principle, index) => {
                prompt += `${index + 1}. ${principle}\n`;
            });
        }
        
        if (design.qualityAttributes.length > 0) {
            prompt += `\n质量属性:\n`;
            design.qualityAttributes.forEach((qa, index) => {
                prompt += `${index + 1}. ${qa.name} (${qa.priority})\n`;
                prompt += `   描述: ${qa.description}\n`;
            });
        }
        
        if (qualityAttributes && qualityAttributes.length > 0) {
            prompt += `\n请特别关注以下质量属性:\n`;
            qualityAttributes.forEach((qa, index) => {
                prompt += `${index + 1}. ${qa}\n`;
            });
        }
        
        // 添加权重（如果有）
        if (this._architectConfig.qualityAttributeWeights) {
            prompt += `\n质量属性权重:\n`;
            for (const [attribute, weight] of Object.entries(this._architectConfig.qualityAttributeWeights)) {
                prompt += `${attribute}: ${weight}\n`;
            }
        }
        
        return prompt;
    }

    /**
     * 构建技术栈提示
     * @param design 架构设计
     * @param constraints 约束条件
     * @returns 提示字符串
     */
    private _buildTechnologyStackPrompt(design: ArchitectureDesign, constraints?: string[]): string {
        let prompt = `你是一名经验丰富的技术架构师，负责选择适合的技术栈。
请根据以下架构设计和约束条件，推荐一个完整的技术栈。
返回一个JSON对象，包含以下字段：
- name: 技术栈名称
- description: 技术栈描述
- categories: 技术类别数组，每个类别包含name和technologies数组
- recommendations: 推荐数组，每个包含scenario, recommendation, alternatives

technologies数组中的每个技术应包含name, version, description, pros, cons

只返回JSON对象，不要包含其他解释。\n\n`;
        
        prompt += `架构设计:\n`;
        prompt += `名称: ${design.name}\n`;
        prompt += `描述: ${design.description}\n`;
        prompt += `类型: ${design.type}\n\n`;
        
        prompt += `组件:\n`;
        design.components.forEach((component, index) => {
            prompt += `${index + 1}. ${component.name} (${component.type})\n`;
            prompt += `   描述: ${component.description}\n`;
            prompt += `   职责: ${component.responsibilities.join(', ')}\n`;
        });
        
        if (constraints && constraints.length > 0) {
            prompt += `\n约束条件:\n`;
            constraints.forEach((constraint, index) => {
                prompt += `${index + 1}. ${constraint}\n`;
            });
        }
        
        // 添加评估策略（如果有）
        if (this._architectConfig.technologyEvaluationStrategy) {
            prompt += `\n技术评估策略:\n${this._architectConfig.technologyEvaluationStrategy}\n`;
        }
        
        return prompt;
    }

    /**
     * 构建图表提示
     * @param design 架构设计
     * @param diagramType 图表类型
     * @returns 提示字符串
     */
    private _buildDiagramPrompt(design: ArchitectureDesign, diagramType: string): string {
        let prompt = `你是一名经验丰富的软件架构师，擅长创建架构图。
请根据以下架构设计，创建一个${diagramType}图。
返回一个JSON对象，包含以下字段：
- name: 图表名称
- content: 图表内容（使用适当的格式，如PlantUML、Mermaid等）

只返回JSON对象，不要包含其他解释。\n\n`;
        
        prompt += `架构设计:\n`;
        prompt += `名称: ${design.name}\n`;
        prompt += `描述: ${design.description}\n`;
        prompt += `类型: ${design.type}\n\n`;
        
        prompt += `组件:\n`;
        design.components.forEach((component, index) => {
            prompt += `${index + 1}. ${component.name} (${component.type})\n`;
            prompt += `   ID: ${component.id}\n`;
            prompt += `   描述: ${component.description}\n`;
        });
        
        prompt += `\n关系:\n`;
        design.relationships.forEach((rel, index) => {
            const source = design.components.find(c => c.id === rel.sourceId);
            const target = design.components.find(c => c.id === rel.targetId);
            prompt += `${index + 1}. ${source?.name || rel.sourceId} -> ${target?.name || rel.targetId} (${rel.type})\n`;
            prompt += `   描述: ${rel.description}\n`;
        });
        
        if (diagramType.toLowerCase() === 'c4') {
            prompt += `\n请使用C4模型格式创建图表，包括Context, Container, Component和Code级别的视图。\n`;
        } else if (diagramType.toLowerCase() === 'uml') {
            prompt += `\n请使用UML格式创建图表，使用PlantUML语法。\n`;
        } else if (diagramType.toLowerCase() === 'mermaid') {
            prompt += `\n请使用Mermaid格式创建图表。\n`;
        }
        
        return prompt;
    }

    /**
     * 构建技术债务提示
     * @param design 架构设计
     * @returns 提示字符串
     */
    private _buildTechnicalDebtPrompt(design: ArchitectureDesign): string {
        let prompt = `你是一名经验丰富的软件架构师，擅长识别技术债务。
请分析以下架构设计，识别潜在的技术债务。
返回一个JSON数组，每个元素包含以下字段：
- description: 技术债务描述
- impact: 影响程度（high, medium, low）
- remediationStrategy: 修复策略

只返回JSON数组，不要包含其他解释。\n\n`;
        
        prompt += `架构设计:\n`;
        prompt += `名称: ${design.name}\n`;
        prompt += `描述: ${design.description}\n`;
        prompt += `类型: ${design.type}\n\n`;
        
        prompt += `组件 (${design.components.length}):\n`;
        design.components.forEach((component, index) => {
            prompt += `${index + 1}. ${component.name} (${component.type})\n`;
            prompt += `   描述: ${component.description}\n`;
            prompt += `   职责: ${component.responsibilities.join(', ')}\n`;
            if (component.dependencies.length > 0) {
                prompt += `   依赖: ${component.dependencies.join(', ')}\n`;
            }
        });
        
        prompt += `\n关系 (${design.relationships.length}):\n`;
        design.relationships.forEach((rel, index) => {
            const source = design.components.find(c => c.id === rel.sourceId);
            const target = design.components.find(c => c.id === rel.targetId);
            prompt += `${index + 1}. ${source?.name || rel.sourceId} -> ${target?.name || rel.targetId} (${rel.type})\n`;
            prompt += `   描述: ${rel.description}\n`;
        });
        
        return prompt;
    }

    /**
     * 构建验证提示
     * @param design 架构设计
     * @param requirements 需求列表
     * @returns 提示字符串
     */
    private _buildValidationPrompt(design: ArchitectureDesign, requirements: any[]): string {
        let prompt = `你是一名经验丰富的软件架构师，负责验证架构设计是否满足需求。
请验证以下架构设计是否满足给定的需求列表。
返回一个JSON对象，包含以下字段：
- isValid: 布尔值，表示架构是否有效
- issues: 问题数组，每个问题包含componentId/relationshipId, description, severity
- requirementsCoverage: 需求覆盖率（0-1）

只返回JSON对象，不要包含其他解释。\n\n`;
        
        prompt += `架构设计:\n`;
        prompt += `名称: ${design.name}\n`;
        prompt += `描述: ${design.description}\n`;
        prompt += `类型: ${design.type}\n\n`;
        
        prompt += `组件:\n`;
        design.components.forEach((component, index) => {
            prompt += `${index + 1}. ${component.name} (${component.type})\n`;
            prompt += `   ID: ${component.id}\n`;
            prompt += `   描述: ${component.description}\n`;
            prompt += `   职责: ${component.responsibilities.join(', ')}\n`;
        });
        
        prompt += `\n关系:\n`;
        design.relationships.forEach((rel, index) => {
            const source = design.components.find(c => c.id === rel.sourceId);
            const target = design.components.find(c => c.id === rel.targetId);
            prompt += `${index + 1}. ${source?.name || rel.sourceId} -> ${target?.name || rel.targetId} (${rel.type})\n`;
            prompt += `   ID: ${rel.id}\n`;
            prompt += `   描述: ${rel.description}\n`;
        });
        
        prompt += `\n需求列表:\n`;
        requirements.forEach((req, index) => {
            prompt += `${index + 1}. `;
            if (typeof req === 'string') {
                prompt += req + '\n';
            } else if (req.title) {
                prompt += `${req.title}\n`;
                if (req.description) {
                    prompt += `   描述: ${req.description}\n`;
                }
                if (req.priority) {
                    prompt += `   优先级: ${req.priority}\n`;
                }
            }
        });
        
        return prompt;
    }

    /**
     * 解析架构类型
     * @param typeStr 类型字符串
     * @returns 架构类型
     */
    private _parseArchitectureType(typeStr: string): ArchitectureType {
        if (!typeStr) {
            return ArchitectureType.LAYERED;
        }
        
        const normalizedType = typeStr.toLowerCase();
        
        switch (normalizedType) {
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
            default:
                return ArchitectureType.CUSTOM;
        }
    }

    /**
     * 解析组件
     * @param componentsData 组件数据
     * @returns 组件数组
     */
    private _parseComponents(componentsData: any[]): ArchitectureComponent[] {
        if (!Array.isArray(componentsData)) {
            return [];
        }
        
        return componentsData.map(data => {
            return {
                id: data.id || uuidv4(),
                name: data.name || '未命名组件',
                type: data.type || 'component',
                description: data.description || '',
                responsibilities: Array.isArray(data.responsibilities) ? data.responsibilities : [],
                dependencies: Array.isArray(data.dependencies) ? data.dependencies : [],
                technologies: Array.isArray(data.technologies) ? data.technologies : undefined,
                interfaces: Array.isArray(data.interfaces) ? data.interfaces : undefined,
                metadata: data.metadata
            };
        });
    }

    /**
     * 解析关系
     * @param relationshipsData 关系数据
     * @returns 关系数组
     */
    private _parseRelationships(relationshipsData: any[]): ArchitectureRelationship[] {
        if (!Array.isArray(relationshipsData)) {
            return [];
        }
        
        return relationshipsData.map(data => {
            return {
                id: data.id || uuidv4(),
                sourceId: data.sourceId || '',
                targetId: data.targetId || '',
                type: data.type || 'depends-on',
                description: data.description || '',
                properties: data.properties
            };
        });
    }
}
