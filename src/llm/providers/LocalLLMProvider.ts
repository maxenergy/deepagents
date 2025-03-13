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
 * 本地LLM提供商配置接口
 */
export interface LocalLLMProviderConfig extends LLMProviderConfig {
  apiUrl: string;
  apiKey?: string;
}

/**
 * 本地LLM提供商类
 * 
 * 提供与本地部署的LLM服务的集成
 */
export class LocalLLMProvider extends BaseLLMProvider {
  /**
   * 构造函数
   */
  constructor() {
    super(LLMProviderType.LOCAL, '本地LLM');
    
    // 设置默认模型和可用模型
    this._defaultModel = 'Qwen/Qwen2.5-32B-Instruct-AWQ';
    this._models = [
      'Qwen/Qwen2.5-32B-Instruct-AWQ',
      'Qwen/Qwen2.5-7B-Instruct-AWQ',
      'Qwen/Qwen1.5-14B-Chat-AWQ',
      'Qwen/Qwen1.5-7B-Chat-AWQ',
      'Qwen/Qwen1.5-4B-Chat-AWQ',
      'Llama-3-8B-Instruct-GGUF',
      'Llama-3-70B-Instruct-GGUF'
    ];
  }
  
  /**
   * 初始化回调
   */
  protected async onInitialize(): Promise<void> {
    // 验证API URL
    const apiUrl = this.getConfigValue<string>('apiUrl');
    if (!apiUrl) {
      throw new Error('本地LLM API URL未提供');
    }
  }
  
  /**
   * 发送请求到本地LLM
   * 
   * @param options 请求选项
   * @returns LLM响应
   */
  public async sendRequest(options: LLMRequestOptions): Promise<LLMResponse> {
    const requestId = this.generateRequestId();
    const controller = this.createAbortController(requestId);
    
    try {
      // 构建请求URL
      const apiUrl = this.getConfigValue<string>('apiUrl');
      const url = `${apiUrl}/v1/chat/completions`;
      
      // 构建请求头
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      // 添加API密钥（如果有）
      const apiKey = this.getConfigValue<string>('apiKey');
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }
      
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
        throw new Error(`本地LLM API错误: ${errorData.error?.message || response.statusText}`);
      }
      
      // 解析响应
      const data = await response.json();
      
      // 构建响应
      const llmResponse: LLMResponse = {
        id: data.id || `local-${Date.now()}`,
        model: data.model || options.model || this._defaultModel,
        content: data.choices?.[0]?.message?.content || '',
        finishReason: data.choices?.[0]?.finish_reason || 'stop',
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
   * 发送流式请求到本地LLM
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
      const apiUrl = this.getConfigValue<string>('apiUrl');
      const url = `${apiUrl}/v1/chat/completions`;
      
      // 构建请求头
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      };
      
      // 添加API密钥（如果有）
      const apiKey = this.getConfigValue<string>('apiKey');
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }
      
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
        throw new Error(`本地LLM API错误: ${errorData.error?.message || response.statusText}`);
      }
      
      // 处理流式响应
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('无法获取响应流');
      }
      
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let responseId = `local-${Date.now()}`;
      let model = options.model || this._defaultModel;
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
                  if (json.id && !responseId.startsWith('local-')) {
                    responseId = json.id;
                  }
                  
                  if (json.model) {
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
                      finishReason: undefined
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
    try {
      // 构建请求URL
      const apiUrl = this.getConfigValue<string>('apiUrl');
      const url = `${apiUrl}/v1/models`;
      
      // 构建请求头
      const headers: Record<string, string> = {};
      
      // 添加API密钥（如果有）
      const apiKey = this.getConfigValue<string>('apiKey');
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }
      
      // 发送请求
      const response = await fetch(url, { headers });
      
      // 检查响应状态
      if (!response.ok) {
        throw new Error(`获取模型列表失败: ${response.statusText}`);
      }
      
      // 解析响应
      const data = await response.json();
      
      // 提取模型名称
      if (data.data && Array.isArray(data.data)) {
        return data.data.map((model: any) => model.id);
      }
      
      return this._models;
    } catch (error: any) {
      console.error('获取本地LLM模型列表失败:', error);
      return this._models;
    }
  }
  
  /**
   * 计算令牌数量
   * 
   * @param text 文本
   * @param model 模型名称
   * @returns 令牌数量
   */
  public async countTokens(text: string, model?: string): Promise<number> {
    try {
      // 构建请求URL
      const apiUrl = this.getConfigValue<string>('apiUrl');
      const url = `${apiUrl}/v1/tokenize`;
      
      // 构建请求头
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      // 添加API密钥（如果有）
      const apiKey = this.getConfigValue<string>('apiKey');
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }
      
      // 构建请求体
      const body = {
        text,
        model: model || this._defaultModel
      };
      
      // 发送请求
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });
      
      // 检查响应状态
      if (!response.ok) {
        throw new Error(`计算令牌数量失败: ${response.statusText}`);
      }
      
      // 解析响应
      const data = await response.json();
      
      // 返回令牌数量
      return data.tokens?.length || 0;
    } catch (error: any) {
      console.error('计算令牌数量失败:', error);
      
      // 简单估算：每个单词约1.3个令牌
      const words = text.split(/\s+/).length;
      return Math.ceil(words * 1.3);
    }
  }
  
  /**
   * 转换消息格式
   * 
   * @param messages LLM消息数组
   * @returns 本地LLM格式的消息数组
   */
  private convertMessages(messages: LLMMessage[]): any[] {
    return messages.map(message => {
      let role = 'user';
      
      // 转换角色
      if (message.role === LLMModelRole.SYSTEM) {
        role = 'system';
      } else if (message.role === LLMModelRole.ASSISTANT) {
        role = 'assistant';
      }
      
      return {
        role,
        content: message.content
      };
    });
  }
}
