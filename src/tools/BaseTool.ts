import * as vscode from 'vscode';
import { ITool, ToolType } from './ToolManager';

/**
 * 基础工具类
 * 
 * 实现ITool接口的基础类，提供通用功能
 */
export abstract class BaseTool implements ITool {
  protected _id: string;
  protected _name: string;
  protected _type: ToolType;
  protected _description: string;
  protected _context: vscode.ExtensionContext;
  protected _initialized: boolean = false;
  
  /**
   * 构造函数
   * 
   * @param id 工具ID
   * @param name 工具名称
   * @param type 工具类型
   * @param description 工具描述
   */
  constructor(id: string, name: string, type: ToolType, description: string) {
    this._id = id;
    this._name = name;
    this._type = type;
    this._description = description;
  }
  
  /**
   * 获取工具ID
   */
  public get id(): string {
    return this._id;
  }
  
  /**
   * 获取工具名称
   */
  public get name(): string {
    return this._name;
  }
  
  /**
   * 获取工具类型
   */
  public get type(): ToolType {
    return this._type;
  }
  
  /**
   * 获取工具描述
   */
  public get description(): string {
    return this._description;
  }
  
  /**
   * 初始化工具
   * 
   * @param context VSCode扩展上下文
   */
  public async initialize(context: vscode.ExtensionContext): Promise<void> {
    this._context = context;
    this._initialized = true;
    
    // 调用子类的初始化方法
    await this.onInitialize();
  }
  
  /**
   * 子类初始化回调
   * 
   * 子类可以重写此方法以实现自定义初始化逻辑
   */
  protected async onInitialize(): Promise<void> {
    // 默认实现为空
  }
  
  /**
   * 执行工具
   * 
   * @param params 参数
   * @returns 执行结果
   */
  public async execute(params: any): Promise<any> {
    if (!this._initialized) {
      throw new Error(`工具 ${this._name} 未初始化`);
    }
    
    return this.onExecute(params);
  }
  
  /**
   * 子类执行回调
   * 
   * 子类必须实现此方法以提供具体的执行逻辑
   * 
   * @param params 参数
   * @returns 执行结果
   */
  protected abstract onExecute(params: any): Promise<any>;
  
  /**
   * 销毁工具
   */
  public dispose(): void {
    this._initialized = false;
    
    // 调用子类的销毁方法
    this.onDispose();
  }
  
  /**
   * 子类销毁回调
   * 
   * 子类可以重写此方法以实现自定义销毁逻辑
   */
  protected onDispose(): void {
    // 默认实现为空
  }
}