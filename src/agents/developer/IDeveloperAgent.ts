import { IAgent, AgentOutput } from '../IAgent';
import { ArchitectureDesign, TechChoice } from '../architect/ArchitectAgent';
import { Requirement, UserStory } from '../product/ProductRequirementsAgent';
import { CollaborationType } from '../collaboration';

/**
 * 代码文件类型枚举
 */
export enum CodeFileType {
  SOURCE = 'source',
  TEST = 'test',
  CONFIG = 'config',
  DOCUMENTATION = 'documentation',
  RESOURCE = 'resource'
}

/**
 * 代码实现状态枚举
 */
export enum ImplementationStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  NEEDS_REVIEW = 'needs_review',
  NEEDS_REFACTORING = 'needs_refactoring',
  HAS_ISSUES = 'has_issues'
}

/**
 * 代码文件接口
 */
export interface CodeFile {
  id: string;
  path: string;
  name: string;
  type: CodeFileType;
  content: string;
  language: string;
  description: string;
  status: ImplementationStatus;
  dependencies: string[];
  createdAt: Date;
  updatedAt: Date;
  requirementIds?: string[];
  componentId?: string;
  metadata?: Record<string, any>;
}

/**
 * 代码模块接口
 */
export interface CodeModule {
  id: string;
  name: string;
  description: string;
  files: CodeFile[];
  dependencies: string[];
  status: ImplementationStatus;
  componentId?: string;
  requirementIds?: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 测试用例接口
 */
export interface TestCase {
  id: string;
  name: string;
  description: string;
  type: 'unit' | 'integration' | 'e2e' | 'performance';
  status: 'pending' | 'passed' | 'failed';
  fileId: string;
  code: string;
  requirementIds?: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 代码问题接口
 */
export interface CodeIssue {
  id: string;
  fileId: string;
  type: 'error' | 'warning' | 'info';
  description: string;
  line?: number;
  column?: number;
  code?: string;
  suggestion?: string;
  createdAt: Date;
  resolvedAt?: Date;
}

/**
 * 开发者代理输入接口
 */
export interface DeveloperAgentInput {
  type: 'generate_code' | 'implement_feature' | 'fix_issue' | 'refactor_code' | 'create_tests';
  requirements?: Requirement[];
  userStories?: UserStory[];
  architectureDesign?: ArchitectureDesign;
  techChoices?: TechChoice[];
  componentId?: string;
  moduleId?: string;
  fileId?: string;
  issueId?: string;
  code?: string;
  description?: string;
}

/**
 * 开发者代理输出接口
 */
export interface DeveloperAgentOutput extends AgentOutput {
  files?: CodeFile[];
  modules?: CodeModule[];
  tests?: TestCase[];
  issues?: CodeIssue[];
  analysis?: string;
}

/**
 * 开发者代理接口
 */
export interface IDeveloperAgent extends IAgent {
  /**
   * 生成代码
   * @param requirements 需求列表
   * @param architectureDesign 架构设计
   * @param techChoices 技术选择
   * @param componentId 组件ID（可选）
   * @returns 生成的代码文件
   */
  generateCode(
    requirements: Requirement[],
    architectureDesign: ArchitectureDesign,
    techChoices: TechChoice[],
    componentId?: string
  ): Promise<CodeFile[]>;
  
  /**
   * 实现功能
   * @param requirements 需求列表
   * @param userStories 用户故事列表
   * @param architectureDesign 架构设计
   * @param description 功能描述
   * @returns 实现的代码模块
   */
  implementFeature(
    requirements: Requirement[],
    userStories: UserStory[],
    architectureDesign: ArchitectureDesign,
    description: string
  ): Promise<CodeModule>;
  
  /**
   * 修复问题
   * @param issueId 问题ID
   * @param fileId 文件ID
   * @param code 代码
   * @returns 修复后的代码文件
   */
  fixIssue(
    issueId: string,
    fileId: string,
    code: string
  ): Promise<CodeFile>;
  
  /**
   * 重构代码
   * @param fileId 文件ID
   * @param code 代码
   * @param description 重构描述
   * @returns 重构后的代码文件
   */
  refactorCode(
    fileId: string,
    code: string,
    description: string
  ): Promise<CodeFile>;
  
  /**
   * 创建测试
   * @param fileId 文件ID
   * @param code 代码
   * @param requirements 需求列表
   * @returns 创建的测试用例
   */
  createTests(
    fileId: string,
    code: string,
    requirements: Requirement[]
  ): Promise<TestCase[]>;
  
  /**
   * 分析代码
   * @param code 代码
   * @returns 分析结果
   */
  analyzeCode(code: string): Promise<string>;
  
  /**
   * 获取代码文件
   * @param id 文件ID
   * @returns 代码文件，如果不存在则返回undefined
   */
  getCodeFile(id: string): CodeFile | undefined;
  
  /**
   * 获取所有代码文件
   * @returns 所有代码文件
   */
  getAllCodeFiles(): CodeFile[];
  
  /**
   * 获取代码模块
   * @param id 模块ID
   * @returns 代码模块，如果不存在则返回undefined
   */
  getCodeModule(id: string): CodeModule | undefined;
  
  /**
   * 获取所有代码模块
   * @returns 所有代码模块
   */
  getAllCodeModules(): CodeModule[];
  
  /**
   * 获取测试用例
   * @param id 测试用例ID
   * @returns 测试用例，如果不存在则返回undefined
   */
  getTestCase(id: string): TestCase | undefined;
  
  /**
   * 获取所有测试用例
   * @returns 所有测试用例
   */
  getAllTestCases(): TestCase[];
  
  /**
   * 获取代码问题
   * @param id 问题ID
   * @returns 代码问题，如果不存在则返回undefined
   */
  getCodeIssue(id: string): CodeIssue | undefined;
  
  /**
   * 获取所有代码问题
   * @returns 所有代码问题
   */
  getAllCodeIssues(): CodeIssue[];
  
  /**
   * 更新代码文件
   * @param file 代码文件
   * @returns 更新后的代码文件
   */
  updateCodeFile(file: CodeFile): CodeFile;
  
  /**
   * 删除代码文件
   * @param id 文件ID
   * @returns 是否成功删除
   */
  deleteCodeFile(id: string): boolean;
  
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
