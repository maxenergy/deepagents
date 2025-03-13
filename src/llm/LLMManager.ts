import * as vscode from 'vscode';
import {
  ILLMProvider,
  LLMProviderType,
  LLMProviderConfig,
  LLMRequestOptions,
  LLMResponse
} from './ILLMProvider';
import { StorageManager, StorageNamespace } from '../storage/StorageManager';

/**
 * LLM管理器类
 * 
 * 负责管理和协调LLM提供商，处理LLM请求
 */
export class LLMManager {
  private context: vscode.ExtensionContext;
  private storageManager: StorageManager;
  private providers: Map<LLMProviderType, ILLMProvider> = new Map();
  private activeProvider: LLMProviderType | null = null;
  private eventEmitter: vscode.EventEmitter<any> = new vscode.EventEmitter<any>();
  
  /**
   * LLM响应事件
   */
  public readonly onLLMResponse: vscode.Event<any> = this.eventEmitter.event;
  
  /**
   * 构造函数
   * 
   * @param context VSCode扩展上下文
   * @param storageManager 存储管理器
   */
  constructor(context: vscode.ExtensionContext, storageManager: StorageManager) {
    this.context = context;
    this.storageManager = storageManager;
  }
  
  /**
   * 初始化LLM管理器
   */
  public async initialize(): Promise<void> {
    // 加载配置
    await this.loadConfig();
  }
  
  /**
   * 加载配置
   */
  private async loadConfig(): Promise<void> {
    // 从存储中加载配置
    const config = await this.storageManager.get<{
      activeProvider: LLMProviderType | null;
      providers: Record<string, LLMProviderConfig>;
    }>(StorageNamespace.SETTINGS, 'llm', {
      activeProvider: null,
      providers: {}
    });
    
    // 设置活动提供商
    this.activeProvider = config.activeProvider;
  }
  
  /**
   * 保存配置
   */
  private async saveConfig(): Promise<void> {
    // 构建配置对象
    const providerConfigs: Record<string, LLMProviderConfig> = {};
    for (const [type, provider] of this.providers.entries()) {
      providerConfigs[type] = {
        type,
        defaultModel: provider.defaultModel,
        models: provider.models
      };
    }
    
    // 保存到存储
    await this.storageManager.set(StorageNamespace.SETTINGS, 'llm', {
      activeProvider: this.activeProvider,
      providers: providerConfigs
    });
  }
  
  /**
   * 注册提供商
   * 
   * @param provider LLM提供商
   * @param config 提供商配置
   */
  public async registerProvider(provider: ILLMProvider, config: LLMProviderConfig): Promise<void> {
    // 初始化提供商
    await provider.initialize(config);
    
    // 注册提供商
    this.providers.set(provider.type, provider);
    
    // 如果没有活动提供商，则设置为活动提供商
    if (this.activeProvider === null) {
      this.activeProvider = provider.type;
    }
    
    // 保存配置
    await this.saveConfig();
  }
  
  /**
   * 获取提供商
   * 
   * @param type 提供商类型
   * @returns LLM提供商，如果不存在则返回null
   */
  public getProvider(type: LLMProviderType): ILLMProvider | null {
    return this.providers.get(type) || null;
  }
  
  /**
   * 获取活动提供商
   * 
   * @returns 活动LLM提供商，如果不存在则返回null
   */
  public getActiveProvider(): ILLMProvider | null {
    if (this.activeProvider === null) {
      return null;
    }
    
    return this.getProvider(this.activeProvider);
  }
  
  /**
   * 设置活动提供商
   * 
   * @param type 提供商类型
   */
  public async setActiveProvider(type: LLMProviderType): Promise<void> {
    if (!this.providers.has(type)) {
      throw new Error(`提供商不存在: ${type}`);
    }
    
    this.activeProvider = type;
    
    // 保存配置
    await this.saveConfig();
  }
  
  /**
   * 获取所有提供商
   * 
   * @returns 所有LLM提供商
   */
  public getAllProviders(): ILLMProvider[] {
    return Array.from(this.providers.values());
  }
  
  /**
   * 发送请求到活动LLM提供商
   * 
   * @param options 请求选项
   * @returns LLM响应
   */
  public async sendRequest(options: LLMRequestOptions): Promise<LLMResponse> {
    const provider = this.getActiveProvider();
    if (!provider) {
      throw new Error('没有活动的LLM提供商');
    }
    
    // 发送请求
    const response = await provider.sendRequest(options);
    
    // 触发事件
    this.eventEmitter.fire({
      type: 'response',
      provider: provider.type,
      response
    });
    
    return response;
  }
  
  /**
   * 发送流式请求到活动LLM提供商
   * 
   * @param options 请求选项
   * @param callback 回调函数，用于处理流式响应
   * @returns 请求ID
   */
  public async sendStreamingRequest(
    options: LLMRequestOptions,
    callback: (chunk: Partial<LLMResponse>, done: boolean) => void
  ): Promise<string> {
    const provider = this.getActiveProvider();
    if (!provider) {
      throw new Error('没有活动的LLM提供商');
    }
    
    // 包装回调函数，以便触发事件
    const wrappedCallback = (chunk: Partial<LLMResponse>, done: boolean) => {
      // 触发事件
      this.eventEmitter.fire({
        type: 'streamResponse',
        provider: provider.type,
        chunk,
        done
      });
      
      // 调用原始回调
      callback(chunk, done);
    };
    
    // 发送流式请求
    return provider.sendStreamingRequest(options, wrappedCallback);
  }
  
  /**
   * 取消请求
   * 
   * @param requestId 请求ID
   */
  public cancelRequest(requestId: string): void {
    const provider = this.getActiveProvider();
    if (!provider) {
      return;
    }
    
    provider.cancelRequest(requestId);
  }
  
  /**
   * 计算令牌数量
   * 
   * @param text 文本
   * @param model 模型名称
   * @returns 令牌数量
   */
  public async countTokens(text: string, model?: string): Promise<number> {
    const provider = this.getActiveProvider();
    if (!provider) {
      throw new Error('没有活动的LLM提供商');
    }
    
    return provider.countTokens(text, model);
  }
  
  /**
   * 销毁LLM管理器
   */
  public dispose(): void {
    // 销毁所有提供商
    for (const provider of this.providers.values()) {
      provider.dispose();
    }
    
    this.providers.clear();
    this.activeProvider = null;
  }
}