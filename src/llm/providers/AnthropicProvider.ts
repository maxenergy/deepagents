import axios from 'axios';
import { ILLMProvider, LLMProviderConfig, LLMRequest, LLMResponse } from '../ILLMProvider';

/**
 * Anthropic提供商配置
 */
export interface AnthropicConfig extends LLMProviderConfig {
  apiKey: string;
  model: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
}

/**
 * Anthropic提供商实现
 */
export class AnthropicProvider implements ILLMProvider {
  private config: AnthropicConfig;
  
  /**
   * 构造函数
   * 
   * @param config Anthropic配置
   */
  constructor(config: AnthropicConfig) {
    this.config = {
      ...config,
      model: config.model || 'claude-3-sonnet-20240229',
      baseUrl: config.baseUrl || 'https://api.anthropic.com/v1',
      temperature: config.temperature ?? 0.7,
      maxTokens: config.maxTokens ?? 2048,
      topP: config.topP ?? 1,
      topK: config.topK ?? 5
    };
  }
  
  /**
   * 发送请求到Anthropic API
   * 
   * @param request LLM请求
   * @returns LLM响应
   */
  public async sendRequest(request: LLMRequest): Promise<LLMResponse> {
    try {
      // 构建消息格式
      let messages = [];
      
      // 添加用户和助手消息
      for (const msg of request.messages) {
        messages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        });
      }
      
      // 确保最后一条消息是用户消息
      if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
        messages.push({
          role: 'user',
          content: '请基于上下文继续'
        });
      }
      
      const response = await axios.post(
        `${this.config.baseUrl}/messages`,
        {
          model: this.config.model,
          messages,
          system: request.systemPrompt,
          temperature: this.config.temperature,
          max_tokens: this.config.maxTokens,
          top_p: this.config.topP,
          top_k: this.config.topK
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.config.apiKey,
            'anthropic-version': '2023-06-01'
          }
        }
      );
      
      const content = response.data.content[0].text;
      
      return {
        content,
        usage: {
          promptTokens: response.data.usage?.input_tokens || 0,
          completionTokens: response.data.usage?.output_tokens || 0,
          totalTokens: (response.data.usage?.input_tokens || 0) + (response.data.usage?.output_tokens || 0)
        },
        raw: response.data
      };
    } catch (error: any) {
      console.error('Anthropic API请求失败:', error);
      throw new Error(`Anthropic API请求失败: ${error.message}`);
    }
  }
  
  /**
   * 获取提供商名称
   * 
   * @returns 提供商名称
   */
  public getName(): string {
    return 'Anthropic';
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
  public updateConfig(config: Partial<AnthropicConfig>): void {
    this.config = {
      ...this.config,
      ...config
    };
  }
} 