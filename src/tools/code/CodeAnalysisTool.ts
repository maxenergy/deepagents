import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { BaseTool } from '../BaseTool';
import { ToolType } from '../ToolManager';
import { LLMManager } from '../../llm/LLMManager';

/**
 * 代码分析结果接口
 */
export interface CodeAnalysisResult {
  /**
   * 分析的文件路径
   */
  filePath: string;
  
  /**
   * 代码复杂度
   */
  complexity?: number;
  
  /**
   * 代码质量评分
   */
  qualityScore?: number;
  
  /**
   * 代码问题列表
   */
  issues: CodeIssue[];
  
  /**
   * 代码建议列表
   */
  suggestions: CodeSuggestion[];
  
  /**
   * 代码依赖列表
   */
  dependencies?: string[];
  
  /**
   * 代码结构
   */
  structure?: any;
  
  /**
   * 原始分析结果
   */
  rawResult?: any;
}

/**
 * 代码问题接口
 */
export interface CodeIssue {
  /**
   * 问题类型
   */
  type: string;
  
  /**
   * 问题描述
   */
  description: string;
  
  /**
   * 问题位置
   */
  location?: {
    line: number;
    column: number;
  };
  
  /**
   * 问题严重程度
   */
  severity: 'error' | 'warning' | 'info';
  
  /**
   * 问题修复建议
   */
  fix?: string;
}

/**
 * 代码建议接口
 */
export interface CodeSuggestion {
  /**
   * 建议类型
   */
  type: string;
  
  /**
   * 建议描述
   */
  description: string;
  
  /**
   * 建议位置
   */
  location?: {
    line: number;
    column: number;
  };
  
  /**
   * 建议优先级
   */
  priority: 'high' | 'medium' | 'low';
  
  /**
   * 建议实现
   */
  implementation?: string;
}

/**
 * 代码分析工具参数接口
 */
export interface CodeAnalysisParams {
  /**
   * 文件路径
   */
  filePath: string;
  
  /**
   * 分析类型
   */
  analysisType?: 'quality' | 'security' | 'performance' | 'all';
  
  /**
   * 是否包含建议
   */
  includeSuggestions?: boolean;
  
  /**
   * 是否包含依赖分析
   */
  includeDependencies?: boolean;
  
  /**
   * 是否包含结构分析
   */
  includeStructure?: boolean;
  
  /**
   * 自定义分析选项
   */
  options?: Record<string, any>;
}

/**
 * 代码分析工具类
 * 
 * 提供代码质量、安全性和性能分析功能
 */
export class CodeAnalysisTool extends BaseTool {
  private llmManager: LLMManager;
  
  /**
   * 构造函数
   * 
   * @param llmManager LLM管理器
   */
  constructor(llmManager: LLMManager) {
    super(
      'code_analysis',
      '代码分析工具',
      ToolType.CODE_ANALYSIS,
      '分析代码质量、安全性和性能，提供改进建议'
    );
    
    this.llmManager = llmManager;
  }
  
  /**
   * 初始化回调
   */
  protected async onInitialize(): Promise<void> {
    // 初始化代码分析工具
  }
  
  /**
   * 执行代码分析
   * 
   * @param params 分析参数
   * @returns 分析结果
   */
  protected async onExecute(params: CodeAnalysisParams): Promise<CodeAnalysisResult> {
    // 验证参数
    if (!params.filePath) {
      throw new Error('文件路径不能为空');
    }
    
    // 设置默认值
    const analysisType = params.analysisType || 'all';
    const includeSuggestions = params.includeSuggestions !== false;
    const includeDependencies = params.includeDependencies || false;
    const includeStructure = params.includeStructure || false;
    
    // 读取文件内容
    const filePath = params.filePath;
    let fileContent: string;
    
    try {
      fileContent = await this.readFile(filePath);
    } catch (error: any) {
      throw new Error(`读取文件失败: ${error.message}`);
    }
    
    // 获取文件扩展名
    const fileExtension = path.extname(filePath).toLowerCase();
    
    // 根据文件类型和分析类型执行不同的分析
    let result: CodeAnalysisResult = {
      filePath,
      issues: [],
      suggestions: []
    };
    
    // 使用LLM进行代码分析
    try {
      result = await this.analyzeCodeWithLLM(fileContent, fileExtension, analysisType, includeSuggestions);
    } catch (error: any) {
      throw new Error(`代码分析失败: ${error.message}`);
    }
    
    // 如果需要，分析依赖
    if (includeDependencies) {
      result.dependencies = await this.analyzeDependencies(fileContent, fileExtension);
    }
    
    // 如果需要，分析结构
    if (includeStructure) {
      result.structure = await this.analyzeStructure(fileContent, fileExtension);
    }
    
    return result;
  }
  
  /**
   * 使用LLM分析代码
   * 
   * @param code 代码内容
   * @param fileExtension 文件扩展名
   * @param analysisType 分析类型
   * @param includeSuggestions 是否包含建议
   * @returns 分析结果
   */
  private async analyzeCodeWithLLM(
    code: string,
    fileExtension: string,
    analysisType: string,
    includeSuggestions: boolean
  ): Promise<CodeAnalysisResult> {
    // 构建提示
    let prompt = `分析以下${this.getLanguageName(fileExtension)}代码`;
    
    if (analysisType === 'quality') {
      prompt += '的质量问题';
    } else if (analysisType === 'security') {
      prompt += '的安全问题';
    } else if (analysisType === 'performance') {
      prompt += '的性能问题';
    } else {
      prompt += '的质量、安全性和性能问题';
    }
    
    if (includeSuggestions) {
      prompt += '，并提供改进建议';
    }
    
    prompt += '。请以JSON格式返回结果，包含issues和suggestions数组。\n\n代码:\n```\n';
    prompt += code;
    prompt += '\n```';
    
    // 调用LLM
    const response = await this.llmManager.query(prompt, {
      temperature: 0.1,
      maxTokens: 2000
    });
    
    // 解析结果
    try {
      const jsonMatch = response.content.match(/```json\n([\s\S]*?)\n```/) || 
                        response.content.match(/```\n([\s\S]*?)\n```/) ||
                        response.content.match(/{[\s\S]*}/);
      
      let jsonStr = '';
      if (jsonMatch && jsonMatch[1]) {
        jsonStr = jsonMatch[1];
      } else if (jsonMatch) {
        jsonStr = jsonMatch[0];
      } else {
        throw new Error('无法解析LLM响应');
      }
      
      const result = JSON.parse(jsonStr);
      
      // 确保结果格式正确
      const analysisResult: CodeAnalysisResult = {
        filePath: '',
        issues: Array.isArray(result.issues) ? result.issues : [],
        suggestions: Array.isArray(result.suggestions) ? result.suggestions : []
      };
      
      // 添加质量评分（如果有）
      if (typeof result.qualityScore === 'number') {
        analysisResult.qualityScore = result.qualityScore;
      }
      
      // 添加复杂度（如果有）
      if (typeof result.complexity === 'number') {
        analysisResult.complexity = result.complexity;
      }
      
      return analysisResult;
    } catch (error: any) {
      throw new Error(`解析分析结果失败: ${error.message}`);
    }
  }
  
  /**
   * 分析代码依赖
   * 
   * @param code 代码内容
   * @param fileExtension 文件扩展名
   * @returns 依赖列表
   */
  private async analyzeDependencies(code: string, fileExtension: string): Promise<string[]> {
    // 根据文件类型分析依赖
    const dependencies: string[] = [];
    
    // 简单实现：使用正则表达式匹配导入语句
    if (fileExtension === '.ts' || fileExtension === '.js') {
      // 匹配 import 语句
      const importRegex = /import\s+(?:{[^}]*}|\*\s+as\s+\w+|\w+)\s+from\s+['"]([^'"]+)['"]/g;
      let match;
      while ((match = importRegex.exec(code)) !== null) {
        dependencies.push(match[1]);
      }
      
      // 匹配 require 语句
      const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
      while ((match = requireRegex.exec(code)) !== null) {
        dependencies.push(match[1]);
      }
    } else if (fileExtension === '.py') {
      // 匹配 import 语句
      const importRegex = /import\s+(\w+)/g;
      let match;
      while ((match = importRegex.exec(code)) !== null) {
        dependencies.push(match[1]);
      }
      
      // 匹配 from import 语句
      const fromImportRegex = /from\s+([^\s]+)\s+import/g;
      while ((match = fromImportRegex.exec(code)) !== null) {
        dependencies.push(match[1]);
      }
    }
    
    return dependencies;
  }
  
  /**
   * 分析代码结构
   * 
   * @param code 代码内容
   * @param fileExtension 文件扩展名
   * @returns 代码结构
   */
  private async analyzeStructure(code: string, fileExtension: string): Promise<any> {
    // 使用LLM分析代码结构
    const prompt = `分析以下${this.getLanguageName(fileExtension)}代码的结构，包括类、方法、函数等。请以JSON格式返回结果。\n\n代码:\n\`\`\`\n${code}\n\`\`\``;
    
    const response = await this.llmManager.query(prompt, {
      temperature: 0.1,
      maxTokens: 2000
    });
    
    // 解析结果
    try {
      const jsonMatch = response.content.match(/```json\n([\s\S]*?)\n```/) || 
                        response.content.match(/```\n([\s\S]*?)\n```/) ||
                        response.content.match(/{[\s\S]*}/);
      
      let jsonStr = '';
      if (jsonMatch && jsonMatch[1]) {
        jsonStr = jsonMatch[1];
      } else if (jsonMatch) {
        jsonStr = jsonMatch[0];
      } else {
        throw new Error('无法解析LLM响应');
      }
      
      return JSON.parse(jsonStr);
    } catch (error: any) {
      throw new Error(`解析结构分析结果失败: ${error.message}`);
    }
  }
  
  /**
   * 读取文件内容
   * 
   * @param filePath 文件路径
   * @returns 文件内容
   */
  private async readFile(filePath: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
  }
  
  /**
   * 根据文件扩展名获取语言名称
   * 
   * @param fileExtension 文件扩展名
   * @returns 语言名称
   */
  private getLanguageName(fileExtension: string): string {
    switch (fileExtension) {
      case '.ts':
        return 'TypeScript';
      case '.js':
        return 'JavaScript';
      case '.py':
        return 'Python';
      case '.java':
        return 'Java';
      case '.c':
        return 'C';
      case '.cpp':
        return 'C++';
      case '.cs':
        return 'C#';
      case '.go':
        return 'Go';
      case '.rb':
        return 'Ruby';
      case '.php':
        return 'PHP';
      case '.swift':
        return 'Swift';
      case '.kt':
        return 'Kotlin';
      case '.rs':
        return 'Rust';
      default:
        return '未知语言';
    }
  }
  
  /**
   * 销毁回调
   */
  protected onDispose(): void {
    // 清理资源
  }
}