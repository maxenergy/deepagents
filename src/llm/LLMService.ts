import { EventEmitter } from 'events';
import { 
  ILLMProvider, 
  LLMProviderType, 
  LLMProviderConfig, 
  LLMRequestOptions, 
  LLMResponse,
  LLMMessage,
  LLMModelRole,
  LLMQueryOptions
} from './ILLMProvider';
import { LLMProviderFactory } from './LLMProviderFactory';
import { OpenAIProvider } from './providers/OpenAIProvider';
import { AnthropicProvider } from './providers/AnthropicProvider';
import * as vscode from 'vscode';
import { v4 as uuidv4 } from 'uuid';

/**
 * LLM 服务配置接口
 */
export interface LLMServiceConfig {
  defaultProvider: LLMProviderType;
  providers: Record<LLMProviderType, LLMProviderConfig>;
}

/**
 * LLM 服务事件类型
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
 * LLM 服务类
 * 
 * 提供统一的 LLM 访问接口，管理多个 LLM 提供商
 */
export class LLMService extends EventEmitter {
  private static instance: LLMService;
  private factory: LLMProviderFactory;
  private config: LLMServiceConfig;
  private defaultProviderId?: string;
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
      providers: {
        [LLMProviderType.OPENAI]: {
          type: LLMProviderType.OPENAI,
          defaultModel: 'gpt-4o',
          models: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo']
        },
        [LLMProviderType.ANTHROPIC]: {
          type: LLMProviderType.ANTHROPIC,
          defaultModel: 'claude-3-sonnet-20240229',
          models: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307']
        },
        [LLMProviderType.AZURE_OPENAI]: {
          type: LLMProviderType.AZURE_OPENAI,
          defaultModel: 'gpt-4o',
          models: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo']
        },
        [LLMProviderType.DEEPSEEK]: {
          type: LLMProviderType.DEEPSEEK,
          defaultModel: 'deepseek-chat',
          models: ['deepseek-chat']
        },
        [LLMProviderType.GEMINI]: {
          type: LLMProviderType.GEMINI,
          defaultModel: 'gemini-pro',
          models: ['gemini-pro', 'gemini-pro-vision']
        },
        [LLMProviderType.LOCAL]: {
          type: LLMProviderType.LOCAL,
          defaultModel: 'local-model',
          models: ['local-model']
        },
        [LLMProviderType.CUSTOM]: {
          type: LLMProviderType.CUSTOM,
          defaultModel: 'custom-model',
          models: ['custom-model']
        }
      }
    };
  }
  
  /**
   * 获取服务实例
   * 
   * @returns LLM 服务实例
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
    for (const [typeStr, providerConfig] of Object.entries(config.providers)) {
      try {
        const type = typeStr as LLMProviderType;
        const provider = await this.factory.createProvider(type, providerConfig);
        
        // 如果是默认提供商，保存其 ID
        if (type === config.defaultProvider) {
          this.defaultProviderId = provider.id;
        }
      } catch (error: any) {
        console.error(`初始化 LLM 提供商失败 [${typeStr}]:`, error);
      }
    }
  }
  
  /**
   * 发送请求到 LLM
   * 
   * @param options 请求选项
   * @param providerType 提供商类型，如果未指定则使用默认提供商
   * @returns LLM 响应
   */
  public async sendRequest(
    options: LLMRequestOptions,
    providerType?: LLMProviderType
  ): Promise<LLMResponse> {
    // 获取提供商
    let provider: ILLMProvider | undefined;
    
    if (providerType) {
      // 如果指定了提供商类型，获取该类型的第一个提供商
      const providers = this.factory.getProvidersByType(providerType);
      provider = providers.length > 0 ? providers[0] : undefined;
    } else if (this.defaultProviderId) {
      // 如果有默认提供商 ID，使用该提供商
      provider = this.factory.getProvider(this.defaultProviderId);
    }
    
    if (!provider) {
      throw new Error(`LLM 提供商未找到: ${providerType || this.config.defaultProvider}`);
    }
    
    const requestId = uuidv4();
    const controller = new AbortController();
    this.activeRequests.set(requestId, controller);
    
    try {
      // 触发请求开始事件
      this.emit(LLMServiceEventType.REQUEST_START, { 
        requestId, 
        provider: provider.name, 
        options 
      });
      
      // 创建查询选项
      const queryOptions: LLMQueryOptions = {
        model: options.model,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        topP: options.topP,
        frequencyPenalty: options.frequencyPenalty,
        presencePenalty: options.presencePenalty,
        stop: options.stop
      };
      
      // 构建提示
      const prompt = this.buildPromptFromMessages(options.messages);
      
      // 发送请求
      const response = await provider.query(prompt, queryOptions);
      
      // 触发请求结束事件
      this.emit(LLMServiceEventType.REQUEST_END, { 
        requestId, 
        provider: provider.name, 
        options, 
        response 
      });
      
      return response;
    } catch (error: any) {
      // 触发请求错误事件
      this.emit(LLMServiceEventType.REQUEST_ERROR, { 
        requestId, 
        provider: provider.name, 
        options, 
        error 
      });
      throw error;
    } finally {
      this.activeRequests.delete(requestId);
    }
  }
  
  /**
   * 发送流式请求到 LLM
   * 
   * @param options 请求选项
   * @param callback 回调函数，用于处理流式响应
   * @param providerType 提供商类型，如果未指定则使用默认提供商
   * @returns 请求 ID
   */
  public async sendStreamingRequest(
    options: LLMRequestOptions,
    callback: (chunk: Partial<LLMResponse>, done: boolean) => void,
    providerType?: LLMProviderType
  ): Promise<string> {
    // 获取提供商
    let provider: ILLMProvider | undefined;
    
    if (providerType) {
      // 如果指定了提供商类型，获取该类型的第一个提供商
      const providers = this.factory.getProvidersByType(providerType);
      provider = providers.length > 0 ? providers[0] : undefined;
    } else if (this.defaultProviderId) {
      // 如果有默认提供商 ID，使用该提供商
      provider = this.factory.getProvider(this.defaultProviderId);
    }
    
    if (!provider) {
      throw new Error(`LLM 提供商未找到: ${providerType || this.config.defaultProvider}`);
    }
    
    const requestId = uuidv4();
    const controller = new AbortController();
    this.activeRequests.set(requestId, controller);
    
    try {
      // 触发流开始事件
      this.emit(LLMServiceEventType.STREAM_START, { 
        requestId, 
        provider: provider.name, 
        options 
      });
      
      // 创建查询选项
      const queryOptions: LLMQueryOptions = {
        model: options.model,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        topP: options.topP,
        frequencyPenalty: options.frequencyPenalty,
        presencePenalty: options.presencePenalty,
        stop: options.stop
      };
      
      // 构建提示
      const prompt = this.buildPromptFromMessages(options.messages);
      
      // 获取流迭代器
      const stream = provider.streamQuery(prompt, queryOptions);
      
      // 处理流
      (async () => {
        try {
          let result: IteratorResult<LLMResponse>;
          
          do {
            result = await stream.next();
            
            if (!result.done) {
              // 触发流块事件
              this.emit(LLMServiceEventType.STREAM_CHUNK, { 
                requestId, 
                provider: provider!.name, 
                chunk: result.value 
              });
              
              // 调用回调
              callback(result.value, false);
            }
          } while (!result.done && !controller.signal.aborted);
          
          if (!controller.signal.aborted) {
            // 触发流结束事件
            this.emit(LLMServiceEventType.STREAM_END, { 
              requestId, 
              provider: provider!.name 
            });
            
            // 调用回调，表示完成
            callback({ finishReason: 'stop' }, true);
          }
        } catch (error: any) {
          if (!controller.signal.aborted) {
            // 触发流错误事件
            this.emit(LLMServiceEventType.STREAM_ERROR, { 
              requestId, 
              provider: provider!.name, 
              error 
            });
            
            // 调用回调，表示错误
            callback({ finishReason: 'error' }, true);
          }
        } finally {
          this.activeRequests.delete(requestId);
        }
      })();
      
      return requestId;
    } catch (error: any) {
      this.activeRequests.delete(requestId);
      
      // 触发流错误事件
      this.emit(LLMServiceEventType.STREAM_ERROR, { 
        requestId, 
        provider: provider.name, 
        error 
      });
      
      throw error;
    }
  }
  
  /**
   * 取消请求
   * 
   * @param requestId 请求 ID
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
  public async setDefaultProvider(type: LLMProviderType): Promise<void> {
    const providers = this.factory.getProvidersByType(type);
    
    if (providers.length > 0) {
      this.config.defaultProvider = type;
      this.defaultProviderId = providers[0].id;
      this.emit(LLMServiceEventType.PROVIDER_CHANGE, { provider: type });
    } else {
      // 如果没有该类型的提供商，尝试创建一个
      if (this.config.providers[type]) {
        const provider = await this.factory.createProvider(type, this.config.providers[type]);
        this.config.defaultProvider = type;
        this.defaultProviderId = provider.id;
        this.emit(LLMServiceEventType.PROVIDER_CHANGE, { provider: type });
      } else {
        throw new Error(`LLM 提供商未初始化: ${type}`);
      }
    }
  }
  
  /**
   * 获取所有可用的提供商
   * 
   * @returns 提供商类型数组
   */
  public getAvailableProviders(): LLMProviderType[] {
    const providers = this.factory.getAllProviders();
    const types = new Set<LLMProviderType>();
    
    // 根据提供商实例类型判断
    for (const provider of providers) {
      if (provider instanceof OpenAIProvider) {
        types.add(LLMProviderType.OPENAI);
      } else if (provider instanceof AnthropicProvider) {
        types.add(LLMProviderType.ANTHROPIC);
      }
      // 其他类型的判断将在实现相应提供商后添加
    }
    
    return Array.from(types);
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
    
    // 获取该类型的所有提供商
    const providers = this.factory.getProvidersByType(type);
    
    if (providers.length > 0) {
      // 更新所有该类型的提供商
      for (const provider of providers) {
        await provider.initialize(config);
      }
    } else {
      // 如果没有该类型的提供商，创建一个
      await this.factory.createProvider(type, config);
    }
    
    this.emit(LLMServiceEventType.PROVIDER_CHANGE, { provider: type });
  }
  
  /**
   * 估算文本的 token 数量
   * 
   * @param text 文本
   * @param model 模型名称
   * @returns token 数量
   */
  public estimateTokens(text: string, model?: string): number {
    // 使用默认提供商估算 token 数量
    const provider = this.defaultProviderId ? 
      this.factory.getProvider(this.defaultProviderId) : 
      this.factory.getAllProviders()[0];
    
    if (!provider) {
      // 简单估算：每个单词约 1.3 个 token
      const words = text.split(/\s+/).length;
      return Math.ceil(words * 1.3);
    }
    
    return provider.estimateTokens(text);
  }
  
  /**
   * 从消息数组构建提示
   * 
   * @param messages 消息数组
   * @returns 提示字符串
   */
  private buildPromptFromMessages(messages: LLMMessage[]): string {
    // 简单实现：将所有消息连接起来
    // 注意：实际应用中可能需要更复杂的处理
    return messages.map(msg => {
      if (msg.role === LLMModelRole.SYSTEM) {
        return `系统: ${msg.content}`;
      } else if (msg.role === LLMModelRole.USER) {
        return `用户: ${msg.content}`;
      } else if (msg.role === LLMModelRole.ASSISTANT) {
        return `助手: ${msg.content}`;
      } else {
        return msg.content;
      }
    }).join('\n\n');
  }
}
