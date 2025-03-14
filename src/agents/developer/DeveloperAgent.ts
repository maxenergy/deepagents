import { v4 as uuidv4 } from 'uuid';
import { AgentRole, AgentState, AgentCapability, AgentConfig, AgentInput, AgentOutput, IAgent } from '../IAgent';
import { BaseAgent } from '../BaseAgent';
import { CollaborationType } from '../collaboration';
import { LLMService } from '../../llm/LLMService';
import { LLMProviderType, LLMModelRole, LLMRequestOptions } from '../../llm/ILLMProvider';
import { StorageManager, StorageNamespace, IStorage } from '../../storage/StorageManager';
import { ToolManager } from '../../tools/ToolManager';
import { Requirement, UserStory } from '../product/ProductRequirementsAgent';
import { ArchitectureDesign, TechChoice } from '../architect/ArchitectAgent';
import { 
  IDeveloperAgent, 
  DeveloperAgentInput, 
  DeveloperAgentOutput,
  CodeFile,
  CodeModule,
  TestCase,
  CodeIssue,
  CodeFileType,
  ImplementationStatus
} from './IDeveloperAgent';
import * as vscode from 'vscode';

/**
 * 开发者代理配置接口
 */
export interface DeveloperAgentConfig extends AgentConfig {
  systemPrompt?: string;
  provider?: LLMProviderType;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  preferredLanguages?: string[];
  codingStandards?: string[];
  testingStrategy?: string;
  documentationStyle?: string;
}

/**
 * 开发者代理类
 * 
 * 负责代码生成和实现
 */
export class DeveloperAgent extends BaseAgent implements IDeveloperAgent {
  private codeFiles: Map<string, CodeFile> = new Map();
  private codeModules: Map<string, CodeModule> = new Map();
  private testCases: Map<string, TestCase> = new Map();
  private codeIssues: Map<string, CodeIssue> = new Map();
  private llmService: LLMService;
  private storageManager: StorageManager;
  private developerStorage: IStorage;
  private systemPrompt: string;
  private provider?: LLMProviderType;
  private model?: string;
  private preferredLanguages: string[];
  private codingStandards: string[];
  private testingStrategy: string;
  private documentationStyle: string;
  
  /**
   * 构造函数
   * 
   * @param context VSCode 扩展上下文
   * @param config 配置
   */
  constructor(context: vscode.ExtensionContext, config: DeveloperAgentConfig = {} as DeveloperAgentConfig) {
    super();
    
    this.llmService = LLMService.getInstance();
    this.storageManager = new StorageManager(context);
    
    // 初始化基本属性
    this.id = config?.id || `dev-${uuidv4()}`;
    this.name = config?.name || '开发者代理';
    this.role = AgentRole.DEVELOPER;
    this.capabilities = [
      AgentCapability.CODE_GENERATION,
      AgentCapability.DOCUMENTATION,
      AgentCapability.TESTING
    ];
    this.state = AgentState.IDLE;
    
    // 设置系统提示
    this.systemPrompt = config?.systemPrompt || `你是一个专业的软件开发者，负责生成高质量的代码。
你的主要职责包括：
1. 根据需求和架构设计生成代码
2. 实现功能
3. 修复代码问题
4. 重构和优化代码
5. 创建测试
6. 分析代码质量

请始终保持专业、高效，并确保你的代码符合最佳实践和编码标准。`;
    
    // 设置提供商和模型
    this.provider = config?.provider;
    this.model = config?.model;
    
    // 设置编码偏好
    this.preferredLanguages = config?.preferredLanguages || ['TypeScript', 'JavaScript', 'Python'];
    this.codingStandards = config?.codingStandards || ['Clean Code', 'SOLID Principles', 'DRY'];
    this.testingStrategy = config?.testingStrategy || 'TDD';
    this.documentationStyle = config?.documentationStyle || 'JSDoc';
    
    // 获取存储
    this.developerStorage = this.storageManager.getStorage(StorageNamespace.AGENTS) as IStorage;
  }
  
  /**
   * 初始化代理
   * @param config 代理配置
   */
  public async initialize(config: AgentConfig): Promise<void> {
    this.id = config.id || this.id;
    this.name = config.name || this.name;
    this.role = config.role || this.role;
    
    const devConfig = config as DeveloperAgentConfig;
    if (devConfig.systemPrompt) {
      this.systemPrompt = devConfig.systemPrompt;
    }
    if (devConfig.provider) {
      this.provider = devConfig.provider;
    }
    if (devConfig.model) {
      this.model = devConfig.model;
    }
    
    this.setState(AgentState.INITIALIZING);
    
    try {
      await this.onInitialize();
      this.setState(AgentState.IDLE);
    } catch (error) {
      console.error(`初始化开发者代理失败: ${error}`);
      this.setState(AgentState.ERROR);
      throw error;
    }
  }
  
  /**
   * 初始化时的回调
   */
  protected async onInitialize(): Promise<void> {
    // 加载存储的代码数据
    await this.loadData();
  }
  
  /**
   * 处理输入
   * 
   * @param input 输入
   * @returns 输出
   */
  public async process(input: AgentInput): Promise<AgentOutput> {
    // 设置状态为处理中
    this.setState(AgentState.PROCESSING);
    
    try {
      const devInput = input as DeveloperAgentInput;
      let result: DeveloperAgentOutput = {
        agentId: this.id,
        timestamp: new Date(),
        status: 'in_progress',
        message: '处理中...'
      };
      
      // 根据输入类型处理不同的请求
      if (devInput.type === 'generate_code' && devInput.requirements && devInput.architectureDesign) {
        const files = await this.generateCode(
          devInput.requirements,
          devInput.architectureDesign,
          devInput.techChoices || [],
          devInput.componentId
        );
        
        result = {
          ...result,
          status: 'success',
          message: `成功生成 ${files.length} 个代码文件`,
          files
        };
      } else if (devInput.type === 'implement_feature' && devInput.requirements && devInput.architectureDesign) {
        const module = await this.implementFeature(
          devInput.requirements,
          devInput.userStories || [],
          devInput.architectureDesign,
          devInput.description || '实现功能'
        );
        
        result = {
          ...result,
          status: 'success',
          message: `成功实现功能模块: ${module.name}`,
          modules: [module]
        };
      } else if (devInput.type === 'fix_issue' && devInput.issueId && devInput.fileId && devInput.code) {
        const file = await this.fixIssue(
          devInput.issueId,
          devInput.fileId,
          devInput.code
        );
        
        result = {
          ...result,
          status: 'success',
          message: `成功修复问题: ${file.name}`,
          files: [file]
        };
      } else if (devInput.type === 'refactor_code' && devInput.fileId && devInput.code) {
        const file = await this.refactorCode(
          devInput.fileId,
          devInput.code,
          devInput.description || '重构代码'
        );
        
        result = {
          ...result,
          status: 'success',
          message: `成功重构代码: ${file.name}`,
          files: [file]
        };
      } else if (devInput.type === 'create_tests' && devInput.fileId && devInput.code) {
        const tests = await this.createTests(
          devInput.fileId,
          devInput.code,
          devInput.requirements || []
        );
        
        result = {
          ...result,
          status: 'success',
          message: `成功创建 ${tests.length} 个测试用例`,
          tests
        };
      } else if (devInput.code) {
        const analysis = await this.analyzeCode(devInput.code);
        
        result = {
          ...result,
          status: 'success',
          message: '代码分析完成',
          analysis
        };
      } else {
        result = {
          ...result,
          status: 'error',
          message: `不支持的输入类型或缺少必要参数: ${devInput.type}`
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
   * 与其他代理协作
   * 
   * @param agents 代理列表
   * @param collaborationType 协作类型
   * @param sessionId 会话ID
   * @returns 协作结果
   */
  public async collaborate(
    agents: IAgent[],
    collaborationType?: CollaborationType,
    sessionId?: string
  ): Promise<AgentOutput> {
    console.log(`开发者代理正在与 ${agents.length} 个代理协作`);
    
    // 实现与其他代理的协作逻辑
    // 例如，与架构师代理协作获取架构信息，与产品经理代理协作获取需求信息
    
    return {
      agentId: this.id,
      timestamp: new Date(),
      status: 'success',
      message: `与 ${agents.length} 个代理协作完成`
    };
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
   * 加载存储的数据
   */
  private async loadData(): Promise<void> {
    try {
      // 加载代码文件
      const storedFiles = await this.developerStorage.get('codeFiles');
      if (storedFiles) {
        this.codeFiles = new Map(Object.entries(storedFiles));
      }
      
      // 加载代码模块
      const storedModules = await this.developerStorage.get('codeModules');
      if (storedModules) {
        this.codeModules = new Map(Object.entries(storedModules));
      }
      
      // 加载测试用例
      const storedTests = await this.developerStorage.get('testCases');
      if (storedTests) {
        this.testCases = new Map(Object.entries(storedTests));
      }
      
      // 加载代码问题
      const storedIssues = await this.developerStorage.get('codeIssues');
      if (storedIssues) {
        this.codeIssues = new Map(Object.entries(storedIssues));
      }
    } catch (error) {
      console.error('加载开发者数据失败:', error);
    }
  }
  
  /**
   * 保存数据到存储
   */
  private async saveData(): Promise<void> {
    try {
      // 将 Map 转换为对象以便存储
      await this.developerStorage.set('codeFiles', Object.fromEntries(this.codeFiles));
      await this.developerStorage.set('codeModules', Object.fromEntries(this.codeModules));
      await this.developerStorage.set('testCases', Object.fromEntries(this.testCases));
      await this.developerStorage.set('codeIssues', Object.fromEntries(this.codeIssues));
    } catch (error) {
      console.error('保存开发者数据失败:', error);
    }
  }
  
  /**
   * 生成代码
   * 
   * @param requirements 需求列表
   * @param architectureDesign 架构设计
   * @param techChoices 技术选择
   * @param componentId 组件ID（可选）
   * @returns 生成的代码文件
   */
  public async generateCode(
    requirements: Requirement[],
    architectureDesign: ArchitectureDesign,
    techChoices: TechChoice[],
    componentId?: string
  ): Promise<CodeFile[]> {
    // 根据组件ID过滤组件
    const targetComponents = componentId 
      ? architectureDesign.components.filter(comp => comp.id === componentId)
      : architectureDesign.components;
    
    if (targetComponents.length === 0) {
      throw new Error('没有找到目标组件');
    }
    
    const generatedFiles: CodeFile[] = [];
    
    // 为每个组件生成代码
    for (const component of targetComponents) {
      // 获取组件的技术选择
      const componentTechChoices = component.techChoices.length > 0 
        ? component.techChoices 
        : techChoices;
      
      // 构建提示
      const prompt = `请根据以下需求和架构设计，为组件 "${component.name}" 生成代码。

项目架构类型: ${architectureDesign.type}

组件描述:
${component.description}

组件职责:
${component.responsibilities.join('\n')}

组件依赖:
${component.dependencies.join('\n')}

技术选择:
${componentTechChoices.map(tech => `- ${tech.name}: ${tech.description}`).join('\n')}

相关需求:
${requirements.map((req, index) => `${index + 1}. ${req.title}: ${req.description}`).join('\n')}

请生成该组件所需的所有代码文件。对于每个文件，请提供:
1. 文件路径
2. 文件名
3. 文件类型 (source, test, config, documentation, resource)
4. 编程语言
5. 文件内容
6. 文件描述

请以JSON格式返回结果，格式如下:
{
  "files": [
    {
      "path": "文件路径",
      "name": "文件名",
      "type": "文件类型",
      "language": "编程语言",
      "content": "文件内容",
      "description": "文件描述"
    }
  ]
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
        // 解析响应
        const result = JSON.parse(response.content);
        
        if (!result.files || !Array.isArray(result.files)) {
          throw new Error('无效的响应格式：缺少文件数组');
        }
        
        // 创建代码文件
        for (const fileData of result.files) {
          const file: CodeFile = {
            id: uuidv4(),
            path: fileData.path,
            name: fileData.name,
            type: this.mapFileType(fileData.type),
            content: fileData.content,
            language: fileData.language,
            description: fileData.description,
            status: ImplementationStatus.COMPLETED,
            dependencies: [],
            createdAt: new Date(),
            updatedAt: new Date(),
            componentId: component.id,
            requirementIds: requirements.map(req => req.id),
            metadata: {
              generatedBy: 'llm',
              componentName: component.name
            }
          };
          
          // 存储文件
          this.codeFiles.set(file.id, file);
          generatedFiles.push(file);
        }
      } catch (error) {
        console.error('解析生成的代码失败:', error);
        throw new Error('解析生成的代码失败');
      }
    }
    
    // 保存数据
    await this.saveData();
    
    return generatedFiles;
  }
  
  /**
   * 实现功能
   * 
   * @param requirements 需求列表
   * @param userStories 用户故事列表
   * @param architectureDesign 架构设计
   * @param description 功能描述
   * @returns 实现的代码模块
   */
  public async implementFeature(
    requirements: Requirement[],
    userStories: UserStory[],
    architectureDesign: ArchitectureDesign,
    description: string
  ): Promise<CodeModule> {
    // 构建提示
    const prompt = `请根据以下需求、用户故事和架构设计，实现功能: "${description}"。

项目架构类型: ${architectureDesign.type}

架构描述:
${architectureDesign.description}

相关需求:
${requirements.map((req, index) => `${index + 1}. ${req.title}: ${req.description}`).join('\n')}

${userStories.length > 0 ? `用户故事:
${userStories.map((story, index) => `${index + 1}. ${story.title}: ${story.description}`).join('\n')}` : ''}

请实现该功能所需的所有代码文件，并将它们组织成一个模块。对于模块，请提供:
1. 模块名称
2. 模块描述
3. 模块依赖
4. 模块状态

对于每个文件，请提供:
1. 文件路径
2. 文件名
3. 文件类型 (source, test, config, documentation, resource)
4. 编程语言
5. 文件内容
6. 文件描述

请以JSON格式返回结果，格式如下:
{
  "module": {
    "name": "模块名称",
    "description": "模块描述",
    "dependencies": ["依赖1", "依赖2"],
    "status": "completed"
  },
  "files": [
    {
      "path": "文件路径",
      "name": "文件名",
      "type": "文件类型",
      "language": "编程语言",
      "content": "文件内容",
      "description": "文件描述"
    }
  ]
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
      // 解析响应
      const result = JSON.parse(response.content);
      
      if (!result.module || !result.files || !Array.isArray(result.files)) {
        throw new Error('无效的响应格式：缺少模块或文件数组');
      }
      
      // 创建代码文件
      const files: CodeFile[] = [];
      for (const fileData of result.files) {
        const file: CodeFile = {
          id: uuidv4(),
          path: fileData.path,
          name: fileData.name,
          type: this.mapFileType(fileData.type),
          content: fileData.content,
          language: fileData.language,
          description: fileData.description,
          status: ImplementationStatus.COMPLETED,
          dependencies: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          requirementIds: requirements.map(req => req.id),
          metadata: {
            generatedBy: 'llm',
            featureDescription: description
          }
        };
        
        // 存储文件
        this.codeFiles.set(file.id, file);
        files.push(file);
      }
      
      // 创建代码模块
      const module: CodeModule = {
        id: uuidv4(),
        name: result.module.name,
        description: result.module.description,
        files,
        dependencies: result.module.dependencies || [],
        status: this.mapImplementationStatus(result.module.status),
        requirementIds: requirements.map(req => req.id),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // 存储模块
      this.codeModules.set(module.id, module);
      
      // 保存数据
      await this.saveData();
      
      return module;
    } catch (error) {
      console.error('解析实现的功能失败:', error);
      throw new Error('解析实现的功能失败');
    }
  }
  
  /**
   * 修复问题
   * 
   * @param issueId 问题ID
   * @param fileId 文件ID
   * @param code 代码
   * @returns 修复后的代码文件
   */
  public async fixIssue(
    issueId: string,
    fileId: string,
    code: string
  ): Promise<CodeFile> {
    // 获取问题和文件
    const issue = this.codeIssues.get(issueId);
    const file = this.codeFiles.get(fileId);
    
    if (!issue) {
      throw new Error(`问题不存在: ${issueId}`);
    }
    
    if (!file) {
      throw new Error(`文件不存在: ${fileId}`);
    }
    
    // 构建提示
    const prompt = `请修复以下代码中的问题:

问题描述: ${issue.description}
问题类型: ${issue.type}
${issue.line ? `问题位置: 第 ${issue.line} 行` : ''}
${issue.suggestion ? `修复建议: ${issue.suggestion}` : ''}

代码:
\`\`\`${file.language}
${code}
\`\`\`

请提供修复后的完整代码，不要包含任何解释。`;
    
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
      // 提取代码
      const codeMatch = response.content.match(/```[\w]*\n([\s\S]*?)\n```/) || 
                        response.content.match(/```([\s\S]*?)```/);
      
      if (!codeMatch) {
        throw new Error('无法从响应中提取代码');
      }
      
      const fixedCode = codeMatch[1] || codeMatch[0];
      
      // 更新文件
      const updatedFile: CodeFile = {
        ...file,
        content: fixedCode,
        status: ImplementationStatus.COMPLETED,
        updatedAt: new Date(),
        metadata: {
          ...file.metadata,
          fixedIssue: issueId
        }
      };
      
      // 存储更新后的文件
      this.codeFiles.set(updatedFile.id, updatedFile);
      
      // 更新问题状态
      const resolvedIssue: CodeIssue = {
        ...issue,
        resolvedAt: new Date()
      };
      
      // 存储更新后的问题
      this.codeIssues.set(resolvedIssue.id, resolvedIssue);
      
      // 保存数据
      await this.saveData();
      
      return updatedFile;
    } catch (error) {
      console.error('解析修复的代码失败:', error);
      throw new Error('解析修复的代码失败');
    }
  }
  
  /**
   * 重构代码
   * 
   * @param fileId 文件ID
   * @param code 代码
   * @param description 重构描述
   * @returns 重构后的代码文件
   */
  public async refactorCode(
    fileId: string,
    code: string,
    description: string
  ): Promise<CodeFile> {
    // 获取文件
    const file = this.codeFiles.get(fileId);
    
    if (!file) {
      throw new Error(`文件不存在: ${fileId}`);
    }
    
    // 构建提示
    const prompt = `请根据以下描述重构代码:

重构描述: ${description}

代码:
\`\`\`${file.language}
${code}
\`\`\`

请遵循以下编码标准:
${this.codingStandards.join(', ')}

请提供重构后的完整代码，不要包含任何解释。`;
    
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
      // 提取代码
      const codeMatch = response.content.match(/```[\w]*\n([\s\S]*?)\n```/) || 
                        response.content.match(/```([\s\S]*?)```/);
      
      if (!codeMatch) {
        throw new Error('无法从响应中提取代码');
      }
      
      const refactoredCode = codeMatch[1] || codeMatch[0];
      
      // 更新文件
      const updatedFile: CodeFile = {
        ...file,
        content: refactoredCode,
        status: ImplementationStatus.COMPLETED,
        updatedAt: new Date(),
        metadata: {
          ...file.metadata,
          refactoringDescription: description
        }
      };
      
      // 存储更新后的文件
      this.codeFiles.set(updatedFile.id, updatedFile);
      
      // 保存数据
      await this.saveData();
      
      return updatedFile;
    } catch (error) {
      console.error('解析重构的代码失败:', error);
      throw new Error('解析重构的代码失败');
    }
  }
  
  /**
   * 创建测试
   * 
   * @param fileId 文件ID
   * @param code 代码
   * @param requirements 需求列表
   * @returns 创建的测试用例
   */
  public async createTests(
    fileId: string,
    code: string,
    requirements: Requirement[]
  ): Promise<TestCase[]> {
    // 获取文件
    const file = this.codeFiles.get(fileId);
    
    if (!file) {
      throw new Error(`文件不存在: ${fileId}`);
    }
    
    // 构建提示
    const prompt = `请为以下代码创建测试用例:

代码:
\`\`\`${file.language}
${code}
\`\`\`

${requirements.length > 0 ? `相关需求:
${requirements.map((req, index) => `${index + 1}. ${req.title}: ${req.description}`).join('\n')}` : ''}

测试策略: ${this.testingStrategy}

请创建全面的测试用例，包括单元测试、集成测试和端到端测试（如适用）。对于每个测试用例，请提供:
1. 测试名称
2. 测试描述
3. 测试类型 (unit, integration, e2e, performance)
4. 测试代码

请以JSON格式返回结果，格式如下:
{
  "tests": [
    {
      "name": "测试名称",
      "description": "测试描述",
      "type": "测试类型",
      "code": "测试代码"
    }
  ]
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
      // 解析响应
      const result = JSON.parse(response.content);
      
      if (!result.tests || !Array.isArray(result.tests)) {
        throw new Error('无效的响应格式：缺少测试数组');
      }
      
      // 创建测试用例
      const testCases: TestCase[] = [];
      for (const testData of result.tests) {
        const testCase: TestCase = {
          id: uuidv4(),
          name: testData.name,
          description: testData.description,
          type: testData.type as 'unit' | 'integration' | 'e2e' | 'performance',
          status: 'pending',
          fileId: file.id,
          code: testData.code,
          requirementIds: requirements.map(req => req.id),
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        // 存储测试用例
        this.testCases.set(testCase.id, testCase);
        testCases.push(testCase);
      }
      
      // 保存数据
      await this.saveData();
      
      return testCases;
    } catch (error) {
      console.error('解析测试用例失败:', error);
      throw new Error('解析测试用例失败');
    }
  }
  
  /**
   * 分析代码
   * 
   * @param code 代码
   * @returns 分析结果
   */
  public async analyzeCode(code: string): Promise<string> {
    // 构建提示
    const prompt = `请分析以下代码，包括代码质量、潜在问题、改进建议等:

\`\`\`
${code}
\`\`\`

请从以下几个方面进行分析:
1. 代码质量和可读性
2. 潜在的错误和漏洞
3. 性能考虑
4. 可维护性和可扩展性
5. 编码标准和最佳实践
6. 改进建议

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
   * 更新代码文件
   * 
   * @param file 要更新的代码文件
   * @returns 更新后的代码文件
   */
  public updateCodeFile(file: CodeFile): CodeFile {
    if (!file.id) {
      throw new Error('文件ID不能为空');
    }
    
    const existingFile = this.codeFiles.get(file.id);
    
    if (!existingFile) {
      throw new Error(`文件不存在: ${file.id}`);
    }
    
    const updatedFile: CodeFile = {
      ...file,
      updatedAt: new Date()
    };
    
    this.codeFiles.set(file.id, updatedFile);
    this.saveData().catch(error => {
      console.error('保存更新的代码文件失败:', error);
    });
    
    return updatedFile;
  }
  
  /**
   * 获取代码文件
   * 
   * @param id 文件ID
   * @returns 代码文件
   */
  public getCodeFile(id: string): CodeFile | undefined {
    return this.codeFiles.get(id);
  }
  
  /**
   * 获取所有代码文件
   * 
   * @returns 代码文件列表
   */
  public getAllCodeFiles(): CodeFile[] {
    return Array.from(this.codeFiles.values());
  }
  
  /**
   * 获取代码模块
   * 
   * @param id 模块ID
   * @returns 代码模块
   */
  public getCodeModule(id: string): CodeModule | undefined {
    return this.codeModules.get(id);
  }
  
  /**
   * 获取所有代码模块
   * 
   * @returns 代码模块列表
   */
  public getAllCodeModules(): CodeModule[] {
    return Array.from(this.codeModules.values());
  }
  
  /**
   * 获取测试用例
   * 
   * @param id 测试ID
   * @returns 测试用例
   */
  public getTestCase(id: string): TestCase | undefined {
    return this.testCases.get(id);
  }
  
  /**
   * 获取所有测试用例
   * 
   * @returns 测试用例列表
   */
  public getAllTestCases(): TestCase[] {
    return Array.from(this.testCases.values());
  }
  
  /**
   * 获取代码问题
   * 
   * @param id 问题ID
   * @returns 代码问题
   */
  public getCodeIssue(id: string): CodeIssue | undefined {
    return this.codeIssues.get(id);
  }
  
  /**
   * 获取所有代码问题
   * 
   * @returns 代码问题列表
   */
  public getAllCodeIssues(): CodeIssue[] {
    return Array.from(this.codeIssues.values());
  }
  
  /**
   * 添加代码问题
   * 
   * @param issue 代码问题
   * @returns 添加的代码问题
   */
  public addCodeIssue(issue: Omit<CodeIssue, 'id' | 'createdAt'>): CodeIssue {
    const newIssue: CodeIssue = {
      id: uuidv4(),
      ...issue,
      createdAt: new Date()
    };
    
    this.codeIssues.set(newIssue.id, newIssue);
    this.saveData().catch(error => {
      console.error('保存代码问题失败:', error);
    });
    
    return newIssue;
  }
  
  /**
   * 将字符串文件类型映射到枚举
   * 
   * @param type 文件类型字符串
   * @returns 文件类型枚举
   */
  private mapFileType(type: string): CodeFileType {
    const typeMap: Record<string, CodeFileType> = {
      'source': CodeFileType.SOURCE,
      'test': CodeFileType.TEST,
      'config': CodeFileType.CONFIG,
      'documentation': CodeFileType.DOCUMENTATION,
      'resource': CodeFileType.RESOURCE
    };
    
    return typeMap[type.toLowerCase()] || CodeFileType.SOURCE;
  }
  
  /**
   * 将字符串实现状态映射到枚举
   * 
   * @param status 状态字符串
   * @returns 实现状态枚举
   */
  private mapImplementationStatus(status: string): ImplementationStatus {
    const statusMap: Record<string, ImplementationStatus> = {
      'not_started': ImplementationStatus.NOT_STARTED,
      'in_progress': ImplementationStatus.IN_PROGRESS,
      'completed': ImplementationStatus.COMPLETED,
      'needs_review': ImplementationStatus.NEEDS_REVIEW,
      'needs_refactoring': ImplementationStatus.NEEDS_REFACTORING,
      'has_issues': ImplementationStatus.HAS_ISSUES
    };
    
    return statusMap[status.toLowerCase()] || ImplementationStatus.NOT_STARTED;
  }
  
  /**
   * 删除代码文件
   * 
   * @param id 文件ID
   * @returns 是否成功删除
   */
  public deleteCodeFile(id: string): boolean {
    const result = this.codeFiles.delete(id);
    if (result) {
      this.saveData().catch(error => {
        console.error('保存删除代码文件操作失败:', error);
      });
    }
    return result;
  }
  
  /**
   * 删除代码模块
   * 
   * @param id 模块ID
   * @returns 是否成功删除
   */
  public deleteCodeModule(id: string): boolean {
    const result = this.codeModules.delete(id);
    if (result) {
      this.saveData().catch(error => {
        console.error('保存删除代码模块操作失败:', error);
      });
    }
    return result;
  }
  
  /**
   * 删除测试用例
   * 
   * @param id 测试ID
   * @returns 是否成功删除
   */
  public deleteTestCase(id: string): boolean {
    const result = this.testCases.delete(id);
    if (result) {
      this.saveData().catch(error => {
        console.error('保存删除测试用例操作失败:', error);
      });
    }
    return result;
  }
  
  /**
   * 删除代码问题
   * 
   * @param id 问题ID
   * @returns 是否成功删除
   */
  public deleteCodeIssue(id: string): boolean {
    const result = this.codeIssues.delete(id);
    if (result) {
      this.saveData().catch(error => {
        console.error('保存删除代码问题操作失败:', error);
      });
    }
    return result;
  }
} 