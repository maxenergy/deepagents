import * as vscode from 'vscode';
import { v4 as uuidv4 } from 'uuid';
import { AgentRole, AgentCapability, AgentState, AgentInput, AgentOutput, AgentAction, AgentConfig, IAgent } from '../IAgent';
import { 
    IProductManagerAgent, 
    ProductManagerAgentConfig, 
    ProductManagerAgentInput, 
    ProductManagerAgentOutput,
    ProductRequirement,
    ProductSpecification
} from './IProductManagerAgent';
import { LLMService } from '../../llm/LLMService';
import { LLMModelRole } from '../../llm/ILLMProvider';

/**
 * 产品经理代理类，负责需求分析和产品规划
 */
export class ProductManagerAgent implements IProductManagerAgent {
    public id: string;
    public name: string;
    public role: AgentRole;
    public capabilities: AgentCapability[];
    public state: AgentState;
    
    private _requirements: Map<string, ProductRequirement>;
    private _specifications: Map<string, ProductSpecification>;
    private _llmService: LLMService;
    protected _config: ProductManagerAgentConfig;

    constructor() {
        this.id = `pm-${Date.now()}`;
        this.name = '产品经理';
        this.role = AgentRole.PRODUCT_MANAGER;
        this.capabilities = [
            AgentCapability.REQUIREMENTS_ANALYSIS,
            AgentCapability.DOCUMENTATION
        ];
        this.state = AgentState.IDLE;
        this._requirements = new Map<string, ProductRequirement>();
        this._specifications = new Map<string, ProductSpecification>();
        this._llmService = LLMService.getInstance();
        this._config = {} as ProductManagerAgentConfig;
    }

    /**
     * 初始化代理
     * @param config 代理配置
     */
    public async initialize(config: AgentConfig): Promise<void> {
        this.id = config.id || this.id;
        this.name = config.name || this.name;
        this.role = config.role || this.role;
        this._config = config as ProductManagerAgentConfig;
        
        this.setState(AgentState.INITIALIZING);
        
        try {
            await this.onInitialize();
            this.setState(AgentState.IDLE);
        } catch (error) {
            console.error(`Error initializing agent ${this.id}:`, error);
            this.setState(AgentState.ERROR);
            throw error;
        }
    }
    
    /**
     * 初始化回调
     */
    protected async onInitialize(): Promise<void> {
        console.log(`ProductManagerAgent ${this.id} initialized with ${this._config.requirementTemplates?.length || 0} requirement templates.`);
    }

    /**
     * 处理输入
     * @param input 代理输入
     * @returns 代理输出
     */
    public async process(input: AgentInput): Promise<AgentOutput> {
        this.setState(AgentState.PROCESSING);
        
        try {
            const pmInput = input as ProductManagerAgentInput;
            
            // 处理需求草稿
            if (pmInput.requirementDraft) {
                const requirement = await this.createRequirement(pmInput.requirementDraft);
                const output = {
                    agentId: this.id,
                    timestamp: new Date(),
                    status: 'success',
                    message: `已创建需求: ${requirement.title}`,
                    response: `已创建需求: ${requirement.title}`,
                    actions: [{
                        type: 'requirement_created',
                        payload: requirement
                    }],
                    requirements: [requirement]
                } as ProductManagerAgentOutput;
                
                this.setState(AgentState.IDLE);
                return output;
            }
            
            // 处理现有需求分析
            if (pmInput.existingRequirements && pmInput.existingRequirements.length > 0) {
                const analysis = await this.analyzeRequirements(pmInput.existingRequirements);
                const prioritizedRequirements = await this.prioritizeRequirements(pmInput.existingRequirements);
                
                const output = {
                    agentId: this.id,
                    timestamp: new Date(),
                    status: 'success',
                    message: '需求分析完成',
                    response: analysis,
                    actions: [{
                        type: 'requirements_analyzed',
                        payload: {
                            analysis,
                            prioritizedRequirements
                        }
                    }],
                    requirements: prioritizedRequirements,
                    analysis
                } as ProductManagerAgentOutput;
                
                this.setState(AgentState.IDLE);
                return output;
            }
            
            // 默认处理
            const output: AgentOutput = {
                agentId: this.id,
                timestamp: new Date(),
                status: 'success',
                message: '处理完成',
                response: '已处理输入，但没有特定操作。'
            };
            
            this.setState(AgentState.IDLE);
            return output;
        } catch (error: any) {
            console.error(`Error processing input for agent ${this.id}:`, error);
            this.setState(AgentState.ERROR);
            
            return {
                agentId: this.id,
                timestamp: new Date(),
                status: 'error',
                message: `处理错误: ${error.message}`,
                error: error.message
            };
        }
    }

    /**
     * 与其他代理协作
     * @param agents 协作代理数组
     */
    public async collaborate(agents: IAgent[]): Promise<void> {
        console.log(`ProductManagerAgent ${this.id} collaborating with ${agents.length} agents.`);
        
        // 这里实现与其他代理的协作逻辑
    }

    /**
     * 获取代理状态
     * @returns 代理状态
     */
    public getState(): AgentState {
        return this.state;
    }

    /**
     * 设置代理状态
     * @param state 代理状态
     */
    public setState(state: AgentState): void {
        this.state = state;
    }

    /**
     * 调用LLM
     * @param prompt 提示字符串
     * @returns LLM响应
     */
    protected async callLLM(prompt: string): Promise<string> {
        try {
            const response = await this._llmService.sendRequest({
                model: this._config.model || 'gpt-4',
                messages: [{ role: LLMModelRole.USER, content: prompt }],
                temperature: this._config.temperature || 0.7,
                maxTokens: this._config.maxTokens || 2000
            });
            
            return response.content || '';
        } catch (error) {
            console.error('Error calling LLM:', error);
            throw error;
        }
    }

    /**
     * 创建需求
     * @param draft 需求草稿
     * @returns 创建的需求
     */
    public async createRequirement(draft: string): Promise<ProductRequirement> {
        const prompt = this._buildRequirementPrompt(draft);
        const response = await this.callLLM(prompt);
        
        try {
            // 尝试解析JSON响应
            const requirementData = JSON.parse(response);
            
            const requirement: ProductRequirement = {
                id: uuidv4(),
                title: requirementData.title || '未命名需求',
                description: requirementData.description || draft,
                priority: requirementData.priority || 'medium',
                status: 'draft',
                acceptanceCriteria: requirementData.acceptanceCriteria || [],
                createdAt: new Date(),
                updatedAt: new Date(),
                metadata: {
                    originalDraft: draft,
                    source: 'ai_generated'
                }
            };
            
            // 存储需求
            this._requirements.set(requirement.id, requirement);
            
            return requirement;
        } catch (error) {
            console.error('Error parsing requirement from LLM response:', error);
            
            // 创建一个基本需求
            const requirement: ProductRequirement = {
                id: uuidv4(),
                title: draft.split('\n')[0].substring(0, 50) || '未命名需求',
                description: draft,
                priority: 'medium',
                status: 'draft',
                acceptanceCriteria: [],
                createdAt: new Date(),
                updatedAt: new Date(),
                metadata: {
                    originalDraft: draft,
                    source: 'fallback'
                }
            };
            
            // 存储需求
            this._requirements.set(requirement.id, requirement);
            
            return requirement;
        }
    }

    /**
     * 更新需求
     * @param id 需求ID
     * @param updates 更新内容
     * @returns 更新后的需求
     */
    public async updateRequirement(id: string, updates: Partial<ProductRequirement>): Promise<ProductRequirement> {
        const requirement = this._requirements.get(id);
        
        if (!requirement) {
            throw new Error(`Requirement with id ${id} not found.`);
        }
        
        const updatedRequirement: ProductRequirement = {
            ...requirement,
            ...updates,
            updatedAt: new Date()
        };
        
        // 存储更新后的需求
        this._requirements.set(id, updatedRequirement);
        
        return updatedRequirement;
    }

    /**
     * 删除需求
     * @param id 需求ID
     * @returns 是否成功删除
     */
    public async deleteRequirement(id: string): Promise<boolean> {
        if (!this._requirements.has(id)) {
            return false;
        }
        
        return this._requirements.delete(id);
    }

    /**
     * 获取所有需求
     * @returns 所有需求的数组
     */
    public async getAllRequirements(): Promise<ProductRequirement[]> {
        return Array.from(this._requirements.values());
    }

    /**
     * 创建规格
     * @param title 规格标题
     * @param description 规格描述
     * @returns 创建的规格
     */
    public async createSpecification(title: string, description: string): Promise<ProductSpecification> {
        const specification: ProductSpecification = {
            id: uuidv4(),
            title,
            description,
            requirements: [],
            features: [],
            userStories: [],
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        // 存储规格
        this._specifications.set(specification.id, specification);
        
        return specification;
    }

    /**
     * 更新规格
     * @param id 规格ID
     * @param updates 更新内容
     * @returns 更新后的规格
     */
    public async updateSpecification(id: string, updates: Partial<ProductSpecification>): Promise<ProductSpecification> {
        const specification = this._specifications.get(id);
        
        if (!specification) {
            throw new Error(`Specification with id ${id} not found.`);
        }
        
        const updatedSpecification: ProductSpecification = {
            ...specification,
            ...updates,
            updatedAt: new Date()
        };
        
        // 存储更新后的规格
        this._specifications.set(id, updatedSpecification);
        
        return updatedSpecification;
    }

    /**
     * 从需求生成规格
     * @param requirementIds 需求ID数组
     * @returns 生成的规格
     */
    public async generateSpecificationFromRequirements(requirementIds: string[]): Promise<ProductSpecification> {
        // 获取需求
        const requirements: ProductRequirement[] = [];
        
        for (const id of requirementIds) {
            const requirement = this._requirements.get(id);
            if (requirement) {
                requirements.push(requirement);
            }
        }
        
        if (requirements.length === 0) {
            throw new Error('No valid requirements found.');
        }
        
        // 构建提示
        const prompt = this._buildSpecificationPrompt(requirements);
        const response = await this.callLLM(prompt);
        
        try {
            // 尝试解析JSON响应
            const specData = JSON.parse(response);
            
            const specification: ProductSpecification = {
                id: uuidv4(),
                title: specData.title || '产品规格',
                description: specData.description || '',
                requirements,
                features: specData.features || [],
                userStories: specData.userStories || [],
                createdAt: new Date(),
                updatedAt: new Date(),
                metadata: {
                    source: 'ai_generated'
                }
            };
            
            // 存储规格
            this._specifications.set(specification.id, specification);
            
            return specification;
        } catch (error) {
            console.error('Error parsing specification from LLM response:', error);
            
            // 创建一个基本规格
            const specification: ProductSpecification = {
                id: uuidv4(),
                title: `产品规格 - ${new Date().toLocaleDateString()}`,
                description: '基于选定需求生成的产品规格',
                requirements,
                features: [],
                userStories: [],
                createdAt: new Date(),
                updatedAt: new Date(),
                metadata: {
                    source: 'fallback'
                }
            };
            
            // 存储规格
            this._specifications.set(specification.id, specification);
            
            return specification;
        }
    }

    /**
     * 分析需求
     * @param requirements 需求数组
     * @returns 分析结果
     */
    public async analyzeRequirements(requirements: ProductRequirement[]): Promise<string> {
        const prompt = this._buildAnalysisPrompt(requirements);
        return await this.callLLM(prompt);
    }

    /**
     * 优先级排序需求
     * @param requirements 需求数组
     * @returns 排序后的需求数组
     */
    public async prioritizeRequirements(requirements: ProductRequirement[]): Promise<ProductRequirement[]> {
        if (requirements.length <= 1) {
            return [...requirements];
        }
        
        const prompt = this._buildPrioritizationPrompt(requirements);
        const response = await this.callLLM(prompt);
        
        try {
            // 尝试解析JSON响应
            const prioritizedIds = JSON.parse(response);
            
            if (Array.isArray(prioritizedIds)) {
                // 创建ID到需求的映射
                const requirementMap = new Map<string, ProductRequirement>();
                requirements.forEach(req => requirementMap.set(req.id, req));
                
                // 按照返回的顺序排序需求
                const result: ProductRequirement[] = [];
                for (const id of prioritizedIds) {
                    const req = requirementMap.get(id);
                    if (req) {
                        result.push(req);
                    }
                }
                
                // 添加任何遗漏的需求
                requirements.forEach(req => {
                    if (!result.includes(req)) {
                        result.push(req);
                    }
                });
                
                return result;
            }
        } catch (error) {
            console.error('Error parsing prioritized requirements from LLM response:', error);
        }
        
        // 回退到基本排序（按优先级和创建时间）
        return [...requirements].sort((a, b) => {
            const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
            const aPriority = priorityOrder[a.priority] || 2;
            const bPriority = priorityOrder[b.priority] || 2;
            
            if (aPriority !== bPriority) {
                return aPriority - bPriority;
            }
            
            return a.createdAt.getTime() - b.createdAt.getTime();
        });
    }

    /**
     * 验证需求
     * @param requirement 需求
     * @returns 验证结果
     */
    public async validateRequirement(requirement: ProductRequirement): Promise<{isValid: boolean, issues: string[]}> {
        const prompt = this._buildValidationPrompt(requirement);
        const response = await this.callLLM(prompt);
        
        try {
            // 尝试解析JSON响应
            const validationResult = JSON.parse(response);
            
            return {
                isValid: validationResult.isValid || false,
                issues: validationResult.issues || []
            };
        } catch (error) {
            console.error('Error parsing validation result from LLM response:', error);
            
            // 基本验证
            const issues: string[] = [];
            
            if (!requirement.title || requirement.title.trim().length === 0) {
                issues.push('需求标题不能为空');
            }
            
            if (!requirement.description || requirement.description.trim().length === 0) {
                issues.push('需求描述不能为空');
            }
            
            if (!requirement.acceptanceCriteria || requirement.acceptanceCriteria.length === 0) {
                issues.push('需求应该包含验收标准');
            }
            
            return {
                isValid: issues.length === 0,
                issues
            };
        }
    }

    /**
     * 构建需求提示
     * @param draft 需求草稿
     * @returns 提示字符串
     */
    private _buildRequirementPrompt(draft: string): string {
        let prompt = '';
        
        // 使用模板（如果有）
        if (this._config.requirementTemplates && this._config.requirementTemplates.length > 0) {
            prompt += this._config.requirementTemplates[0] + '\n\n';
        } else {
            prompt += `你是一名经验丰富的产品经理，负责分析和完善产品需求。
请根据以下需求草稿，创建一个结构化的需求文档。
返回一个JSON对象，包含以下字段：
- title: 需求标题（简洁明了）
- description: 详细描述
- priority: 优先级（low, medium, high, critical）
- acceptanceCriteria: 验收标准（数组）

只返回JSON对象，不要包含其他解释。\n\n`;
        }
        
        prompt += `需求草稿:\n${draft}\n`;
        
        return prompt;
    }

    /**
     * 构建规格提示
     * @param requirements 需求数组
     * @returns 提示字符串
     */
    private _buildSpecificationPrompt(requirements: ProductRequirement[]): string {
        let prompt = '';
        
        // 使用模板（如果有）
        if (this._config.specificationTemplates && this._config.specificationTemplates.length > 0) {
            prompt += this._config.specificationTemplates[0] + '\n\n';
        } else {
            prompt += `你是一名经验丰富的产品经理，负责创建产品规格文档。
请根据以下需求列表，创建一个完整的产品规格文档。
返回一个JSON对象，包含以下字段：
- title: 规格标题
- description: 产品概述
- features: 功能列表（数组）
- userStories: 用户故事（数组）

只返回JSON对象，不要包含其他解释。\n\n`;
        }
        
        prompt += `需求列表:\n`;
        requirements.forEach((req, index) => {
            prompt += `${index + 1}. ${req.title}\n`;
            prompt += `   描述: ${req.description}\n`;
            prompt += `   优先级: ${req.priority}\n`;
            prompt += `   验收标准: ${req.acceptanceCriteria.join(', ')}\n\n`;
        });
        
        return prompt;
    }

    /**
     * 构建分析提示
     * @param requirements 需求数组
     * @returns 提示字符串
     */
    private _buildAnalysisPrompt(requirements: ProductRequirement[]): string {
        let prompt = '';
        
        // 使用模板（如果有）
        if (this._config.analysisPrompts && this._config.analysisPrompts.length > 0) {
            prompt += this._config.analysisPrompts[0] + '\n\n';
        } else {
            prompt += `你是一名经验丰富的产品经理，负责分析产品需求。
请对以下需求列表进行全面分析，包括：
1. 需求的完整性和一致性
2. 潜在的风险和挑战
3. 实现的复杂性
4. 对用户的价值
5. 建议和改进方向

请提供详细的分析报告。\n\n`;
        }
        
        prompt += `需求列表:\n`;
        requirements.forEach((req, index) => {
            prompt += `${index + 1}. ${req.title}\n`;
            prompt += `   描述: ${req.description}\n`;
            prompt += `   优先级: ${req.priority}\n`;
            prompt += `   状态: ${req.status}\n`;
            prompt += `   验收标准: ${req.acceptanceCriteria.join(', ')}\n\n`;
        });
        
        return prompt;
    }

    /**
     * 构建优先级排序提示
     * @param requirements 需求数组
     * @returns 提示字符串
     */
    private _buildPrioritizationPrompt(requirements: ProductRequirement[]): string {
        let prompt = '';
        
        // 使用策略（如果有）
        if (this._config.prioritizationStrategy) {
            prompt += `${this._config.prioritizationStrategy}\n\n`;
        } else {
            prompt += `你是一名经验丰富的产品经理，负责对产品需求进行优先级排序。
请根据以下标准对需求进行排序：
1. 业务价值
2. 用户影响
3. 实现复杂性
4. 依赖关系

返回一个JSON数组，包含按优先级排序的需求ID。
只返回ID数组，不要包含其他解释。\n\n`;
        }
        
        prompt += `需求列表:\n`;
        requirements.forEach((req, index) => {
            prompt += `${index + 1}. ID: ${req.id}\n`;
            prompt += `   标题: ${req.title}\n`;
            prompt += `   描述: ${req.description}\n`;
            prompt += `   当前优先级: ${req.priority}\n\n`;
        });
        
        return prompt;
    }

    /**
     * 构建验证提示
     * @param requirement 需求
     * @returns 提示字符串
     */
    private _buildValidationPrompt(requirement: ProductRequirement): string {
        const prompt = `你是一名经验丰富的产品经理，负责验证产品需求的质量。
请验证以下需求是否符合INVEST原则（独立、可协商、有价值、可估计、小型、可测试）。
返回一个JSON对象，包含以下字段：
- isValid: 布尔值，表示需求是否有效
- issues: 字符串数组，列出需求的问题

只返回JSON对象，不要包含其他解释。

需求:
标题: ${requirement.title}
描述: ${requirement.description}
优先级: ${requirement.priority}
验收标准: ${requirement.acceptanceCriteria.join(', ')}
`;
        
        return prompt;
    }
}
