import { ILLMProvider, LLMProviderType, LLMProviderConfig } from './ILLMProvider';
import { OpenAIProvider } from './providers/OpenAIProvider';
import { AnthropicProvider } from './providers/AnthropicProvider';
import * as vscode from 'vscode';

/**
 * LLM 提供商工厂类
 * 
 * 负责创建和管理不同的 LLM 提供商实例
 */
export class LLMProviderFactory {
  private static instance: LLMProviderFactory;
  private providers: Map<string, ILLMProvider> = new Map();
  
  /**
   * 私有构造函数，防止直接实例化
   */
  private constructor() {}
  
  /**
   * 获取单例实例
   * @returns LLM 提供商工厂实例
   */
  public static getInstance(): LLMProviderFactory {
    if (!LLMProviderFactory.instance) {
      LLMProviderFactory.instance = new LLMProviderFactory();
    }
    return LLMProviderFactory.instance;
  }
  
  /**
   * 创建 LLM 提供商
   * @param type 提供商类型
   * @param config 提供商配置
   * @returns LLM 提供商实例
   */
  public async createProvider(type: LLMProviderType, config: LLMProviderConfig): Promise<ILLMProvider> {
    let provider: ILLMProvider;
    
    switch (type) {
      case LLMProviderType.OPENAI:
        provider = new OpenAIProvider();
        break;
      case LLMProviderType.ANTHROPIC:
        provider = new AnthropicProvider();
        break;
      case LLMProviderType.AZURE_OPENAI:
        // TODO: 实现 Azure OpenAI 提供商
        throw new Error('Azure OpenAI 提供商尚未实现');
      case LLMProviderType.DEEPSEEK:
        // TODO: 实现 DeepSeek 提供商
        throw new Error('DeepSeek 提供商尚未实现');
      case LLMProviderType.GEMINI:
        // TODO: 实现 Gemini 提供商
        throw new Error('Gemini 提供商尚未实现');
      case LLMProviderType.LOCAL:
        // TODO: 实现本地 LLM 提供商
        throw new Error('本地 LLM 提供商尚未实现');
      case LLMProviderType.CUSTOM:
        // TODO: 实现自定义 LLM 提供商
        throw new Error('自定义 LLM 提供商尚未实现');
      default:
        throw new Error(`不支持的 LLM 提供商类型: ${type}`);
    }
    
    await provider.initialize(config);
    this.providers.set(provider.id, provider);
    
    return provider;
  }
  
  /**
   * 获取 LLM 提供商
   * @param id 提供商 ID
   * @returns LLM 提供商实例
   */
  public getProvider(id: string): ILLMProvider | undefined {
    return this.providers.get(id);
  }
  
  /**
   * 获取所有 LLM 提供商
   * @returns LLM 提供商实例列表
   */
  public getAllProviders(): ILLMProvider[] {
    return Array.from(this.providers.values());
  }
  
  /**
   * 获取指定类型的所有 LLM 提供商
   * @param type 提供商类型
   * @returns LLM 提供商实例列表
   */
  public getProvidersByType(type: LLMProviderType): ILLMProvider[] {
    return this.getAllProviders().filter(provider => {
      // 根据提供商的类名判断类型
      switch (type) {
        case LLMProviderType.OPENAI:
          return provider instanceof OpenAIProvider;
        case LLMProviderType.ANTHROPIC:
          return provider instanceof AnthropicProvider;
        // 其他类型的判断将在实现相应提供商后添加
        default:
          return false;
      }
    });
  }
  
  /**
   * 移除 LLM 提供商
   * @param id 提供商 ID
   * @returns 是否成功移除
   */
  public removeProvider(id: string): boolean {
    return this.providers.delete(id);
  }
  
  /**
   * 清除所有 LLM 提供商
   */
  public clearProviders(): void {
    this.providers.clear();
  }
}
