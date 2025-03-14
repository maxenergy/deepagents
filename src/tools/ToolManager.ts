import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * 工具类型枚举
 */
export enum ToolType {
  CODE_ANALYSIS = 'code_analysis',
  VERSION_CONTROL = 'version_control',
  DEPENDENCY_MANAGEMENT = 'dependency_management',
  FILE_SYSTEM = 'file_system',
  TERMINAL = 'terminal',
  SEARCH = 'search',
  CUSTOM = 'custom'
}

/**
 * 工具接口
 */
export interface ITool {
  /**
   * 工具ID
   */
  readonly id: string;
  
  /**
   * 工具名称
   */
  readonly name: string;
  
  /**
   * 工具类型
   */
  readonly type: ToolType;
  
  /**
   * 工具描述
   */
  readonly description: string;
  
  /**
   * 初始化工具
   * 
   * @param context VSCode扩展上下文
   */
  initialize(context: vscode.ExtensionContext): Promise<void>;
  
  /**
   * 执行工具
   * 
   * @param params 参数
   * @returns 执行结果
   */
  execute(params: any): Promise<any>;
  
  /**
   * 销毁工具
   */
  dispose(): void;
}

/**
 * 工具管理器类
 * 
 * 负责管理和提供各种工具给代理使用
 */
export class ToolManager {
  private context: vscode.ExtensionContext;
  private outputChannel: vscode.OutputChannel;
  private tools: Map<string, ITool> = new Map();
  
  /**
   * 构造函数
   * 
   * @param context VSCode扩展上下文
   * @param outputChannel 输出通道
   */
  constructor(context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel) {
    this.context = context;
    this.outputChannel = outputChannel;
    this.initialize();
  }
  
  /**
   * 初始化工具管理器
   */
  private async initialize(): Promise<void> {
    this.outputChannel.appendLine('初始化工具管理器');
    
    // 注册内置工具
    await this.registerBuiltinTools();
  }
  
  /**
   * 注册内置工具
   */
  private async registerBuiltinTools(): Promise<void> {
    // 这里将注册内置工具
    // 例如：代码分析工具、版本控制工具、依赖管理工具等
    
    this.outputChannel.appendLine('注册内置工具');
    
    // 将在后续实现具体工具
  }
  
  /**
   * 注册工具
   * 
   * @param tool 工具
   */
  public registerTool(tool: ITool): void {
    if (this.tools.has(tool.id)) {
      throw new Error(`工具 ${tool.id} 已存在`);
    }
    
    this.tools.set(tool.id, tool);
    this.outputChannel.appendLine(`注册工具: ${tool.name} (${tool.id})`);
  }
  
  /**
   * 获取工具
   * 
   * @param id 工具ID
   * @returns 工具，如果不存在则返回null
   */
  public getTool(id: string): ITool | null {
    return this.tools.get(id) || null;
  }
  
  /**
   * 获取所有工具
   * 
   * @returns 所有工具
   */
  public getAllTools(): ITool[] {
    return Array.from(this.tools.values());
  }
  
  /**
   * 获取指定类型的工具
   * 
   * @param type 工具类型
   * @returns 指定类型的工具
   */
  public getToolsByType(type: ToolType): ITool[] {
    return Array.from(this.tools.values()).filter(tool => tool.type === type);
  }
  
  /**
   * 执行工具
   * 
   * @param id 工具ID
   * @param params 参数
   * @returns 执行结果
   */
  public async executeTool(id: string, params: any): Promise<any> {
    const tool = this.getTool(id);
    if (!tool) {
      throw new Error(`工具 ${id} 不存在`);
    }
    
    try {
      this.outputChannel.appendLine(`执行工具: ${tool.name} (${tool.id})`);
      return await tool.execute(params);
    } catch (error: any) {
      this.outputChannel.appendLine(`工具执行失败: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * 销毁工具
   * 
   * @param id 工具ID
   * @returns 是否成功销毁
   */
  public disposeTool(id: string): boolean {
    const tool = this.getTool(id);
    if (!tool) {
      return false;
    }
    
    tool.dispose();
    this.tools.delete(id);
    this.outputChannel.appendLine(`销毁工具: ${tool.name} (${tool.id})`);
    return true;
  }
  
  /**
   * 销毁所有工具
   */
  public dispose(): void {
    for (const tool of this.tools.values()) {
      tool.dispose();
    }
    
    this.tools.clear();
    this.outputChannel.appendLine('销毁所有工具');
  }
}