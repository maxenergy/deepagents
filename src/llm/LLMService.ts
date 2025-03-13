import { EventEmitter } from 'events';
import { 
  ILLMProvider, 
  LLMProviderType, 
  LLMProviderConfig, 
  LLMRequestOptions, 
  LLMResponse,
  LLMMessage,
  LLMModelRole
} from './ILLMProvider';
import { LLMProviderFactory } from './LLMProviderFactory';

/**
 * LLM服务配置接口
 */
export interface LLMServiceConfig {
  defaultProvider: LLMProviderType;
  providers: Record<LLMProviderType, LLMProviderConfig>;
}

/**
 * LLM服务事件类型
 */
export enum LLMServiceEventType {
  REQUEST_START = 'request_start',
  REQUEST_END = 'request_end',
  REQUEST_ERROR = 'request_error',
  STREAM_START = 'stream_start',
  STREAM_CHUNK = 'stream_chunk',
  STREAM_END = 'stream_end',
  STREAM_ERROR = 'stream_error',
  PROVIDER_CHANGE = 'provider_change'
}

/**
 * LLM服务类
 * 
 * 提供统一的LLM访问接口，管理多个LLM提供商
 */
export class LLMService extends EventEmitter {
  private static instance: LLMService;
  private factory: LLMProviderFactory;
  private config: LLMServiceConfig;
  private activeRequests: Map<string, AbortController>;
  
  /**
   * 构造函数
   */
  private constructor() {
    super();
    this.factory = LLMProviderFactory.getInstance();
    this.activeRequests = new Map<string, AbortController>();
    
    // 默认配置
    this.config = {
      defaultProvider: LLMProviderType.OPENAI,
      providers: {}
    };
  }
  
  /**
   * 获取服务实例
   * 
   * @returns LLM服务实例
   */
  public static getInstance(): LLMService {
    if (!LLMService.instance) {
      LLMService.instance = new LLMService();
    }
    return LLMService.instance;
  }
  
  /**
   * 初始化服务
   * 
   * @param config 服务配置
   */
  public async initialize(config: LLMServiceConfig): Promise<void> {
    this.config = config;
    
    // 初始化所有提供商
    for (const [type, providerConfig] of Object.entries(config.providers)) {
      try {
        await this.factory.createProvider(type as LLMProviderType, providerConfig);
      } catch (error: any) {
        console.error(`初始化LLM提供商失败 [${type}]:`, error);
      }
    }
  }
  
  /**
   * 发送请求到LLM
   * 
   * @param options 请求选项
   * @param providerType 提供商类型，如果未指定则使用默认提供商
   * @returns LLM响应
   */
  public async sendRequest(
    options: LLMRequestOptions,
    providerType?: LLMProviderType
  ): Promise<LLMResponse> {
    const type = providerType || this.config.defaultProvider;
    const provider = this.factory.getProvider(type);
    
    if (!provider) {
      throw new Error(`LLM提供商未找到: ${type}`);
    }
    
    try {
      // 触发请求开始事件
      this.emit(LLMServiceEventType.REQUEST_START, { provider: type, options });
      
      // 发送请求
      const response = await provider.sendRequest(options);
      
      // 触发请求结束事件
      this.emit(LLMServiceEventType.REQUEST_END, { provider: type, options, response });
      
      return response;
    } catch (error: any) {
      // 触发请求错误事件
      this.emit(LLMServiceEventType.REQUEST_ERROR, { provider: type, options, error });
      throw error;
    }
  }
  
  /**
   * 发送流式请求到LLM
   * 
   * @param options 请求选项
   * @param callback 回调函数，用于处理流式响应
   * @param providerType 提供商类型，如果未指定则使用默认提供商
   * @returns 请求ID
   */
  public async sendStreamingRequest(
    options: LLMRequestOptions,
    callback: (chunk: Partial<LLMResponse>, done: boolean) => void,
    providerType?: LLMProviderType
  ): Promise<string> {
    const type = providerType || this.config.defaultProvider;
    const provider = this.factory.getProvider(type);
    
    if (!provider) {
      throw new Error(`LLM提供商未找到: ${type}`);
    }
    
    try {
      // 触发流开始事件
      this.emit(LLMServiceEventType.STREAM_START, { provider: type, options });
      
      // 创建包装回调
      const wrappedCallback = (chunk: Partial<LLMResponse>, done: boolean) => {
        if (done) {
          // 触发流结束事件
          this.emit(LLMServiceEventType.STREAM_END, { provider: type, options, response: chunk });
        } else {
          // 触发流块事件
          this.emit(LLMServiceEventType.STREAM_CHUNK, { provider: type, options, chunk });
        }
        
        // 调用原始回调
        callback(chunk, done);
      };
      
      // 发送流式请求
      const requestId = await provider.sendStreamingRequest(options, wrappedCallback);
      
      return requestId;
    } catch (error: any) {
      // 触发流错误事件
      this.emit(LLMServiceEventType.STREAM_ERROR, { provider: type, options, error });
      throw error;
    }
  }
  
  /**
   * 取消请求
   * 
   * @param requestId 请求ID
   * @returns 是否成功取消
   */
  public cancelRequest(requestId: string): boolean {
    const controller = this.activeRequests.get(requestId);
    if (controller) {
      controller.abort();
      this.activeRequests.delete(requestId);
      return true;
    }
    return false;
  }
  
  /**
   * 获取当前活跃的提供商
   * 
   * @returns 当前活跃的提供商类型
   */
  public getActiveProvider(): LLMProviderType {
    return this.config.defaultProvider;
  }
  
  /**
   * 设置默认提供商
   * 
   * @param type 提供商类型
   */
  public setDefaultProvider(type: LLMProviderType): void {
    if (this.factory.getProvider(type)) {
      this.config.defaultProvider = type;
      this.emit(LLMServiceEventType.PROVIDER_CHANGE, { provider: type });
    } else {
      throw new Error(`LLM提供商未初始化: ${type}`);
    }
  }
  
  /**
   * 获取所有可用的提供商
   * 
   * @returns 提供商类型数组
   */
  public getAvailableProviders(): LLMProviderType[] {
    return this.factory.getAllProviders().map(provider => provider.getType());
  }
  
  /**
   * 获取提供商配置
   * 
   * @param type 提供商类型
   * @returns 提供商配置
   */
  public getProviderConfig(type: LLMProviderType): LLMProviderConfig | undefined {
    return this.config.providers[type];
  }
  
  /**
   * 更新提供商配置
   * 
   * @param type 提供商类型
   * @param config 提供商配置
   */
  public async updateProviderConfig(type: LLMProviderType, config: LLMProviderConfig): Promise<void> {
    this.config.providers[type] = config;
    
    const provider = this.factory.getProvider(type);
    if (provider) {
      await provider.initialize(config);
    } else {
      await this.factory.createProvider(type, config);
    }
    
    this.emit(LLMServiceEventType.PROVIDER_CHANGE, { provider: type });
  }
  
  /**
   * 创建系统消息
   * 
   * @param content 消息内容
   * @returns 系统消息
   */
  public createSystemMessage(content: string): LLMMessage {
    return {
      role: LLMModelRole.SYSTEM,
      content
    };
  }
  
  /**
   * 创建用户消息
   * 
   * @param content 消息内容
   * @returns 用户消息
   */
  public createUserMessage(content: string): LLMMessage {
    return {
      role: LLMModelRole.USER,
      content
    };
  }
  
  /**
   * 创建助手消息
   * 
   * @param content 消息内容
   * @returns 助手消息
   */
  public createAssistantMessage(content: string): LLMMessage {
    return {
      role: LLMModelRole.ASSISTANT,
      content
    };
  }
  
  /**
   * 计算令牌数量
   * 
   * @param text 文本
   * @param model 模型名称
   * @param providerType 提供商类型，如果未指定则使用默认提供商
   * @returns 令牌数量
   */
  public async countTokens(
    text: string,
    model?: string,
    providerType?: LLMProviderType
  ): Promise<number> {
    const type = providerType || this.config.defaultProvider;
    const provider = this.factory.getProvider(type);
    
    if (!provider) {
      throw new Error(`LLM提供商未找到: ${type}`);
    }
    
    return provider.countTokens(text, model);
  }
}
