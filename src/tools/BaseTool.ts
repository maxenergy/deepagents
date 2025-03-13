import { ITool, ToolType, ToolConfig, ToolParams, ToolResult } from './ITool';

/**
 * 基础工具类
 * 
 * 实现ITool接口的基础类，提供通用功能
 */
export abstract class BaseTool implements ITool {
  protected _type: ToolType;
  protected _name: string;
  protected _description: string;
  protected _enabled: boolean;
  protected _config: ToolConfig;
  
  /**
   * 构造函数
   * 
   * @param type 工具类型
   * @param name 工具名称
   * @param description 工具描述
   */
  constructor(type: ToolType, name: string, description: string) {
    this._type = type;
    this._name = name;
    this._description = description;
    this._enabled = true;
    this._config = {
      type,
      name,
      description,
      enabled: true
    };
  }
  
  /**
   * 获取工具类型
   */
  public get type(): ToolType {
    return this._type;
  }
  
  /**
   * 获取工具名称
   */
  public get name(): string {
    return this._name;
  }
  
  /**
   * 获取工具描述
   */
  public get description(): string {
    return this._description;
  }
  
  /**
   * 获取工具是否启用
   */
  public get enabled(): boolean {
    return this._enabled;
  }
  
  /**
   * 初始化工具
   * 
   * @param config 工具配置
   */
  public async initialize(config: ToolConfig): Promise<void> {
    this._config = {
      ...this._config,
      ...config
    };
    this._enabled = config.enabled;
    
    await this.onInitialize();
  }
  
  /**
   * 初始化回调
   * 
   * 子类可以重写此方法以提供自定义初始化逻辑
   */
  protected async onInitialize(): Promise<void> {
    // 默认实现为空
  }
  
  /**
   * 执行工具
   * 
   * @param params 工具参数
   * @returns 工具执行结果
   */
  public abstract execute(params: ToolParams): Promise<ToolResult>;
  
  /**
   * 获取工具配置
   * 
   * @returns 工具配置
   */
  public getConfig(): ToolConfig {
    return this._config;
  }
  
  /**
   * 更新工具配置
   * 
   * @param config 工具配置
   */
  public updateConfig(config: Partial<ToolConfig>): void {
    this._config = {
      ...this._config,
      ...config
    };
    
    if (config.enabled !== undefined) {
      this._enabled = config.enabled;
    }
  }
  
  /**
   * 启用工具
   */
  public enable(): void {
    this._enabled = true;
    this._config.enabled = true;
  }
  
  /**
   * 禁用工具
   */
  public disable(): void {
    this._enabled = false;
    this._config.enabled = false;
  }
  
  /**
   * 销毁工具
   */
  public dispose(): void {
    this.onDispose();
  }
  
  /**
   * 销毁回调
   * 
   * 子类可以重写此方法以提供自定义销毁逻辑
   */
  protected onDispose(): void {
    // 默认实现为空
  }
  
  /**
   * 获取配置值
   * 
   * @param key 配置键
   * @param defaultValue 默认值
   * @returns 配置值
   */
  protected getConfigValue<T>(key: string, defaultValue?: T): T {
    return this._config[key] !== undefined ? this._config[key] : defaultValue;
  }
}