import { ILLMProvider, LLMProviderType, LLMProviderConfig } from './ILLMProvider';
import { OpenAIProvider } from './providers/OpenAIProvider';
import { AnthropicProvider } from './providers/AnthropicProvider';
import { DeepSeekProvider } from './providers/DeepSeekProvider';
import { GeminiProvider } from './providers/GeminiProvider';
import { LocalLLMProvider } from './providers/LocalLLMProvider';

/**
 * LLM提供商工厂类
 * 
 * 负责创建和管理不同的LLM提供商实例
 */
export class LLMProviderFactory {
  private static instance: LLMProviderFactory;
  private providers: Map<LLMProviderType, ILLMProvider>;
  
  /**
   * 构造函数
   */
  private constructor() {
    this.providers = new Map<LLMProviderType, ILLMProvider>();
  }
  
  /**
   * 获取工厂实例
   * 
   * @returns LLM提供商工厂实例
   */
  public static getInstance(): LLMProviderFactory {
    if (!LLMProviderFactory.instance) {
      LLMProviderFactory.instance = new LLMProviderFactory();
    }
    return LLMProviderFactory.instance;
  }
  
  /**
   * 创建LLM提供商
   * 
   * @param type 提供商类型
   * @param config 提供商配置
   * @returns LLM提供商实例
   */
  public async createProvider(type: LLMProviderType, config: LLMProviderConfig): Promise<ILLMProvider> {
    // 检查是否已存在该类型的提供商
    if (this.providers.has(type)) {
      const provider = this.providers.get(type)!;
      await provider.initialize(config);
      return provider;
    }
    
    // 创建新的提供商实例
    let provider: ILLMProvider;
    
    switch (type) {
      case LLMProviderType.OPENAI:
        provider = new OpenAIProvider();
        break;
      case LLMProviderType.ANTHROPIC:
        provider = new AnthropicProvider();
        break;
      case LLMProviderType.DEEPSEEK:
        provider = new DeepSeekProvider();
        break;
      case LLMProviderType.GEMINI:
        provider = new GeminiProvider();
        break;
      case LLMProviderType.LOCAL:
        provider = new LocalLLMProvider();
        break;
      default:
        throw new Error(`不支持的LLM提供商类型: ${type}`);
    }
    
    // 初始化提供商
    await provider.initialize(config);
    
    // 存储提供商实例
    this.providers.set(type, provider);
    
    return provider;
  }
  
  /**
   * 获取LLM提供商
   * 
   * @param type 提供商类型
   * @returns LLM提供商实例，如果不存在则返回undefined
   */
  public getProvider(type: LLMProviderType): ILLMProvider | undefined {
    return this.providers.get(type);
  }
  
  /**
   * 获取所有LLM提供商
   * 
   * @returns LLM提供商实例数组
   */
  public getAllProviders(): ILLMProvider[] {
    return Array.from(this.providers.values());
  }
  
  /**
   * 移除LLM提供商
   * 
   * @param type 提供商类型
   * @returns 是否成功移除
   */
  public removeProvider(type: LLMProviderType): boolean {
    return this.providers.delete(type);
  }
  
  /**
   * 清除所有LLM提供商
   */
  public clearProviders(): void {
    this.providers.clear();
  }
}
