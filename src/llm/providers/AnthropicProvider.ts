import { v4 as uuidv4 } from 'uuid';
import { 
  ILLMProvider, 
  LLMProviderType, 
  LLMProviderConfig, 
  LLMQueryOptions, 
  LLMResponse, 
  LLMRequestOptions,
  LLMMessage,
  LLMModelRole
} from '../ILLMProvider';
import * as vscode from 'vscode';
import axios from 'axios';
import { encode } from 'gpt-tokenizer';

/**
 * Anthropic 提供商配置接口
 */
export interface AnthropicProviderConfig extends LLMProviderConfig {
  apiKey: string;
  apiUrl?: string;
  defaultModel: string;
  models: string[];
}

/**
 * Anthropic 提供商类
 * 
 * 实现与 Anthropic API 的集成
 */
export class AnthropicProvider implements ILLMProvider {
  public id: string;
  public name: string;
  public models: string[];
  
  private apiKey: string;
  private apiUrl: string;
  private defaultModel: string;
  private timeout: number;
  
  /**
   * 构造函数
   */
  constructor() {
    this.id = `anthropic-${uuidv4()}`;
    this.name = 'Anthropic';
    this.models = [
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
      'claude-2.1',
      'claude-2.0',
      'claude-instant-1.2'
    ];
    this.apiKey = '';
    this.apiUrl = 'https://api.anthropic.com';
    this.defaultModel = 'claude-3-sonnet-20240229';
    this.timeout = 60000; // 默认超时时间：60秒
  }
  
  /**
   * 初始化 Anthropic 提供商
   * @param config 配置
   */
  public async initialize(config: AnthropicProviderConfig): Promise<void> {
    if (!config.apiKey) {
      throw new Error('Anthropic API 密钥不能为空');
    }
    
    this.apiKey = config.apiKey;
    
    if (config.apiUrl) {
      this.apiUrl = config.apiUrl;
    }
    
    if (config.defaultModel) {
      this.defaultModel = config.defaultModel;
    }
    
    if (config.models && config.models.length > 0) {
      this.models = config.models;
    }
    
    if (config.timeout) {
      this.timeout = config.timeout;
    }
    
    // 验证 API 密钥
    try {
      await this.validateApiKey();
      console.log('Anthropic API 密钥验证成功');
    } catch (error) {
      console.error('Anthropic API 密钥验证失败:', error);
      throw new Error(`Anthropic API 密钥验证失败: ${error}`);
    }
  }
  
  /**
   * 查询 Anthropic
   * @param prompt 提示
   * @param options 选项
   * @returns Anthropic 响应
   */
  public async query(prompt: string, options: LLMQueryOptions): Promise<LLMResponse> {
    const model = options.model || this.defaultModel;
    
    const messages: LLMMessage[] = [
      { role: LLMModelRole.USER, content: prompt }
    ];
    
    const requestOptions: LLMRequestOptions = {
      model,
      messages,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      topP: options.topP,
      frequencyPenalty: options.frequencyPenalty,
      presencePenalty: options.presencePenalty,
      stop: options.stop
    };
    
    return this.sendRequest(requestOptions);
  }
  
  /**
   * 流式查询 Anthropic
   * @param prompt 提示
   * @param options 选项
   * @returns Anthropic 响应流
   */
  public async *streamQuery(prompt: string, options: LLMQueryOptions): AsyncIterator<LLMResponse> {
    const model = options.model || this.defaultModel;
    
    const messages: LLMMessage[] = [
      { role: LLMModelRole.USER, content: prompt }
    ];
    
    const requestOptions: LLMRequestOptions = {
      model,
      messages,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      topP: options.topP,
      frequencyPenalty: options.frequencyPenalty,
      presencePenalty: options.presencePenalty,
      stop: options.stop,
      stream: true
    };
    
    const response = await axios({
      method: 'post',
      url: `${this.apiUrl}/v1/messages`,
      headers: this.getHeaders(),
      data: this.formatRequestData(requestOptions),
      responseType: 'stream',
      timeout: this.timeout
    });
    
    const stream = response.data;
    
    for await (const chunk of this.parseSSE(stream)) {
      if (chunk === '[DONE]') {
        break;
      }
      
      try {
        const data = JSON.parse(chunk);
        
        if (data.type === 'content_block_delta') {
          yield {
            id: data.message_id || uuidv4(),
            model: model,
            content: data.delta?.text || '',
            finishReason: ''
          };
        } else if (data.type === 'message_stop') {
          yield {
            id: data.message_id || uuidv4(),
            model: model,
            content: '',
            finishReason: data.stop_reason || 'stop'
          };
        }
      } catch (error) {
        console.error('解析 Anthropic 流响应失败:', error);
      }
    }
  }
  
  /**
   * 获取可用模型
   * @returns 模型列表
   */
  public getModels(): string[] {
    return this.models;
  }
  
  /**
   * 估算文本的 token 数量
   * @param text 文本
   * @returns token 数量
   */
  public estimateTokens(text: string): number {
    // 使用 GPT tokenizer 作为近似估计
    // 注意：这不是完全准确的，但可以作为估计
    return encode(text).length;
  }
  
  /**
   * 发送请求到 Anthropic API
   * @param options 请求选项
   * @returns Anthropic 响应
   */
  private async sendRequest(options: LLMRequestOptions): Promise<LLMResponse> {
    try {
      const response = await axios({
        method: 'post',
        url: `${this.apiUrl}/v1/messages`,
        headers: this.getHeaders(),
        data: this.formatRequestData(options),
        timeout: options.timeout || this.timeout
      });
      
      const data = response.data;
      
      return {
        id: data.id,
        model: data.model,
        content: data.content && data.content.length > 0 ? 
          data.content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join('') : '',
        finishReason: data.stop_reason || '',
        usage: data.usage ? {
          promptTokens: data.usage.input_tokens,
          completionTokens: data.usage.output_tokens,
          totalTokens: data.usage.input_tokens + data.usage.output_tokens
        } : undefined
      };
    } catch (error: any) {
      console.error('Anthropic 请求失败:', error);
      
      if (error.response) {
        const { status, data } = error.response;
        throw new Error(`Anthropic 请求失败 (${status}): ${JSON.stringify(data)}`);
      }
      
      throw new Error(`Anthropic 请求失败: ${error.message}`);
    }
  }
  
  /**
   * 获取请求头
   * @returns 请求头
   */
  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey,
      'anthropic-version': '2023-06-01'
    };
  }
  
  /**
   * 格式化请求数据
   * @param options 请求选项
   * @returns 格式化的请求数据
   */
  private formatRequestData(options: LLMRequestOptions): any {
    // 将 LLM 消息转换为 Anthropic 消息格式
    const messages = this.convertMessages(options.messages);
    
    const data: any = {
      model: options.model,
      messages: messages,
      max_tokens: options.maxTokens || 1024
    };
    
    if (options.temperature !== undefined) {
      data.temperature = options.temperature;
    }
    
    if (options.topP !== undefined) {
      data.top_p = options.topP;
    }
    
    if (options.stop !== undefined) {
      data.stop_sequences = options.stop;
    }
    
    if (options.stream !== undefined) {
      data.stream = options.stream;
    }
    
    return data;
  }
  
  /**
   * 将 LLM 消息转换为 Anthropic 消息格式
   * @param messages LLM 消息
   * @returns Anthropic 消息
   */
  private convertMessages(messages: LLMMessage[]): any[] {
    const result: any[] = [];
    let systemMessage = '';
    
    // 提取系统消息
    const systemMsgIndex = messages.findIndex(msg => msg.role === LLMModelRole.SYSTEM);
    if (systemMsgIndex !== -1) {
      systemMessage = messages[systemMsgIndex].content;
      messages = [...messages.slice(0, systemMsgIndex), ...messages.slice(systemMsgIndex + 1)];
    }
    
    // 转换其他消息
    for (const msg of messages) {
      if (msg.role === LLMModelRole.USER) {
        result.push({
          role: 'user',
          content: msg.content
        });
      } else if (msg.role === LLMModelRole.ASSISTANT) {
        result.push({
          role: 'assistant',
          content: msg.content
        });
      }
      // 忽略其他角色的消息
    }
    
    // 添加系统消息（如果有）
    if (systemMessage) {
      return [{
        role: 'system',
        content: systemMessage
      }, ...result];
    }
    
    return result;
  }
  
  /**
   * 验证 API 密钥
   */
  private async validateApiKey(): Promise<void> {
    try {
      // Anthropic 没有专门的验证端点，所以我们发送一个简单的请求
      await axios({
        method: 'post',
        url: `${this.apiUrl}/v1/messages`,
        headers: this.getHeaders(),
        data: {
          model: this.defaultModel,
          messages: [{ role: 'user', content: 'Hello' }],
          max_tokens: 10
        },
        timeout: this.timeout
      });
    } catch (error: any) {
      if (error.response && error.response.status === 401) {
        throw new Error('无效的 API 密钥');
      }
      throw error;
    }
  }
  
  /**
   * 解析 SSE 流
   * @param stream 流
   * @returns 解析后的数据
   */
  private async *parseSSE(stream: any): AsyncGenerator<string> {
    let buffer = '';
    
    for await (const chunk of stream) {
      buffer += chunk.toString();
      
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        
        if (!trimmedLine) {
          continue;
        }
        
        if (trimmedLine === 'data: [DONE]') {
          yield '[DONE]';
          continue;
        }
        
        if (trimmedLine.startsWith('data: ')) {
          yield trimmedLine.slice(6);
        }
      }
    }
    
    if (buffer.trim()) {
      if (buffer.trim() === 'data: [DONE]') {
        yield '[DONE]';
      } else if (buffer.trim().startsWith('data: ')) {
        yield buffer.trim().slice(6);
      }
    }
  }
} 