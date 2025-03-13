import {
  LLMProviderType,
  LLMProviderConfig,
  LLMRequestOptions,
  LLMResponse,
  LLMModelRole,
  LLMMessage
} from '../ILLMProvider';
import { BaseLLMProvider } from '../BaseLLMProvider';

/**
 * DeepSeek提供商配置接口
 */
export interface DeepSeekProviderConfig extends LLMProviderConfig {
  apiKey: string;
  apiUrl?: string;
}

/**
 * DeepSeek提供商类
 * 
 * 提供与DeepSeek API的集成
 */
export class DeepSeekProvider extends BaseLLMProvider {
  /**
   * 构造函数
   */
  constructor() {
    super(LLMProviderType.DEEPSEEK, 'DeepSeek');
    
    // 设置默认模型和可用模型
    this._defaultModel = 'deepseek-chat';
    this._models = [
      'deepseek-chat',
      'deepseek-coder',
      'deepseek-llm-67b-chat',
      'deepseek-llm-7b-chat'
    ];
  }
  
  /**
   * 初始化回调
   */
  protected async onInitialize(): Promise<void> {
    // 验证API密钥
    const apiKey = this.getConfigValue<string>('apiKey');
    if (!apiKey) {
      throw new Error('DeepSeek API密钥未提供');
    }
  }
  
  /**
   * 发送请求到DeepSeek
   * 
   * @param options 请求选项
   * @returns LLM响应
   */
  public async sendRequest(options: LLMRequestOptions): Promise<LLMResponse> {
    const requestId = this.generateRequestId();
    const controller = this.createAbortController(requestId);
    
    try {
      // 构建请求URL
      const apiUrl = this.getConfigValue<string>('apiUrl', 'https://api.deepseek.com');
      const url = `${apiUrl}/v1/chat/completions`;
      
      // 构建请求头
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getConfigValue<string>('apiKey')}`
      };
      
      // 转换消息格式
      const messages = this.convertMessages(options.messages);
      
      // 构建请求体
      const body: Record<string, any> = {
        model: options.model || this._defaultModel,
        messages,
        temperature: options.temperature !== undefined ? options.temperature : 0.7,
        max_tokens: options.maxTokens || 4096,
        top_p: options.topP,
        stream: false
      };
      
      // 添加停止序列（如果有）
      if (options.stop && options.stop.length > 0) {
        body.stop = options.stop;
      }
      
      // 发送请求
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal
      });
      
      // 检查响应状态
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`DeepSeek API错误: ${errorData.error?.message || response.statusText}`);
      }
      
      // 解析响应
      const data = await response.json();
      
      // 构建响应
      const llmResponse: LLMResponse = {
        id: data.id,
        model: data.model,
        content: data.choices[0]?.message?.content || '',
        finishReason: data.choices[0]?.finish_reason || 'stop',
        usage: data.usage ? {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens
        } : undefined
      };
      
      return llmResponse;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error('请求已取消');
      }
      throw error;
    } finally {
      this.removeAbortController(requestId);
    }
  }
  
  /**
   * 发送流式请求到DeepSeek
   * 
   * @param options 请求选项
   * @param callback 回调函数，用于处理流式响应
   * @returns 请求ID
   */
  public async sendStreamingRequest(
    options: LLMRequestOptions,
    callback: (chunk: Partial<LLMResponse>, done: boolean) => void
  ): Promise<string> {
    const requestId = this.generateRequestId();
    const controller = this.createAbortController(requestId);
    
    try {
      // 构建请求URL
      const apiUrl = this.getConfigValue<string>('apiUrl', 'https://api.deepseek.com');
      const url = `${apiUrl}/v1/chat/completions`;
      
      // 构建请求头
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getConfigValue<string>('apiKey')}`,
        'Accept': 'text/event-stream'
      };
      
      // 转换消息格式
      const messages = this.convertMessages(options.messages);
      
      // 构建请求体
      const body: Record<string, any> = {
        model: options.model || this._defaultModel,
        messages,
        temperature: options.temperature !== undefined ? options.temperature : 0.7,
        max_tokens: options.maxTokens || 4096,
        top_p: options.topP,
        stream: true
      };
      
      // 添加停止序列（如果有）
      if (options.stop && options.stop.length > 0) {
        body.stop = options.stop;
      }
      
      // 发送请求
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal
      });
      
      // 检查响应状态
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`DeepSeek API错误: ${errorData.error?.message || response.statusText}`);
      }
      
      // 处理流式响应
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('无法获取响应流');
      }
      
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let responseId = '';
      let model = '';
      let content = '';
      
      const processChunks = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
              // 流结束，调用回调
              callback({
                id: responseId,
                model,
                content,
                finishReason: 'stop'
              }, true);
              break;
            }
            
            // 解码数据
            buffer += decoder.decode(value, { stream: true });
            
            // 处理数据行
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                
                // 检查是否是流结束标记
                if (data === '[DONE]') {
                  callback({
                    id: responseId,
                    model,
                    content,
                    finishReason: 'stop'
                  }, true);
                  return;
                }
                
                try {
                  const json = JSON.parse(data);
                  
                  // 保存响应ID和模型
                  if (json.id && !responseId) {
                    responseId = json.id;
                  }
                  
                  if (json.model && !model) {
                    model = json.model;
                  }
                  
                  // 处理内容增量
                  if (json.choices && json.choices[0]?.delta?.content) {
                    content += json.choices[0].delta.content;
                    
                    // 调用回调
                    callback({
                      id: responseId,
                      model,
                      content,
                      finishReason: null
                    }, false);
                  }
                  
                  // 检查是否完成
                  if (json.choices && json.choices[0]?.finish_reason) {
                    callback({
                      id: responseId,
                      model,
                      content,
                      finishReason: json.choices[0].finish_reason
                    }, true);
                    return;
                  }
                } catch (error: any) {
                  console.error('解析流式响应时出错:', error);
                }
              }
            }
          }
        } catch (error: any) {
          if (error.name === 'AbortError') {
            callback({
              id: responseId,
              model,
              content,
              finishReason: 'cancelled'
            }, true);
          } else {
            console.error('处理流式响应时出错:', error);
            callback({
              id: responseId,
              model,
              content,
              finishReason: 'error'
            }, true);
          }
        } finally {
          reader.releaseLock();
        }
      };
      
      // 开始处理流
      processChunks();
      
      return requestId;
    } catch (error: any) {
      this.removeAbortController(requestId);
      throw error;
    }
  }
  
  /**
   * 获取模型列表
   * 
   * @returns 模型列表
   */
  public async listModels(): Promise<string[]> {
    // DeepSeek API目前不提供模型列表端点
    return this._models;
  }
  
  /**
   * 计算令牌数量
   * 
   * @param text 文本
   * @param model 模型名称
   * @returns 令牌数量
   */
  public async countTokens(text: string, model?: string): Promise<number> {
    // 简单估算：每个单词约1.3个令牌
    const words = text.split(/\s+/).length;
    return Math.ceil(words * 1.3);
  }
  
  /**
   * 转换消息格式
   * 
   * @param messages LLM消息数组
   * @returns DeepSeek格式的消息数组
   */
  private convertMessages(messages: LLMMessage[]): any[] {
    const result: any[] = [];
    
    for (const message of messages) {
      let role = 'user';
      
      // 转换角色
      if (message.role === LLMModelRole.SYSTEM) {
        role = 'system';
      } else if (message.role === LLMModelRole.ASSISTANT) {
        role = 'assistant';
      }
      
      // 添加消息
      result.push({
        role,
        content: message.content
      });
    }
    
    return result;
  }
}
