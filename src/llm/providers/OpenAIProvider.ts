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
 * OpenAI 提供商配置接口
 */
export interface OpenAIProviderConfig extends LLMProviderConfig {
  apiKey: string;
  apiUrl?: string;
  organization?: string;
  defaultModel: string;
  models: string[];
}

/**
 * OpenAI 提供商类
 * 
 * 实现与 OpenAI API 的集成
 */
export class OpenAIProvider implements ILLMProvider {
  public id: string;
  public name: string;
  public models: string[];
  
  private apiKey: string;
  private apiUrl: string;
  private organization?: string;
  private defaultModel: string;
  private timeout: number;
  
  /**
   * 构造函数
   */
  constructor() {
    this.id = `openai-${uuidv4()}`;
    this.name = 'OpenAI';
    this.models = [
      'gpt-4o',
      'gpt-4-turbo',
      'gpt-4',
      'gpt-3.5-turbo',
      'gpt-3.5-turbo-16k'
    ];
    this.apiKey = '';
    this.apiUrl = 'https://api.openai.com/v1';
    this.defaultModel = 'gpt-4o';
    this.timeout = 60000; // 默认超时时间：60秒
  }
  
  /**
   * 初始化 OpenAI 提供商
   * @param config 配置
   */
  public async initialize(config: OpenAIProviderConfig): Promise<void> {
    if (!config.apiKey) {
      throw new Error('OpenAI API 密钥不能为空');
    }
    
    this.apiKey = config.apiKey;
    
    if (config.apiUrl) {
      this.apiUrl = config.apiUrl;
    }
    
    if (config.organization) {
      this.organization = config.organization;
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
      console.log('OpenAI API 密钥验证成功');
    } catch (error) {
      console.error('OpenAI API 密钥验证失败:', error);
      throw new Error(`OpenAI API 密钥验证失败: ${error}`);
    }
  }
  
  /**
   * 查询 OpenAI
   * @param prompt 提示
   * @param options 选项
   * @returns OpenAI 响应
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
   * 流式查询 OpenAI
   * @param prompt 提示
   * @param options 选项
   * @returns OpenAI 响应流
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
      url: `${this.apiUrl}/chat/completions`,
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
        
        if (data.choices && data.choices.length > 0) {
          const choice = data.choices[0];
          const content = choice.delta?.content || '';
          
          yield {
            id: data.id,
            model: data.model,
            content,
            finishReason: choice.finish_reason || '',
            toolCalls: choice.delta?.tool_calls || []
          };
        }
      } catch (error) {
        console.error('解析 OpenAI 流响应失败:', error);
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
    return encode(text).length;
  }
  
  /**
   * 发送请求到 OpenAI API
   * @param options 请求选项
   * @returns OpenAI 响应
   */
  private async sendRequest(options: LLMRequestOptions): Promise<LLMResponse> {
    try {
      const response = await axios({
        method: 'post',
        url: `${this.apiUrl}/chat/completions`,
        headers: this.getHeaders(),
        data: this.formatRequestData(options),
        timeout: options.timeout || this.timeout
      });
      
      const data = response.data;
      
      if (!data.choices || data.choices.length === 0) {
        throw new Error('OpenAI 响应中没有选择');
      }
      
      const choice = data.choices[0];
      
      return {
        id: data.id,
        model: data.model,
        content: choice.message?.content || '',
        finishReason: choice.finish_reason || '',
        toolCalls: choice.message?.tool_calls?.map((tc: any) => ({
          name: tc.function.name,
          arguments: tc.function.arguments
        })) || [],
        usage: data.usage
      };
    } catch (error: any) {
      console.error('OpenAI 请求失败:', error);
      
      if (error.response) {
        const { status, data } = error.response;
        throw new Error(`OpenAI 请求失败 (${status}): ${JSON.stringify(data)}`);
      }
      
      throw new Error(`OpenAI 请求失败: ${error.message}`);
    }
  }
  
  /**
   * 获取请求头
   * @returns 请求头
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`
    };
    
    if (this.organization) {
      headers['OpenAI-Organization'] = this.organization;
    }
    
    return headers;
  }
  
  /**
   * 格式化请求数据
   * @param options 请求选项
   * @returns 格式化的请求数据
   */
  private formatRequestData(options: LLMRequestOptions): any {
    const data: any = {
      model: options.model,
      messages: options.messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        ...(msg.name ? { name: msg.name } : {})
      }))
    };
    
    if (options.temperature !== undefined) {
      data.temperature = options.temperature;
    }
    
    if (options.maxTokens !== undefined) {
      data.max_tokens = options.maxTokens;
    }
    
    if (options.topP !== undefined) {
      data.top_p = options.topP;
    }
    
    if (options.frequencyPenalty !== undefined) {
      data.frequency_penalty = options.frequencyPenalty;
    }
    
    if (options.presencePenalty !== undefined) {
      data.presence_penalty = options.presencePenalty;
    }
    
    if (options.stop !== undefined) {
      data.stop = options.stop;
    }
    
    if (options.stream !== undefined) {
      data.stream = options.stream;
    }
    
    if (options.tools && options.tools.length > 0) {
      data.tools = options.tools;
    }
    
    if (options.toolChoice !== undefined) {
      data.tool_choice = options.toolChoice;
    }
    
    return data;
  }
  
  /**
   * 验证 API 密钥
   */
  private async validateApiKey(): Promise<void> {
    try {
      await axios({
        method: 'get',
        url: `${this.apiUrl}/models`,
        headers: this.getHeaders(),
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