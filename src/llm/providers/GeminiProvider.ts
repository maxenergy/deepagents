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
 * Gemini提供商配置接口
 */
export interface GeminiProviderConfig extends LLMProviderConfig {
  apiKey: string;
  apiUrl?: string;
}

/**
 * Gemini提供商类
 * 
 * 提供与Google Gemini API的集成
 */
export class GeminiProvider extends BaseLLMProvider {
  /**
   * 构造函数
   */
  constructor() {
    super(LLMProviderType.GEMINI, 'Gemini');
    
    // 设置默认模型和可用模型
    this._defaultModel = 'gemini-pro';
    this._models = [
      'gemini-pro',
      'gemini-pro-vision',
      'gemini-1.5-pro',
      'gemini-1.5-flash'
    ];
  }
  
  /**
   * 初始化回调
   */
  protected async onInitialize(): Promise<void> {
    // 验证API密钥
    const apiKey = this.getConfigValue<string>('apiKey');
    if (!apiKey) {
      throw new Error('Gemini API密钥未提供');
    }
  }
  
  /**
   * 发送请求到Gemini
   * 
   * @param options 请求选项
   * @returns LLM响应
   */
  public async sendRequest(options: LLMRequestOptions): Promise<LLMResponse> {
    const requestId = this.generateRequestId();
    const controller = this.createAbortController(requestId);
    
    try {
      // 构建请求URL
      const apiUrl = this.getConfigValue<string>('apiUrl', 'https://generativelanguage.googleapis.com');
      const model = options.model || this._defaultModel;
      const url = `${apiUrl}/v1/models/${model}:generateContent?key=${this.getConfigValue<string>('apiKey')}`;
      
      // 构建请求头
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      // 转换消息格式
      const contents = this.convertMessages(options.messages);
      
      // 构建请求体
      const body: Record<string, any> = {
        contents,
        generationConfig: {
          temperature: options.temperature !== undefined ? options.temperature : 0.7,
          maxOutputTokens: options.maxTokens || 4096,
          topP: options.topP
        }
      };
      
      // 添加停止序列（如果有）
      if (options.stop && options.stop.length > 0) {
        body.generationConfig.stopSequences = options.stop;
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
        throw new Error(`Gemini API错误: ${errorData.error?.message || response.statusText}`);
      }
      
      // 解析响应
      const data = await response.json();
      
      // 提取内容
      let content = '';
      if (data.candidates && data.candidates.length > 0 && data.candidates[0].content) {
        const parts = data.candidates[0].content.parts;
        if (parts && parts.length > 0) {
          content = parts.map((part: any) => part.text).join('');
        }
      }
      
      // 构建响应
      const llmResponse: LLMResponse = {
        id: data.candidates?.[0]?.content?.name || `gemini-${Date.now()}`,
        model,
        content,
        finishReason: data.candidates?.[0]?.finishReason?.toLowerCase() || 'stop',
        usage: data.usageMetadata ? {
          promptTokens: data.usageMetadata.promptTokenCount,
          completionTokens: data.usageMetadata.candidatesTokenCount,
          totalTokens: data.usageMetadata.totalTokenCount
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
   * 发送流式请求到Gemini
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
      const apiUrl = this.getConfigValue<string>('apiUrl', 'https://generativelanguage.googleapis.com');
      const model = options.model || this._defaultModel;
      const url = `${apiUrl}/v1/models/${model}:streamGenerateContent?key=${this.getConfigValue<string>('apiKey')}`;
      
      // 构建请求头
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      // 转换消息格式
      const contents = this.convertMessages(options.messages);
      
      // 构建请求体
      const body: Record<string, any> = {
        contents,
        generationConfig: {
          temperature: options.temperature !== undefined ? options.temperature : 0.7,
          maxOutputTokens: options.maxTokens || 4096,
          topP: options.topP
        }
      };
      
      // 添加停止序列（如果有）
      if (options.stop && options.stop.length > 0) {
        body.generationConfig.stopSequences = options.stop;
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
        throw new Error(`Gemini API错误: ${errorData.error?.message || response.statusText}`);
      }
      
      // 处理流式响应
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('无法获取响应流');
      }
      
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let responseId = `gemini-${Date.now()}`;
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
              if (line.trim() === '') {
                continue;
              }
              
              try {
                const json = JSON.parse(line);
                
                // 提取内容
                if (json.candidates && json.candidates.length > 0 && json.candidates[0].content) {
                  const parts = json.candidates[0].content.parts;
                  if (parts && parts.length > 0) {
                    const chunkContent = parts.map((part: any) => part.text).join('');
                    content += chunkContent;
                    
                    // 调用回调
                    callback({
                      id: responseId,
                      model,
                      content,
                      finishReason: undefined
                    }, false);
                  }
                }
                
                // 检查是否完成
                if (json.candidates && json.candidates[0]?.finishReason) {
                  callback({
                    id: responseId,
                    model,
                    content,
                    finishReason: json.candidates[0].finishReason.toLowerCase()
                  }, true);
                  return;
                }
              } catch (error: any) {
                console.error('解析流式响应时出错:', error);
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
      const apiUrl = this.getConfigValue<string>('apiUrl', 'https://generativelanguage.googleapis.com');
      const url = `${apiUrl}/v1/models?key=${this.getConfigValue<string>('apiKey')}`;
      
      // 发送请求
      const response = await fetch(url);
      
      // 检查响应状态
      if (!response.ok) {
        throw new Error(`获取模型列表失败: ${response.statusText}`);
      }
      
      // 解析响应
      const data = await response.json();
      
      // 提取模型名称
      if (data.models && Array.isArray(data.models)) {
        return data.models
          .filter((model: any) => model.name && model.name.startsWith('gemini'))
          .map((model: any) => model.name.split('/').pop());
      }
      
      return this._models;
    } catch (error: any) {
      console.error('获取Gemini模型列表失败:', error);
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
      const apiUrl = this.getConfigValue<string>('apiUrl', 'https://generativelanguage.googleapis.com');
      const modelName = model || this._defaultModel;
      const url = `${apiUrl}/v1/models/${modelName}:countTokens?key=${this.getConfigValue<string>('apiKey')}`;
      
      // 构建请求体
      const body = {
        contents: [
          {
            parts: [
              {
                text
              }
            ]
          }
        ]
      };
      
      // 发送请求
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      
      // 检查响应状态
      if (!response.ok) {
        throw new Error(`计算令牌数量失败: ${response.statusText}`);
      }
      
      // 解析响应
      const data = await response.json();
      
      // 返回令牌数量
      return data.totalTokens || 0;
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
   * @returns Gemini格式的消息数组
   */
  private convertMessages(messages: LLMMessage[]): any[] {
    const result: any[] = [];
    let currentContent: any = null;
    
    for (const message of messages) {
      // 确定角色
      const role = message.role === LLMModelRole.ASSISTANT ? 'model' : 'user';
      
      // 如果角色变化，创建新的内容对象
      if (!currentContent || (currentContent.role !== role)) {
        if (currentContent) {
          result.push(currentContent);
        }
        
        currentContent = {
          role,
          parts: [{ text: message.content }]
        };
      } else {
        // 同一角色的消息，添加到当前内容的parts中
        currentContent.parts.push({ text: message.content });
      }
    }
    
    // 添加最后一个内容对象
    if (currentContent) {
      result.push(currentContent);
    }
    
    return result;
  }
}
