import * as vscode from 'vscode';
import { ILLMProvider, LLMProviderConfig, LLMRequest, LLMResponse } from './ILLMProvider';
import { OpenAIProvider, OpenAIConfig } from './providers/OpenAIProvider';
import { AnthropicProvider, AnthropicConfig } from './providers/AnthropicProvider';
import { StorageManager, StorageNamespace } from '../storage/StorageManager';

/**
 * LLM提供商类型
 */
export enum LLMProviderType {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  AZURE_OPENAI = 'azure_openai',
  GEMINI = 'gemini',
  OLLAMA = 'ollama',
  CUSTOM = 'custom'
}

/**
 * 查询选项接口
 */
export interface QueryOptions {
  temperature?: number;
  maxTokens?: number;
  stopSequences?: string[];
  model?: string;
  stream?: boolean;
}

/**
 * LLM 响应接口
 */
export interface LLMResponse {
  text: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  provider: string;
}

/**
 * LLM 响应块接口
 */
export interface LLMResponseChunk {
  text: string;
  isComplete: boolean;
}

/**
 * LLM管理器类
 * 
 * 负责管理和协调不同的LLM提供商，处理LLM请求和响应
 */
export class LLMManager {
  private context: vscode.ExtensionContext;
  private storageManager: StorageManager;
  private providers: Map<string, ILLMProvider> = new Map();
  private defaultProvider: string | null = null;
  
  /**
   * 构造函数
   * 
   * @param context VSCode扩展上下文
   * @param storageManager 存储管理器
   */
  constructor(context: vscode.ExtensionContext, storageManager: StorageManager) {
    this.context = context;
    this.storageManager = storageManager;
    this.initialize();
  }
  
  /**
   * 初始化LLM管理器
   */
  private async initialize(): Promise<void> {
    // 从存储中加载配置
    const llmStorage = this.storageManager.getStorage(StorageNamespace.LLM);
    if (llmStorage) {
      const configs = await llmStorage.getAll();
      
      // 加载默认提供商
      const defaultProviderKey = await llmStorage.get('defaultProvider');
      if (defaultProviderKey) {
        this.defaultProvider = defaultProviderKey as string;
      }
      
      // 初始化提供商
      for (const [key, config] of configs.entries()) {
        if (key === 'defaultProvider') continue;
        
        await this.registerProvider(key, config as LLMProviderConfig);
      }
      
      // 如果没有提供商，注册默认的OpenAI提供商
      if (this.providers.size === 0) {
        const openaiConfig: OpenAIConfig = {
          apiKey: process.env.OPENAI_API_KEY || '',
          model: 'gpt-4o'
        };
        
        await this.registerProvider(LLMProviderType.OPENAI, openaiConfig);
        this.defaultProvider = LLMProviderType.OPENAI;
      }
    }
  }
  
  /**
   * 注册LLM提供商
   * 
   * @param key 提供商键
   * @param config 提供商配置
   */
  public async registerProvider(key: string, config: LLMProviderConfig): Promise<void> {
    let provider: ILLMProvider | null = null;
    
    // 根据类型创建不同的提供商
    switch (key) {
      case LLMProviderType.OPENAI:
        provider = new OpenAIProvider(config as OpenAIConfig);
        break;
        
      case LLMProviderType.ANTHROPIC:
        provider = new AnthropicProvider(config as AnthropicConfig);
        break;
        
      // 其他提供商将在后续实现
      
      default:
        console.warn(`未知的LLM提供商类型: ${key}`);
        return;
    }
    
    if (provider) {
      this.providers.set(key, provider);
      
      // 保存配置到存储
      const llmStorage = this.storageManager.getStorage(StorageNamespace.LLM);
      if (llmStorage) {
        await llmStorage.set(key, config);
      }
      
      // 如果没有默认提供商，设置为默认
      if (!this.defaultProvider) {
        this.defaultProvider = key;
        
        // 保存默认提供商到存储
        if (llmStorage) {
          await llmStorage.set('defaultProvider', key);
        }
      }
    }
  }
  
  /**
   * 获取LLM提供商
   * 
   * @param key 提供商键，如果为空则返回默认提供商
   * @returns LLM提供商
   */
  public getProvider(key?: string): ILLMProvider | null {
    if (key) {
      return this.providers.get(key) || null;
    }
    
    if (this.defaultProvider) {
      return this.providers.get(this.defaultProvider) || null;
    }
    
    return null;
  }
  
  /**
   * 设置默认LLM提供商
   * 
   * @param key 提供商键
   */
  public async setDefaultProvider(key: string): Promise<void> {
    if (this.providers.has(key)) {
      this.defaultProvider = key;
      
      // 保存默认提供商到存储
      const llmStorage = this.storageManager.getStorage(StorageNamespace.LLM);
      if (llmStorage) {
        await llmStorage.set('defaultProvider', key);
      }
    } else {
      throw new Error(`LLM提供商不存在: ${key}`);
    }
  }
  
  /**
   * 发送LLM请求
   * 
   * @param request LLM请求
   * @param providerKey 提供商键，如果为空则使用默认提供商
   * @returns LLM响应
   */
  public async sendRequest(request: LLMRequest, providerKey?: string): Promise<LLMResponse> {
    const provider = this.getProvider(providerKey);
    
    if (!provider) {
      throw new Error('没有可用的LLM提供商');
    }
    
    return await provider.sendRequest(request);
  }
  
  /**
   * 获取所有LLM提供商
   * 
   * @returns LLM提供商映射
   */
  public getAllProviders(): Map<string, ILLMProvider> {
    return this.providers;
  }
  
  /**
   * 获取默认LLM提供商键
   * 
   * @returns 默认提供商键
   */
  public getDefaultProviderKey(): string | null {
    return this.defaultProvider;
  }
  
  /**
   * 更新LLM提供商配置
   * 
   * @param key 提供商键
   * @param config 提供商配置
   */
  public async updateProviderConfig(key: string, config: Partial<LLMProviderConfig>): Promise<void> {
    const provider = this.getProvider(key);
    
    if (!provider) {
      throw new Error(`LLM提供商不存在: ${key}`);
    }
    
    // 更新提供商配置
    provider.updateConfig(config);
    
    // 保存配置到存储
    const llmStorage = this.storageManager.getStorage(StorageNamespace.LLM);
    if (llmStorage) {
      const fullConfig = provider.getConfig();
      await llmStorage.set(key, fullConfig);
    }
  }
  
  /**
   * 删除LLM提供商
   * 
   * @param key 提供商键
   */
  public async removeProvider(key: string): Promise<void> {
    if (this.providers.has(key)) {
      this.providers.delete(key);
      
      // 从存储中删除
      const llmStorage = this.storageManager.getStorage(StorageNamespace.LLM);
      if (llmStorage) {
        await llmStorage.delete(key);
      }
      
      // 如果删除的是默认提供商，重新设置默认提供商
      if (this.defaultProvider === key) {
        if (this.providers.size > 0) {
          this.defaultProvider = Array.from(this.providers.keys())[0];
          
          // 保存默认提供商到存储
          if (llmStorage) {
            await llmStorage.set('defaultProvider', this.defaultProvider);
          }
        } else {
          this.defaultProvider = null;
          
          // 从存储中删除默认提供商
          if (llmStorage) {
            await llmStorage.delete('defaultProvider');
          }
        }
      }
    }
  }

  /**
   * 查询 LLM
   * 
   * @param prompt 提示
   * @param options 查询选项
   * @param providerId 提供商 ID，如果不指定则使用默认提供商
   * @returns LLM 响应
   */
  public async query(prompt: string, options: QueryOptions = {}, providerId?: string): Promise<LLMResponse> {
    const provider = providerId 
      ? this.getProvider(providerId) 
      : this.getDefaultProvider();
    
    if (!provider) {
      throw new Error(`提供商 ${providerId || this.defaultProviderId} 不存在`);
    }
    
    return provider.query(prompt, options);
  }

  /**
   * 流式查询 LLM
   * 
   * @param prompt 提示
   * @param options 查询选项
   * @param providerId 提供商 ID，如果不指定则使用默认提供商
   * @returns LLM 响应流
   */
  public streamQuery(prompt: string, options: QueryOptions = {}, providerId?: string): AsyncIterator<LLMResponseChunk> {
    const provider = providerId 
      ? this.getProvider(providerId) 
      : this.getDefaultProvider();
    
    if (!provider) {
      throw new Error(`提供商 ${providerId || this.defaultProviderId} 不存在`);
    }
    
    return provider.streamQuery(prompt, { ...options, stream: true });
  }
}