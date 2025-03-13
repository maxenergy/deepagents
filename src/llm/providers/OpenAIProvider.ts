import axios from 'axios';
import { ILLMProvider, LLMProviderConfig, LLMRequest, LLMResponse } from '../ILLMProvider';

/**
 * OpenAI提供商配置
 */
export interface OpenAIConfig extends LLMProviderConfig {
  apiKey: string;
  model: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

/**
 * OpenAI提供商实现
 */
export class OpenAIProvider implements ILLMProvider {
  private config: OpenAIConfig;
  
  /**
   * 构造函数
   * 
   * @param config OpenAI配置
   */
  constructor(config: OpenAIConfig) {
    this.config = {
      ...config,
      model: config.model || 'gpt-4o',
      baseUrl: config.baseUrl || 'https://api.openai.com/v1',
      temperature: config.temperature ?? 0.7,
      maxTokens: config.maxTokens ?? 2048,
      topP: config.topP ?? 1,
      frequencyPenalty: config.frequencyPenalty ?? 0,
      presencePenalty: config.presencePenalty ?? 0
    };
  }
  
  /**
   * 发送请求到OpenAI API
   * 
   * @param request LLM请求
   * @returns LLM响应
   */
  public async sendRequest(request: LLMRequest): Promise<LLMResponse> {
    try {
      const messages = [
        { role: 'system', content: request.systemPrompt },
        ...request.messages.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        }))
      ];
      
      const response = await axios.post(
        `${this.config.baseUrl}/chat/completions`,
        {
          model: this.config.model,
          messages,
          temperature: this.config.temperature,
          max_tokens: this.config.maxTokens,
          top_p: this.config.topP,
          frequency_penalty: this.config.frequencyPenalty,
          presence_penalty: this.config.presencePenalty,
          stream: false
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey}`
          }
        }
      );
      
      const content = response.data.choices[0].message.content;
      const usage = response.data.usage;
      
      return {
        content,
        usage: {
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens
        },
        raw: response.data
      };
    } catch (error) {
      console.error('OpenAI API请求失败:', error);
      throw new Error(`OpenAI API请求失败: ${error.message}`);
    }
  }
  
  /**
   * 获取提供商名称
   * 
   * @returns 提供商名称
   */
  public getName(): string {
    return 'OpenAI';
  }
  
  /**
   * 获取提供商配置
   * 
   * @returns 提供商配置
   */
  public getConfig(): LLMProviderConfig {
    return this.config;
  }
  
  /**
   * 更新提供商配置
   * 
   * @param config 新的提供商配置
   */
  public updateConfig(config: Partial<OpenAIConfig>): void {
    this.config = {
      ...this.config,
      ...config
    };
  }
} 