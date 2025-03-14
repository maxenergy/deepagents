import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { BaseTool } from '../BaseTool';
import { ToolType } from '../ToolManager';

/**
 * 搜索结果接口
 */
export interface SearchResult {
  /**
   * 文件路径
   */
  filePath: string;
  
  /**
   * 匹配行
   */
  line: number;
  
  /**
   * 匹配列
   */
  column: number;
  
  /**
   * 匹配文本
   */
  text: string;
  
  /**
   * 匹配前的上下文
   */
  preContext?: string[];
  
  /**
   * 匹配后的上下文
   */
  postContext?: string[];
}

/**
 * 搜索工具参数接口
 */
export interface SearchParams {
  /**
   * 搜索类型
   */
  type: 'text' | 'regex' | 'symbol';
  
  /**
   * 搜索模式
   */
  pattern: string;
  
  /**
   * 搜索路径
   */
  path?: string;
  
  /**
   * 包含的文件模式
   */
  include?: string[];
  
  /**
   * 排除的文件模式
   */
  exclude?: string[];
  
  /**
   * 是否区分大小写
   */
  caseSensitive?: boolean;
  
  /**
   * 是否使用全词匹配
   */
  wholeWord?: boolean;
  
  /**
   * 是否使用正则表达式
   */
  useRegex?: boolean;
  
  /**
   * 最大结果数
   */
  maxResults?: number;
  
  /**
   * 上下文行数
   */
  contextLines?: number;
}

/**
 * 搜索工具类
 * 
 * 提供代码搜索功能
 */
export class SearchTool extends BaseTool {
  /**
   * 构造函数
   */
  constructor() {
    super(
      'search',
      '搜索工具',
      ToolType.SEARCH,
      '提供代码搜索功能，包括文本搜索、正则表达式搜索和符号搜索'
    );
  }
  
  /**
   * 初始化回调
   */
  protected async onInitialize(): Promise<void> {
    // 初始化搜索工具
  }
  
  /**
   * 执行搜索
   * 
   * @param params 参数
   * @returns 搜索结果
   */
  protected async onExecute(params: SearchParams): Promise<SearchResult[]> {
    // 验证参数
    if (!params.pattern) {
      throw new Error('搜索模式不能为空');
    }
    
    // 设置默认值
    const searchPath = params.path || vscode.workspace.rootPath || '';
    const maxResults = params.maxResults || 1000;
    const contextLines = params.contextLines || 0;
    
    // 根据搜索类型执行不同的搜索
    switch (params.type) {
      case 'text':
        return this.searchText(
          params.pattern,
          searchPath,
          params.include,
          params.exclude,
          params.caseSensitive,
          params.wholeWord,
          maxResults,
          contextLines
        );
      case 'regex':
        return this.searchRegex(
          params.pattern,
          searchPath,
          params.include,
          params.exclude,
          params.caseSensitive,
          maxResults,
          contextLines
        );
      case 'symbol':
        return this.searchSymbol(
          params.pattern,
          searchPath,
          params.include,
          params.exclude,
          maxResults
        );
      default:
        throw new Error(`未知搜索类型: ${params.type}`);
    }
  }
  
  /**
   * 文本搜索
   * 
   * @param pattern 搜索模式
   * @param searchPath 搜索路径
   * @param include 包含的文件模式
   * @param exclude 排除的文件模式
   * @param caseSensitive 是否区分大小写
   * @param wholeWord 是否使用全词匹配
   * @param maxResults 最大结果数
   * @param contextLines 上下文行数
   * @returns 搜索结果
   */
  private async searchText(
    pattern: string,
    searchPath: string,
    include?: string[],
    exclude?: string[],
    caseSensitive?: boolean,
    wholeWord?: boolean,
    maxResults?: number,
    contextLines?: number
  ): Promise<SearchResult[]> {
    // 使用VSCode搜索API
    const results: SearchResult[] = [];
    
    try {
      // 创建搜索选项
      const options: vscode.TextSearchOptions = {
        folder: vscode.Uri.file(searchPath),
        includes: include || ['**/*'],
        excludes: exclude || ['**/node_modules/**', '**/dist/**', '**/build/**'],
        maxResults: maxResults,
        useIgnoreFiles: true,
        useGlobalIgnoreFiles: true,
        useGitIgnore: true,
        followSymlinks: false
      };
      
      // 创建搜索查询
      const query: vscode.TextSearchQuery = {
        pattern: pattern,
        isCaseSensitive: caseSensitive || false,
        isWordMatch: wholeWord || false,
        isRegExp: false
      };
      
      // 执行搜索
      await vscode.workspace.findTextInFiles(query, options, (result) => {
        if (result.preview) {
          const searchResult: SearchResult = {
            filePath: result.uri.fsPath,
            line: result.ranges[0].start.line,
            column: result.ranges[0].start.character,
            text: result.preview.text
          };
          
          // 如果需要上下文，读取文件并提取上下文
          if (contextLines && contextLines > 0) {
            this.addContextToResult(searchResult, contextLines);
          }
          
          results.push(searchResult);
        }
        
        // 如果达到最大结果数，停止搜索
        return results.length < (maxResults || 1000);
      });
      
      return results;
    } catch (error: any) {
      throw new Error(`文本搜索失败: ${error.message}`);
    }
  }
  
  /**
   * 正则表达式搜索
   * 
   * @param pattern 搜索模式
   * @param searchPath 搜索路径
   * @param include 包含的文件模式
   * @param exclude 排除的文件模式
   * @param caseSensitive 是否区分大小写
   * @param maxResults 最大结果数
   * @param contextLines 上下文行数
   * @returns 搜索结果
   */
  private async searchRegex(
    pattern: string,
    searchPath: string,
    include?: string[],
    exclude?: string[],
    caseSensitive?: boolean,
    maxResults?: number,
    contextLines?: number
  ): Promise<SearchResult[]> {
    // 使用VSCode搜索API
    const results: SearchResult[] = [];
    
    try {
      // 创建搜索选项
      const options: vscode.TextSearchOptions = {
        folder: vscode.Uri.file(searchPath),
        includes: include || ['**/*'],
        excludes: exclude || ['**/node_modules/**', '**/dist/**', '**/build/**'],
        maxResults: maxResults,
        useIgnoreFiles: true,
        useGlobalIgnoreFiles: true,
        useGitIgnore: true,
        followSymlinks: false
      };
      
      // 创建搜索查询
      const query: vscode.TextSearchQuery = {
        pattern: pattern,
        isCaseSensitive: caseSensitive || false,
        isWordMatch: false,
        isRegExp: true
      };
      
      // 执行搜索
      await vscode.workspace.findTextInFiles(query, options, (result) => {
        if (result.preview) {
          const searchResult: SearchResult = {
            filePath: result.uri.fsPath,
            line: result.ranges[0].start.line,
            column: result.ranges[0].start.character,
            text: result.preview.text
          };
          
          // 如果需要上下文，读取文件并提取上下文
          if (contextLines && contextLines > 0) {
            this.addContextToResult(searchResult, contextLines);
          }
          
          results.push(searchResult);
        }
        
        // 如果达到最大结果数，停止搜索
        return results.length < (maxResults || 1000);
      });
      
      return results;
    } catch (error: any) {
      throw new Error(`正则表达式搜索失败: ${error.message}`);
    }
  }
  
  /**
   * 符号搜索
   * 
   * @param pattern 搜索模式
   * @param searchPath 搜索路径
   * @param include 包含的文件模式
   * @param exclude 排除的文件模式
   * @param maxResults 最大结果数
   * @returns 搜索结果
   */
  private async searchSymbol(
    pattern: string,
    searchPath: string,
    include?: string[],
    exclude?: string[],
    maxResults?: number
  ): Promise<SearchResult[]> {
    // 使用VSCode符号搜索API
    const results: SearchResult[] = [];
    
    try {
      // 执行符号搜索
      const symbols = await vscode.commands.executeCommand<vscode.SymbolInformation[]>(
        'vscode.executeWorkspaceSymbolProvider',
        pattern
      );
      
      if (symbols) {
        // 过滤符号
        for (const symbol of symbols) {
          // 检查文件路径是否匹配包含和排除模式
          const filePath = symbol.location.uri.fsPath;
          
          if (!this.matchesPatterns(filePath, include, exclude)) {
            continue;
          }
          
          // 创建搜索结果
          const searchResult: SearchResult = {
            filePath,
            line: symbol.location.range.start.line,
            column: symbol.location.range.start.character,
            text: `${symbol.name} (${symbol.kind})`
          };
          
          results.push(searchResult);
          
          // 如果达到最大结果数，停止搜索
          if (results.length >= (maxResults || 1000)) {
            break;
          }
        }
      }
      
      return results;
    } catch (error: any) {
      throw new Error(`符号搜索失败: ${error.message}`);
    }
  }
  
  /**
   * 检查文件路径是否匹配包含和排除模式
   * 
   * @param filePath 文件路径
   * @param include 包含的文件模式
   * @param exclude 排除的文件模式
   * @returns 是否匹配
   */
  private matchesPatterns(filePath: string, include?: string[], exclude?: string[]): boolean {
    // 如果没有包含和排除模式，则匹配所有文件
    if (!include && !exclude) {
      return true;
    }
    
    // 检查排除模式
    if (exclude) {
      for (const pattern of exclude) {
        if (this.matchesGlobPattern(filePath, pattern)) {
          return false;
        }
      }
    }
    
    // 检查包含模式
    if (include) {
      for (const pattern of include) {
        if (this.matchesGlobPattern(filePath, pattern)) {
          return true;
        }
      }
      
      // 如果有包含模式但没有匹配，则不匹配
      return false;
    }
    
    return true;
  }
  
  /**
   * 检查文件路径是否匹配Glob模式
   * 
   * @param filePath 文件路径
   * @param pattern Glob模式
   * @returns 是否匹配
   */
  private matchesGlobPattern(filePath: string, pattern: string): boolean {
    // 简单实现：使用minimatch库或类似的库进行Glob匹配
    // 这里使用简化的实现
    
    // 将Glob模式转换为正则表达式
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    
    const regex = new RegExp(`^${regexPattern}$`, 'i');
    
    return regex.test(filePath);
  }
  
  /**
   * 向搜索结果添加上下文
   * 
   * @param result 搜索结果
   * @param contextLines 上下文行数
   */
  private addContextToResult(result: SearchResult, contextLines: number): void {
    try {
      // 读取文件内容
      const fileContent = fs.readFileSync(result.filePath, 'utf8');
      const lines = fileContent.split('\n');
      
      // 计算上下文范围
      const startLine = Math.max(0, result.line - contextLines);
      const endLine = Math.min(lines.length - 1, result.line + contextLines);
      
      // 提取上下文
      result.preContext = lines.slice(startLine, result.line);
      result.postContext = lines.slice(result.line + 1, endLine + 1);
    } catch (error) {
      // 忽略错误
      console.error(`无法添加上下文: ${error}`);
    }
  }
  
  /**
   * 销毁回调
   */
  protected onDispose(): void {
    // 清理资源
  }
}