import {
  ILLMProvider,
  LLMProviderType,
  LLMProviderConfig,
  LLMRequestOptions,
  LLMResponse
} from './ILLMProvider';

/**
 * 基础LLM提供商类
 * 
 * 实现ILLMProvider接口的基础类，提供通用功能
 */
export abstract class BaseLLMProvider implements ILLMProvider {
  protected _type: LLMProviderType;
  protected _name: string;
  protected _defaultModel: string;
  protected _models: string[];
  protected _config: LLMProviderConfig;
  protected _activeRequests: Map<string, AbortController> = new Map();
  
  /**
   * 构造函数
   * 
   * @param type 提供商类型
   * @param name 提供商名称
   */
  constructor(type: LLMProviderType, name: string) {
    this._type = type;
    this._name = name;
    this._defaultModel = '';
    this._models = [];
    this._config = {
      type,
      defaultModel: '',
      models: []
    };
  }
  
  /**
   * 获取提供商类型
   */
  public get type(): LLMProviderType {
    return this._type;
  }
  
  /**
   * 获取提供商名称
   */
  public get name(): string {
    return this._name;
  }
  
  /**
   * 获取默认模型
   */
  public get defaultModel(): string {
    return this._defaultModel;
  }
  
  /**
   * 获取可用模型列表
   */
  public get models(): string[] {
    return this._models;
  }
  
  /**
   * 初始化提供商
   * 
   * @param config 提供商配置
   */
  public async initialize(config: LLMProviderConfig): Promise<void> {
    this._config = config;
    this._defaultModel = config.defaultModel;
    this._models = config.models;
    
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
   * 发送请求到LLM
   * 
   * @param options 请求选项
   * @returns LLM响应
   */
  public abstract sendRequest(options: LLMRequestOptions): Promise<LLMResponse>;
  
  /**
   * 发送流式请求到LLM
   * 
   * @param options 请求选项
   * @param callback 回调函数，用于处理流式响应
   * @returns 请求ID
   */
  public abstract sendStreamingRequest(
    options: LLMRequestOptions,
    callback: (chunk: Partial<LLMResponse>, done: boolean) => void
  ): Promise<string>;
  
  /**
   * 取消请求
   * 
   * @param requestId 请求ID
   */
  public cancelRequest(requestId: string): void {
    const controller = this._activeRequests.get(requestId);
    if (controller) {
      controller.abort();
      this._activeRequests.delete(requestId);
    }
  }
  
  /**
   * 获取模型列表
   * 
   * @returns 模型列表
   */
  public async listModels(): Promise<string[]> {
    return this._models;
  }
  
  /**
   * 计算令牌数量
   * 
   * @param text 文本
   * @param model 模型名称
   * @returns 令牌数量
   */
  public abstract countTokens(text: string, model?: string): Promise<number>;
  
  /**
   * 销毁提供商
   */
  public dispose(): void {
    // 取消所有活动请求
    for (const [requestId, controller] of this._activeRequests.entries()) {
      this.cancelRequest(requestId);
    }
    
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
   * 生成请求ID
   * 
   * @returns 请求ID
   */
  protected generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
  
  /**
   * 创建中止控制器
   * 
   * @param requestId 请求ID
   * @returns 中止控制器
   */
  protected createAbortController(requestId: string): AbortController {
    const controller = new AbortController();
    this._activeRequests.set(requestId, controller);
    return controller;
  }
  
  /**
   * 删除中止控制器
   * 
   * @param requestId 请求ID
   */
  protected removeAbortController(requestId: string): void {
    this._activeRequests.delete(requestId);
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
