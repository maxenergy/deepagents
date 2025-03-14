import { v4 as uuidv4 } from 'uuid';
import { AgentRole, AgentState, IAgent } from '../IAgent';
import { 
  CodeFile, 
  CodeGenerationType, 
  CodeIssue, 
  CodeModification, 
  DeveloperAgentConfig, 
  DeveloperAgentInput, 
  DeveloperAgentOutput, 
  IDeveloperAgent, 
  ProgrammingLanguage 
} from './IDeveloperAgent';
import { LLMManager } from '../../llm/LLMManager';
import { ILLMProvider, LLMResponse } from '../../llm/ILLMProvider';
import { Logger } from '../../utils/Logger';

/**
 * 开发者代理实现类
 */
export class DeveloperAgent implements IDeveloperAgent {
  id: string;
  name: string;
  role: AgentRole;
  capabilities: string[];
  state: AgentState;
  
  private config: DeveloperAgentConfig;
  private llmManager: LLMManager;
  private llmProvider: ILLMProvider | null = null;
  private codeFiles: Map<string, CodeFile> = new Map();
  private logger: Logger;

  /**
   * 构造函数
   * @param name 代理名称
   * @param llmManager LLM管理器
   */
  constructor(name: string, llmManager: LLMManager) {
    this.id = uuidv4();
    this.name = name;
    this.role = AgentRole.DEVELOPER;
    this.capabilities = [
      'code_generation',
      'code_modification',
      'code_analysis',
      'testing'
    ];
    this.state = AgentState.IDLE;
    this.llmManager = llmManager;
    this.config = {
      id: this.id,
      name: this.name,
      role: this.role,
      preferredLanguages: [ProgrammingLanguage.TYPESCRIPT, ProgrammingLanguage.JAVASCRIPT],
      codingStandards: ['Clean Code', 'SOLID Principles'],
      testingStrategy: 'TDD',
      documentationStyle: 'JSDoc',
      maxFileSizeBytes: 1024 * 1024 // 1MB
    };
    this.logger = new Logger('DeveloperAgent');
  }

  /**
   * 初始化代理
   * @param config 代理配置
   */
  async initialize(config: DeveloperAgentConfig): Promise<void> {
    this.logger.info(`Initializing developer agent: ${this.name}`);
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
      this.logger.info(`Developer agent initialized: ${this.name}`);
    } catch (error) {
      this.state = AgentState.ERROR;
      this.logger.error(`Failed to initialize developer agent: ${error}`);
      throw error;
    }
  }

  /**
   * 处理输入
   * @param input 代理输入
   * @returns 代理输出
   */
  async process(input: DeveloperAgentInput): Promise<DeveloperAgentOutput> {
    this.logger.info(`Processing input for developer agent: ${this.name}`);
    this.state = AgentState.PROCESSING;
    
    try {
      // 导入现有文件
      if (input.existingFiles) {
        for (const file of input.existingFiles) {
          this.codeFiles.set(file.id, file);
        }
      }
      
      let result: DeveloperAgentOutput = {
        agentId: this.id,
        timestamp: new Date(),
        status: 'success',
        message: 'Processing completed'
      };
      
      // 根据输入类型执行不同操作
      if (input.codeGenerationType === CodeGenerationType.IMPLEMENTATION) {
        const generatedFiles = await this.generateCode(
          input.requirements || [],
          CodeGenerationType.IMPLEMENTATION,
          input.language || ProgrammingLanguage.TYPESCRIPT
        );
        result.generatedFiles = generatedFiles;
      } else if (input.codeGenerationType === CodeGenerationType.REFACTORING && input.existingFiles) {
        const modifiedFiles = await this.refactorCode(
          input.existingFiles, 
          input.requirements || []
        );
        result.modifiedFiles = modifiedFiles;
      } else if (input.codeGenerationType === CodeGenerationType.BUG_FIX && input.codeIssues) {
        const modifiedFiles = await this.fixCodeIssues(
          input.existingFiles || [],
          input.codeIssues
        );
        result.modifiedFiles = modifiedFiles;
      } else if (input.codeGenerationType === CodeGenerationType.TEST && input.existingFiles) {
        const testFiles = await this.generateTests(
          input.existingFiles, 
          'unit'
        );
        result.generatedFiles = testFiles;
      } else if (input.codeGenerationType === CodeGenerationType.DOCUMENTATION && input.existingFiles) {
        const docFiles = await this.generateDocumentation(
          input.existingFiles, 
          'jsdoc'
        );
        result.generatedFiles = docFiles;
      } else if (input.existingFiles) {
        // 默认进行代码分析
        const issues = await this.analyzeCode(input.existingFiles);
        result.detectedIssues = issues;
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
   * 生成代码文件
   * @param requirements 需求
   * @param type 生成类型
   * @param language 编程语言
   * @returns 生成的代码文件
   */
  async generateCode(
    requirements: any[],
    type: CodeGenerationType,
    language: ProgrammingLanguage
  ): Promise<CodeFile[]> {
    this.logger.info(`Generating ${type} code in ${language}`);
    
    if (!this.llmProvider) {
      throw new Error('LLM provider not initialized');
    }
    
    try {
      const generatedFiles: CodeFile[] = [];
      
      // 构建提示
      const prompt = this.buildCodeGenerationPrompt(requirements, type, language);
      
      // 调用LLM
      const response = await this.callLLM(prompt);
      
      // 解析响应
      const parsedFiles = this.parseCodeFromLLMResponse(response, language);
      
      // 保存生成的文件
      for (const file of parsedFiles) {
        const savedFile = await this.saveCodeFile(file);
        generatedFiles.push(savedFile);
      }
      
      return generatedFiles;
    } catch (error) {
      this.logger.error(`Error generating code: ${error}`);
      throw error;
    }
  }

  /**
   * 修改代码文件
   * @param file 代码文件
   * @param requirements 需求
   * @param type 修改类型
   * @returns 修改后的代码
   */
  async modifyCode(
    file: CodeFile,
    requirements: any[],
    type: CodeGenerationType
  ): Promise<CodeModification> {
    this.logger.info(`Modifying code file: ${file.path}`);
    
    if (!this.llmProvider) {
      throw new Error('LLM provider not initialized');
    }
    
    try {
      // 构建提示
      const prompt = `You are an expert ${file.language} developer. 
Please modify the following code according to these requirements:

Requirements:
${JSON.stringify(requirements, null, 2)}

Original code:
\`\`\`${file.language}
${file.content}
\`\`\`

Please provide only the modified code without any explanations.`;
      
      // 调用LLM
      const response = await this.callLLM(prompt);
      
      // 提取代码
      const codeMatch = response.match(/```[\w]*\n([\s\S]*?)\n```/) || 
                        response.match(/```([\s\S]*?)```/);
      
      if (!codeMatch) {
        throw new Error('Could not extract code from LLM response');
      }
      
      const modifiedContent = codeMatch[1] || codeMatch[0];
      
      // 创建修改记录
      const modification: CodeModification = {
        id: uuidv4(),
        filePath: file.path,
        originalContent: file.content,
        modifiedContent: modifiedContent,
        description: `Modified based on requirements: ${requirements.join(', ')}`,
        type: type,
        createdAt: new Date(),
        metadata: {
          requirements: requirements
        }
      };
      
      // 更新文件内容
      file.content = modifiedContent;
      file.updatedAt = new Date();
      this.codeFiles.set(file.id, file);
      
      return modification;
    } catch (error) {
      this.logger.error(`Error modifying code: ${error}`);
      throw error;
    }
  }

  /**
   * 分析代码
   * @param files 代码文件
   * @returns 代码问题
   */
  async analyzeCode(
    files: CodeFile[]
  ): Promise<CodeIssue[]> {
    this.logger.info(`Analyzing ${files.length} code files`);
    
    if (!this.llmProvider) {
      throw new Error('LLM provider not initialized');
    }
    
    const issues: CodeIssue[] = [];
    
    for (const file of files) {
      try {
        // 构建提示
        const prompt = `You are an expert code reviewer for ${file.language}. 
Please analyze the following code and identify any issues, bugs, or improvements:

\`\`\`${file.language}
${file.content}
\`\`\`

Please output your response in the following format:
\`\`\`json
{
  "issues": [
    {
      "lineStart": 10,
      "lineEnd": 15,
      "description": "Issue description",
      "severity": "critical|major|minor",
      "type": "error|warning|info",
      "code": "affected code snippet",
      "suggestedFix": "suggested code fix"
    }
  ]
}
\`\`\``;
        
        // 调用LLM
        const response = await this.callLLM(prompt);
        
        // 解析响应
        const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/) || 
                          response.match(/```\n([\s\S]*?)\n```/) ||
                          response.match(/{[\s\S]*?}/);
        
        if (!jsonMatch) {
          this.logger.warn(`Could not parse JSON from LLM response for file: ${file.path}`);
          continue;
        }
        
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        const parsed = JSON.parse(jsonStr);
        
        if (!parsed.issues || !Array.isArray(parsed.issues)) {
          this.logger.warn(`Invalid response format for file: ${file.path}`);
          continue;
        }
        
        // 转换为CodeIssue对象
        const fileIssues = parsed.issues.map((issue: any) => ({
          id: uuidv4(),
          filePath: file.path,
          lineStart: issue.lineStart,
          lineEnd: issue.lineEnd,
          description: issue.description,
          severity: issue.severity as 'critical' | 'major' | 'minor',
          type: issue.type as 'error' | 'warning' | 'info',
          code: issue.code,
          suggestedFix: issue.suggestedFix,
          metadata: {
            detectedAt: new Date()
          }
        }));
        
        issues.push(...fileIssues);
      } catch (error) {
        this.logger.error(`Error analyzing file ${file.path}: ${error}`);
      }
    }
    
    return issues;
  }

  /**
   * 生成测试
   * @param files 代码文件
   * @param testType 测试类型
   * @returns 测试代码文件
   */
  async generateTests(
    files: CodeFile[],
    testType: string
  ): Promise<CodeFile[]> {
    this.logger.info(`Generating ${testType} tests for ${files.length} files`);
    
    if (!this.llmProvider) {
      throw new Error('LLM provider not initialized');
    }
    
    const testFiles: CodeFile[] = [];
    
    for (const file of files) {
      try {
        // 构建提示
        const prompt = `You are an expert test writer for ${file.language}. 
Please write ${testType} tests for the following code:

\`\`\`${file.language}
${file.content}
\`\`\`

Please output your response in the following format:
\`\`\`json
{
  "files": [
    {
      "path": "path/to/test/file.ext",
      "content": "test file content here",
      "description": "brief description of the test file"
    }
  ]
}
\`\`\``;
        
        // 调用LLM
        const response = await this.callLLM(prompt);
        
        // 解析响应
        const parsedFiles = this.parseTestFilesFromResponse(response, file.language);
        
        // 保存测试文件
        for (const testFile of parsedFiles) {
          const savedFile = await this.saveCodeFile(testFile);
          testFiles.push(savedFile);
        }
      } catch (error) {
        this.logger.error(`Error generating tests for file ${file.path}: ${error}`);
      }
    }
    
    return testFiles;
  }

  /**
   * 执行测试
   * @param files 代码文件
   * @param testFiles 测试文件
   * @returns 测试结果
   */
  async runTests(
    files: CodeFile[],
    testFiles: CodeFile[]
  ): Promise<{
    passed: boolean;
    totalTests: number;
    passedTests: number;
    failedTests: number;
    details: string;
  }> {
    this.logger.info(`Running tests for ${files.length} files with ${testFiles.length} test files`);
    
    // 这里应该实现实际的测试执行逻辑
    // 由于这是一个模拟实现，我们返回一个假的测试结果
    
    return {
      passed: true,
      totalTests: 10,
      passedTests: 8,
      failedTests: 2,
      details: "8/10 tests passed. Failed tests: Test1, Test2"
    };
  }

  /**
   * 重构代码
   * @param files 代码文件
   * @param requirements 重构需求
   * @returns 重构后的代码
   */
  async refactorCode(
    files: CodeFile[],
    requirements: any[]
  ): Promise<CodeModification[]> {
    this.logger.info(`Refactoring ${files.length} code files`);
    
    if (!this.llmProvider) {
      throw new Error('LLM provider not initialized');
    }
    
    const modifications: CodeModification[] = [];
    
    for (const file of files) {
      try {
        // 构建提示
        const prompt = `You are an expert ${file.language} developer. 
Please refactor the following code according to these requirements:

Requirements:
${JSON.stringify(requirements, null, 2)}

Original code:
\`\`\`${file.language}
${file.content}
\`\`\`

Please provide only the refactored code without any explanations.`;
        
        // 调用LLM
        const response = await this.callLLM(prompt);
        
        // 提取代码
        const codeMatch = response.match(/```[\w]*\n([\s\S]*?)\n```/) || 
                          response.match(/```([\s\S]*?)```/);
        
        if (!codeMatch) {
          throw new Error(`Could not extract code from LLM response for file: ${file.path}`);
        }
        
        const modifiedContent = codeMatch[1] || codeMatch[0];
        
        // 创建修改记录
        const modification: CodeModification = {
          id: uuidv4(),
          filePath: file.path,
          originalContent: file.content,
          modifiedContent: modifiedContent,
          description: `Refactored based on requirements: ${requirements.join(', ')}`,
          type: CodeGenerationType.REFACTORING,
          createdAt: new Date(),
          metadata: {
            requirements: requirements
          }
        };
        
        // 更新文件内容
        file.content = modifiedContent;
        file.updatedAt = new Date();
        this.codeFiles.set(file.id, file);
        
        modifications.push(modification);
      } catch (error) {
        this.logger.error(`Error refactoring file ${file.path}: ${error}`);
      }
    }
    
    return modifications;
  }

  /**
   * 优化代码
   * @param files 代码文件
   * @param optimizationGoals 优化目标
   * @returns 优化后的代码
   */
  async optimizeCode(
    files: CodeFile[],
    optimizationGoals: string[]
  ): Promise<CodeModification[]> {
    this.logger.info(`Optimizing ${files.length} code files`);
    
    if (!this.llmProvider) {
      throw new Error('LLM provider not initialized');
    }
    
    const modifications: CodeModification[] = [];
    
    for (const file of files) {
      try {
        // 构建提示
        const prompt = `You are an expert ${file.language} developer. 
Please optimize the following code according to these goals:

Optimization goals:
${JSON.stringify(optimizationGoals, null, 2)}

Original code:
\`\`\`${file.language}
${file.content}
\`\`\`

Please provide only the optimized code without any explanations.`;
        
        // 调用LLM
        const response = await this.callLLM(prompt);
        
        // 提取代码
        const codeMatch = response.match(/```[\w]*\n([\s\S]*?)\n```/) || 
                          response.match(/```([\s\S]*?)```/);
        
        if (!codeMatch) {
          throw new Error(`Could not extract code from LLM response for file: ${file.path}`);
        }
        
        const modifiedContent = codeMatch[1] || codeMatch[0];
        
        // 创建修改记录
        const modification: CodeModification = {
          id: uuidv4(),
          filePath: file.path,
          originalContent: file.content,
          modifiedContent: modifiedContent,
          description: `Optimized based on goals: ${optimizationGoals.join(', ')}`,
          type: CodeGenerationType.OPTIMIZATION,
          createdAt: new Date(),
          metadata: {
            optimizationGoals: optimizationGoals
          }
        };
        
        // 更新文件内容
        file.content = modifiedContent;
        file.updatedAt = new Date();
        this.codeFiles.set(file.id, file);
        
        modifications.push(modification);
      } catch (error) {
        this.logger.error(`Error optimizing file ${file.path}: ${error}`);
      }
    }
    
    return modifications;
  }

  /**
   * 修复代码问题
   * @param files 代码文件
   * @param issues 代码问题
   * @returns 修复后的代码
   */
  async fixCodeIssues(
    files: CodeFile[],
    issues: CodeIssue[]
  ): Promise<CodeModification[]> {
    this.logger.info(`Fixing ${issues.length} issues in ${files.length} code files`);
    
    if (!this.llmProvider) {
      throw new Error('LLM provider not initialized');
    }
    
    const modifications: CodeModification[] = [];
    const fileMap = new Map<string, CodeFile>();
    
    // 构建文件映射
    for (const file of files) {
      fileMap.set(file.path, file);
    }
    
    // 按文件分组问题
    const issuesByFile = new Map<string, CodeIssue[]>();
    for (const issue of issues) {
      if (!issuesByFile.has(issue.filePath)) {
        issuesByFile.set(issue.filePath, []);
      }
      issuesByFile.get(issue.filePath)?.push(issue);
    }
    
    // 处理每个文件的问题
    for (const [filePath, fileIssues] of issuesByFile.entries()) {
      const file = fileMap.get(filePath);
      if (!file) {
        this.logger.warn(`File not found for issues: ${filePath}`);
        continue;
      }
      
      try {
        // 构建提示
        const prompt = `You are an expert ${file.language} developer. 
Please fix the following issues in the code:

Issues:
${JSON.stringify(fileIssues, null, 2)}

Original code:
\`\`\`${file.language}
${file.content}
\`\`\`

Please provide only the fixed code without any explanations.`;
        
        // 调用LLM
        const response = await this.callLLM(prompt);
        
        // 提取代码
        const codeMatch = response.match(/```[\w]*\n([\s\S]*?)\n```/) || 
                          response.match(/```([\s\S]*?)```/);
        
        if (!codeMatch) {
          throw new Error(`Could not extract code from LLM response for file: ${file.path}`);
        }
        
        const modifiedContent = codeMatch[1] || codeMatch[0];
        
        // 创建修改记录
        const modification: CodeModification = {
          id: uuidv4(),
          filePath: file.path,
          originalContent: file.content,
          modifiedContent: modifiedContent,
          description: `Fixed ${fileIssues.length} issues`,
          type: CodeGenerationType.BUG_FIX,
          createdAt: new Date(),
          metadata: {
            issues: fileIssues.map(issue => issue.id)
          }
        };
        
        // 更新文件内容
        file.content = modifiedContent;
        file.updatedAt = new Date();
        this.codeFiles.set(file.id, file);
        
        modifications.push(modification);
      } catch (error) {
        this.logger.error(`Error fixing issues in file ${file.path}: ${error}`);
      }
    }
    
    return modifications;
  }

  /**
   * 生成代码文档
   * @param files 代码文件
   * @param documentationType 文档类型
   * @returns 文档代码
   */
  async generateDocumentation(
    files: CodeFile[],
    documentationType: string
  ): Promise<CodeFile[]> {
    this.logger.info(`Generating ${documentationType} documentation for ${files.length} files`);
    
    if (!this.llmProvider) {
      throw new Error('LLM provider not initialized');
    }
    
    const docFiles: CodeFile[] = [];
    
    for (const file of files) {
      try {
        // 构建提示
        const prompt = `You are an expert documentation writer for ${file.language}. 
Please generate ${documentationType} documentation for the following code:

\`\`\`${file.language}
${file.content}
\`\`\`

Please output your response in the following format:
\`\`\`json
{
  "files": [
    {
      "path": "path/to/doc/file.md",
      "content": "documentation content here",
      "description": "brief description of the documentation"
    }
  ]
}
\`\`\``;
        
        // 调用LLM
        const response = await this.callLLM(prompt);
        
        // 解析响应
        const parsedFiles = this.parseDocFilesFromResponse(response);
        
        // 保存文档文件
        for (const docFile of parsedFiles) {
          const savedFile = await this.saveCodeFile(docFile);
          docFiles.push(savedFile);
        }
      } catch (error) {
        this.logger.error(`Error generating documentation for file ${file.path}: ${error}`);
      }
    }
    
    return docFiles;
  }

  /**
   * 获取代码文件
   * @param id 文件ID
   * @returns 代码文件
   */
  async getCodeFile(id: string): Promise<CodeFile | null> {
    return this.codeFiles.get(id) || null;
  }

  /**
   * 获取所有代码文件
   * @returns 所有代码文件
   */
  async getAllCodeFiles(): Promise<CodeFile[]> {
    return Array.from(this.codeFiles.values());
  }

  /**
   * 保存代码文件
   * @param file 代码文件
   * @returns 保存的代码文件
   */
  async saveCodeFile(file: CodeFile): Promise<CodeFile> {
    // 如果没有ID，生成一个
    if (!file.id) {
      file.id = uuidv4();
    }
    
    // 设置时间戳
    if (!file.createdAt) {
      file.createdAt = new Date();
    }
    file.updatedAt = new Date();
    
    // 保存到内存
    this.codeFiles.set(file.id, file);
    
    return file;
  }

  /**
   * 删除代码文件
   * @param id 文件ID
   * @returns 是否成功删除
   */
  async deleteCodeFile(id: string): Promise<boolean> {
    return this.codeFiles.delete(id);
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
   * 构建代码生成提示
   * @param requirements 需求
   * @param type 生成类型
   * @param language 编程语言
   * @returns 提示字符串
   */
  private buildCodeGenerationPrompt(
    requirements: any[],
    type: CodeGenerationType,
    language: ProgrammingLanguage
  ): string {
    // 根据不同类型构建不同的提示
    let prompt = `You are an expert ${language} developer. `;
    
    switch (type) {
      case CodeGenerationType.IMPLEMENTATION:
        prompt += `Please implement the following requirements in ${language}:\n\n`;
        break;
      case CodeGenerationType.REFACTORING:
        prompt += `Please refactor the following code in ${language}:\n\n`;
        break;
      case CodeGenerationType.OPTIMIZATION:
        prompt += `Please optimize the following code in ${language}:\n\n`;
        break;
      case CodeGenerationType.BUG_FIX:
        prompt += `Please fix the bugs in the following code in ${language}:\n\n`;
        break;
      case CodeGenerationType.TEST:
        prompt += `Please write tests for the following code in ${language}:\n\n`;
        break;
      case CodeGenerationType.DOCUMENTATION:
        prompt += `Please document the following code in ${language}:\n\n`;
        break;
    }
    
    // 添加需求
    prompt += `Requirements:\n${JSON.stringify(requirements, null, 2)}\n\n`;
    
    // 添加编码标准
    if (this.config.codingStandards) {
      prompt += `Please follow these coding standards:\n${this.config.codingStandards.join(', ')}\n\n`;
    }
    
    // 添加输出格式说明
    prompt += `
Please output your response in the following format:
\`\`\`json
{
  "files": [
    {
      "path": "path/to/file.ext",
      "      content": "file content here",
      "description": "brief description of the file"
    }
  ]
}
\`\`\`
`;
    
    return prompt;
  }

  /**
   * 从LLM响应中解析代码
   * @param response LLM响应
   * @param language 编程语言
   * @returns 代码文件数组
   */
  private parseCodeFromLLMResponse(response: string, language: ProgrammingLanguage): CodeFile[] {
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
      
      if (!parsed.files || !Array.isArray(parsed.files)) {
        throw new Error('Invalid response format: missing files array');
      }
      
      // 转换为CodeFile对象
      return parsed.files.map((file: any) => ({
        id: uuidv4(),
        path: file.path,
        content: file.content,
        language: language,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          description: file.description || '',
          generationType: 'llm'
        }
      }));
    } catch (error) {
      this.logger.error(`Error parsing code from LLM response: ${error}`);
      
      // 如果解析失败，尝试简单提取代码块
      const codeBlocks = response.match(/```[\w]*\n([\s\S]*?)\n```/g) || [];
      
      if (codeBlocks.length === 0) {
        throw new Error('Could not extract code blocks from LLM response');
      }
      
      // 为每个代码块创建一个文件
      return codeBlocks.map((block: string, index: number) => {
        const content = block.replace(/```[\w]*\n/, '').replace(/\n```$/, '');
        const extension = this.getFileExtensionForLanguage(language);
        
        return {
          id: uuidv4(),
          path: `generated_file_${index + 1}${extension}`,
          content: content,
          language: language,
          createdAt: new Date(),
          updatedAt: new Date(),
          metadata: {
            description: `Generated code block ${index + 1}`,
            generationType: 'llm'
          }
        };
      });
    }
  }

  /**
   * 从LLM响应中解析测试文件
   * @param response LLM响应
   * @param language 编程语言
   * @returns 测试文件数组
   */
  private parseTestFilesFromResponse(response: string, language: ProgrammingLanguage): CodeFile[] {
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
      
      if (!parsed.files || !Array.isArray(parsed.files)) {
        throw new Error('Invalid response format: missing files array');
      }
      
      // 转换为CodeFile对象
      return parsed.files.map((file: any) => ({
        id: uuidv4(),
        path: file.path,
        content: file.content,
        language: language,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          description: file.description || '',
          generationType: 'test'
        }
      }));
    } catch (error) {
      this.logger.error(`Error parsing test files from LLM response: ${error}`);
      
      // 如果解析失败，尝试简单提取代码块
      const codeBlocks = response.match(/```[\w]*\n([\s\S]*?)\n```/g) || [];
      
      if (codeBlocks.length === 0) {
        throw new Error('Could not extract code blocks from LLM response');
      }
      
      // 为每个代码块创建一个文件
      return codeBlocks.map((block: string, index: number) => {
        const content = block.replace(/```[\w]*\n/, '').replace(/\n```$/, '');
        const extension = this.getFileExtensionForLanguage(language);
        
        return {
          id: uuidv4(),
          path: `test_file_${index + 1}${extension}`,
          content: content,
          language: language,
          createdAt: new Date(),
          updatedAt: new Date(),
          metadata: {
            description: `Generated test file ${index + 1}`,
            generationType: 'test'
          }
        };
      });
    }
  }

  /**
   * 从LLM响应中解析文档文件
   * @param response LLM响应
   * @returns 文档文件数组
   */
  private parseDocFilesFromResponse(response: string): CodeFile[] {
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
      
      if (!parsed.files || !Array.isArray(parsed.files)) {
        throw new Error('Invalid response format: missing files array');
      }
      
      // 转换为CodeFile对象
      return parsed.files.map((file: any) => ({
        id: uuidv4(),
        path: file.path,
        content: file.content,
        language: ProgrammingLanguage.OTHER, // 文档通常不是代码
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          description: file.description || '',
          generationType: 'documentation'
        }
      }));
    } catch (error) {
      this.logger.error(`Error parsing doc files from LLM response: ${error}`);
      
      // 如果解析失败，尝试简单提取代码块
      const markdownBlocks = response.match(/```markdown\n([\s\S]*?)\n```/g) || 
                            response.match(/```md\n([\s\S]*?)\n```/g) || [];
      
      if (markdownBlocks.length === 0) {
        throw new Error('Could not extract markdown blocks from LLM response');
      }
      
      // 为每个代码块创建一个文件
      return markdownBlocks.map((block: string, index: number) => {
        const content = block.replace(/```(markdown|md)\n/, '').replace(/\n```$/, '');
        
        return {
          id: uuidv4(),
          path: `documentation_${index + 1}.md`,
          content: content,
          language: ProgrammingLanguage.OTHER,
          createdAt: new Date(),
          updatedAt: new Date(),
          metadata: {
            description: `Generated documentation file ${index + 1}`,
            generationType: 'documentation'
          }
        };
      });
    }
  }

  /**
   * 获取语言对应的文件扩展名
   * @param language 编程语言
   * @returns 文件扩展名
   */
  private getFileExtensionForLanguage(language: ProgrammingLanguage): string {
    switch (language) {
      case ProgrammingLanguage.TYPESCRIPT:
        return '.ts';
      case ProgrammingLanguage.JAVASCRIPT:
        return '.js';
      case ProgrammingLanguage.PYTHON:
        return '.py';
      case ProgrammingLanguage.JAVA:
        return '.java';
      case ProgrammingLanguage.CSHARP:
        return '.cs';
      case ProgrammingLanguage.CPP:
        return '.cpp';
      case ProgrammingLanguage.GO:
        return '.go';
      case ProgrammingLanguage.RUST:
        return '.rs';
      case ProgrammingLanguage.PHP:
        return '.php';
      case ProgrammingLanguage.RUBY:
        return '.rb';
      case ProgrammingLanguage.SWIFT:
        return '.swift';
      case ProgrammingLanguage.KOTLIN:
        return '.kt';
      default:
        return '.txt';
    }
  }
}