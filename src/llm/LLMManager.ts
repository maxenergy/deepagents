import { ILLMProvider, LLMQueryOptions, LLMResponse } from './ILLMProvider';

/**
 * LLM 管理器类
 */
export class LLMManager {
  private providers: Map<string, ILLMProvider> = new Map();
  private defaultProviderId: string | null = null;

  /**
   * 构造函数
   */
  constructor() {}

  /**
   * 注册 LLM 提供者
   * @param provider LLM 提供者
   */
  registerProvider(provider: ILLMProvider): void {
    this.providers.set(provider.id, provider);
    
    // 如果是第一个注册的提供者，设为默认
    if (this.providers.size === 1) {
      this.defaultProviderId = provider.id;
    }
  }

  /**
   * 获取 LLM 提供者
   * @param id 提供者 ID
   * @returns LLM 提供者
   */
  getProvider(id: string): ILLMProvider | null {
    return this.providers.get(id) || null;
  }

  /**
   * 获取所有 LLM 提供者
   * @returns 所有 LLM 提供者
   */
  getAllProviders(): ILLMProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * 设置默认 LLM 提供者
   * @param id 提供者 ID
   */
  setDefaultProvider(id: string): void {
    if (!this.providers.has(id)) {
      throw new Error(`Provider with ID ${id} not found`);
    }
    this.defaultProviderId = id;
  }

  /**
   * 获取默认 LLM 提供者
   * @returns 默认 LLM 提供者
   */
  getDefaultProvider(): ILLMProvider | null {
    if (!this.defaultProviderId) {
      return null;
    }
    return this.providers.get(this.defaultProviderId) || null;
  }

  /**
   * 使用默认提供者查询 LLM
   * @param prompt 提示
   * @param options 选项
   * @returns LLM 响应
   */
  async query(prompt: string, options: LLMQueryOptions = {}): Promise<LLMResponse> {
    const provider = this.getDefaultProvider();
    if (!provider) {
      throw new Error('No default LLM provider set');
    }
    return provider.query(prompt, options);
  }

  /**
   * 使用默认提供者流式查询 LLM
   * @param prompt 提示
   * @param options 选项
   * @returns LLM 响应流
   */
  async streamQuery(prompt: string, options: LLMQueryOptions = {}): Promise<AsyncIterator<LLMResponse>> {
    const provider = this.getDefaultProvider();
    if (!provider) {
      throw new Error('No default LLM provider set');
    }
    return provider.streamQuery(prompt, options);
  }
}