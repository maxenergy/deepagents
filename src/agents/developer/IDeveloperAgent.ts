import { AgentConfig, AgentInput, AgentOutput, IAgent } from '../IAgent';

/**
 * 代码生成类型枚举
 */
export enum CodeGenerationType {
  IMPLEMENTATION = 'implementation',
  REFACTORING = 'refactoring',
  OPTIMIZATION = 'optimization',
  BUG_FIX = 'bug_fix',
  TEST = 'test',
  DOCUMENTATION = 'documentation'
}

/**
 * 编程语言枚举
 */
export enum ProgrammingLanguage {
  TYPESCRIPT = 'typescript',
  JAVASCRIPT = 'javascript',
  PYTHON = 'python',
  JAVA = 'java',
  CSHARP = 'csharp',
  CPP = 'cpp',
  GO = 'go',
  RUST = 'rust',
  PHP = 'php',
  RUBY = 'ruby',
  SWIFT = 'swift',
  KOTLIN = 'kotlin',
  OTHER = 'other'
}

/**
 * 代码文件接口
 */
export interface CodeFile {
  id: string;
  path: string;
  content: string;
  language: ProgrammingLanguage;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

/**
 * 代码修改接口
 */
export interface CodeModification {
  id: string;
  filePath: string;
  originalContent?: string;
  modifiedContent: string;
  description: string;
  type: CodeGenerationType;
  createdAt: Date;
  metadata?: Record<string, any>;
}

/**
 * 代码问题接口
 */
export interface CodeIssue {
  id: string;
  filePath: string;
  lineStart?: number;
  lineEnd?: number;
  description: string;
  severity: 'critical' | 'major' | 'minor';
  type: 'error' | 'warning' | 'info';
  code?: string;
  suggestedFix?: string;
  metadata?: Record<string, any>;
}

/**
 * 开发者代理配置接口
 */
export interface DeveloperAgentConfig extends AgentConfig {
  codeTemplates?: Record<string, string[]>;
  preferredLanguages?: ProgrammingLanguage[];
  codingStandards?: string[];
  testingStrategy?: string;
  documentationStyle?: string;
  maxFileSizeBytes?: number;
}

/**
 * 开发者代理输入接口
 */
export interface DeveloperAgentInput extends AgentInput {
  codeGenerationType?: CodeGenerationType;
  language?: ProgrammingLanguage;
  existingFiles?: CodeFile[];
  architectureDesign?: any;
  requirements?: any[];
  testCases?: any[];
  codeIssues?: CodeIssue[];
}

/**
 * 开发者代理输出接口
 */
export interface DeveloperAgentOutput extends AgentOutput {
  generatedFiles?: CodeFile[];
  modifiedFiles?: CodeModification[];
  detectedIssues?: CodeIssue[];
  explanation?: string;
  testResults?: {
    passed: boolean;
    totalTests: number;
    passedTests: number;
    failedTests: number;
    details: string;
  };
}

/**
 * 开发者代理接口
 */
export interface IDeveloperAgent extends IAgent {
  /**
   * 生成代码文件
   * @param requirements 需求
   * @param type 生成类型
   * @param language 编程语言
   * @returns 生成的代码文件
   */
  generateCode(
    requirements: any[],
    type: CodeGenerationType,
    language: ProgrammingLanguage
  ): Promise<CodeFile[]>;

  /**
   * 修改代码文件
   * @param file 代码文件
   * @param requirements 需求
   * @param type 修改类型
   * @returns 修改后的代码
   */
  modifyCode(
    file: CodeFile,
    requirements: any[],
    type: CodeGenerationType
  ): Promise<CodeModification>;

  /**
   * 分析代码
   * @param files 代码文件
   * @returns 代码问题
   */
  analyzeCode(
    files: CodeFile[]
  ): Promise<CodeIssue[]>;

  /**
   * 生成测试
   * @param files 代码文件
   * @param testType 测试类型
   * @returns 测试代码文件
   */
  generateTests(
    files: CodeFile[],
    testType: string
  ): Promise<CodeFile[]>;

  /**
   * 执行测试
   * @param files 代码文件
   * @param testFiles 测试文件
   * @returns 测试结果
   */
  runTests(
    files: CodeFile[],
    testFiles: CodeFile[]
  ): Promise<{
    passed: boolean;
    totalTests: number;
    passedTests: number;
    failedTests: number;
    details: string;
  }>;

  /**
   * 重构代码
   * @param files 代码文件
   * @param requirements 重构需求
   * @returns 重构后的代码
   */
  refactorCode(
    files: CodeFile[],
    requirements: any[]
  ): Promise<CodeModification[]>;

  /**
   * 优化代码
   * @param files 代码文件
   * @param optimizationGoals 优化目标
   * @returns 优化后的代码
   */
  optimizeCode(
    files: CodeFile[],
    optimizationGoals: string[]
  ): Promise<CodeModification[]>;

  /**
   * 修复代码问题
   * @param files 代码文件
   * @param issues 代码问题
   * @returns 修复后的代码
   */
  fixCodeIssues(
    files: CodeFile[],
    issues: CodeIssue[]
  ): Promise<CodeModification[]>;

  /**
   * 生成代码文档
   * @param files 代码文件
   * @param documentationType 文档类型
   * @returns 文档代码
   */
  generateDocumentation(
    files: CodeFile[],
    documentationType: string
  ): Promise<CodeFile[]>;

  /**
   * 获取代码文件
   * @param id 文件ID
   * @returns 代码文件
   */
  getCodeFile(id: string): Promise<CodeFile | null>;

  /**
   * 获取所有代码文件
   * @returns 所有代码文件
   */
  getAllCodeFiles(): Promise<CodeFile[]>;

  /**
   * 保存代码文件
   * @param file 代码文件
   * @returns 保存的代码文件
   */
  saveCodeFile(file: CodeFile): Promise<CodeFile>;

  /**
   * 删除代码文件
   * @param id 文件ID
   * @returns 是否成功删除
   */
  deleteCodeFile(id: string): Promise<boolean>;
}
