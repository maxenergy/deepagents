import * as vscode from 'vscode';
import { StorageManager, StorageNamespace } from '../storage/StorageManager';

/**
 * LLM 提供商枚举
 */
export enum LLMProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  DEEPSEEK = 'deepseek',
  GEMINI = 'gemini',
  LOCAL = 'local'
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
 * LLM 提供商接口
 */
export interface ILLMProvider {
  id: string;
  name: string;
  models: string[];
  
  initialize(config: any): Promise<void>;
  query(prompt: string, options: QueryOptions): Promise<LLMResponse>;
  streamQuery(prompt: string, options: QueryOptions): AsyncIterator<LLMResponseChunk>;
  getModels(): string[];
  estimateTokens(text: string): number;
}

/**
 * LLM 管理器类
 * 
 * 负责管理 LLM 提供商和处理查询
 */
export class LLMManager {
  private context: vscode.ExtensionContext;
  private storageManager: StorageManager;
  private providers: Map<string, ILLMProvider> = new Map();
  private defaultProviderId: string = LLMProvider.OPENAI;

  /**
   * 构造函数
   * 
   * @param context VSCode 扩展上下文
   * @param storageManager 存储管理器
   */
  constructor(context: vscode.ExtensionContext, storageManager: StorageManager) {
    this.context = context;
    this.storageManager = storageManager;
    this.initialize();
  }

  /**
   * 初始化 LLM 管理器
   */
  private async initialize(): Promise<void> {
    // 加载配置
    const settings = this.storageManager.getStorage(StorageNamespace.SETTINGS);
    if (settings) {
      const defaultProvider = await settings.get<string>('defaultLLMProvider');
      if (defaultProvider) {
        this.defaultProviderId = defaultProvider;
      }
    }

    // 注册默认提供商
    this.registerDefaultProviders();
  }

  /**
   * 注册默认提供商
   */
  private registerDefaultProviders(): void {
    // 这里将在后续实现具体的提供商
    // 目前只是占位符
    console.log('注册默认 LLM 提供商');
  }

  /**
   * 注册提供商
   * 
   * @param provider LLM 提供商
   */
  public registerProvider(provider: ILLMProvider): void {
    this.providers.set(provider.id, provider);
  }

  /**
   * 获取提供商
   * 
   * @param id 提供商 ID
   * @returns LLM 提供商，如果不存在则返回 null
   */
  public getProvider(id: string): ILLMProvider | null {
    return this.providers.get(id) || null;
  }

  /**
   * 获取所有提供商
   * 
   * @returns 所有 LLM 提供商
   */
  public getAllProviders(): ILLMProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * 设置默认提供商
   * 
   * @param id 提供商 ID
   */
  public async setDefaultProvider(id: string): Promise<void> {
    if (this.providers.has(id)) {
      this.defaultProviderId = id;
      
      // 保存设置
      const settings = this.storageManager.getStorage(StorageNamespace.SETTINGS);
      if (settings) {
        await settings.set('defaultLLMProvider', id);
      }
    } else {
      throw new Error(`提供商 ${id} 不存在`);
    }
  }

  /**
   * 获取默认提供商
   * 
   * @returns 默认 LLM 提供商
   */
  public getDefaultProvider(): ILLMProvider {
    const provider = this.providers.get(this.defaultProviderId);
    if (!provider) {
      throw new Error(`默认提供商 ${this.defaultProviderId} 不存在`);
    }
    return provider;
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