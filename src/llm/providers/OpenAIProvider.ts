import {
  LLMProviderType,
  LLMProviderConfig,
  LLMRequestOptions,
  LLMResponse,
  LLMFunctionCall
} from '../ILLMProvider';
import { BaseLLMProvider } from '../BaseLLMProvider';

/**
 * OpenAI提供商配置接口
 */
export interface OpenAIProviderConfig extends LLMProviderConfig {
  apiKey: string;
  apiUrl?: string;
  organization?: string;
}

/**
 * OpenAI提供商类
 * 
 * 提供与OpenAI API的集成
 */
export class OpenAIProvider extends BaseLLMProvider {
  /**
   * 构造函数
   */
  constructor() {
    super(LLMProviderType.OPENAI, 'OpenAI');
    
    // 设置默认模型和可用模型
    this._defaultModel = 'gpt-4o';
    this._models = [
      'gpt-4o',
      'gpt-4-turbo',
      'gpt-4',
      'gpt-3.5-turbo',
      'gpt-3.5-turbo-16k'
    ];
  }
  
  /**
   * 初始化回调
   */
  protected async onInitialize(): Promise<void> {
    // 验证API密钥
    const apiKey = this.getConfigValue<string>('apiKey');
    if (!apiKey) {
      throw new Error('OpenAI API密钥未提供');
    }
    
    // 尝试获取模型列表
    try {
      const models = await this.listModels();
      if (models.length > 0) {
        this._models = models;
      }
    } catch (error) {
      console.warn('无法获取OpenAI模型列表:', error);
    }
  }
  
  /**
   * 发送请求到OpenAI
   * 
   * @param options 请求选项
   * @returns LLM响应
   */
  public async sendRequest(options: LLMRequestOptions): Promise<LLMResponse> {
    const requestId = this.generateRequestId();
    const controller = this.createAbortController(requestId);
    
    try {
      // 构建请求URL
      const apiUrl = this.getConfigValue<string>('apiUrl', 'https://api.openai.com');
      const url = `${apiUrl}/v1/chat/completions`;
      
      // 构建请求头
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getConfigValue<string>('apiKey')}`,
      };
      
      // 添加组织ID（如果有）
      const organization = this.getConfigValue<string>('organization');
      if (organization) {
        headers['OpenAI-Organization'] = organization;
      }
      
      // 构建请求体
      const body: any = {
        model: options.model || this._defaultModel,
        messages: options.messages,
        temperature: options.temperature !== undefined ? options.temperature : 0.7,
        max_tokens: options.maxTokens,
        top_p: options.topP,
        presence_penalty: options.presencePenalty,
        frequency_penalty: options.frequencyPenalty,
        stop: options.stop,
        stream: false
      };
      
      // 添加工具（如果有）
      if (options.tools && options.tools.length > 0) {
        body.tools = options.tools;
      }
      
      // 添加工具选择（如果有）
      if (options.toolChoice) {
        body.tool_choice = options.toolChoice;
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
        throw new Error(`OpenAI API错误: ${errorData.error?.message || response.statusText}`);
      }
      
      // 解析响应
      const data = await response.json();
      
      // 提取工具调用（如果有）
      const toolCalls: LLMFunctionCall[] = [];
      if (data.choices[0]?.message?.tool_calls) {
        for (const toolCall of data.choices[0].message.tool_calls) {
          if (toolCall.type === 'function') {
            toolCalls.push({
              name: toolCall.function.name,
              arguments: toolCall.function.arguments
            });
          }
        }
      }
      
      // 构建响应
      const llmResponse: LLMResponse = {
        id: data.id,
        model: data.model,
        content: data.choices[0]?.message?.content || '',
        finishReason: data.choices[0]?.finish_reason,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        usage: data.usage ? {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens
        } : undefined
      };
      
      return llmResponse;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('请求已取消');
      }
      throw error;
    } finally {
      this.removeAbortController(requestId);
    }
  }
  
  /**
   * 发送流式请求到OpenAI
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
      const apiUrl = this.getConfigValue<string>('apiUrl', 'https://api.openai.com');
      const url = `${apiUrl}/v1/chat/completions`;
      
      // 构建请求头
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getConfigValue<string>('apiKey')}`,
        'Accept': 'text/event-stream'
      };
      
      // 添加组织ID（如果有）
      const organization = this.getConfigValue<string>('organization');
      if (organization) {
        headers['OpenAI-Organization'] = organization;
      }
      
      // 构建请求体
      const body: any = {
        model: options.model || this._defaultModel,
        messages: options.messages,
        temperature: options.temperature !== undefined ? options.temperature : 0.7,
        max_tokens: options.maxTokens,
        top_p: options.topP,
        presence_penalty: options.presencePenalty,
        frequency_penalty: options.frequencyPenalty,
        stop: options.stop,
        stream: true
      };
      
      // 添加工具（如果有）
      if (options.tools && options.tools.length > 0) {
        body.tools = options.tools;
      }
      
      // 添加工具选择（如果有）
      if (options.toolChoice) {
        body.tool_choice = options.toolChoice;
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
        throw new Error(`OpenAI API错误: ${errorData.error?.message || response.statusText}`);
      }
      
      // 处理流式响应
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let responseId = '';
      let model = '';
      let content = '';
      let toolCalls: LLMFunctionCall[] = [];
      
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
                finishReason: 'stop',
                toolCalls: toolCalls.length > 0 ? toolCalls : undefined
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
                    finishReason: 'stop',
                    toolCalls: toolCalls.length > 0 ? toolCalls : undefined
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
                  if (json.choices && json.choices.length > 0) {
                    const choice = json.choices[0];
                    
                    // 处理内容
                    if (choice.delta?.content) {
                      content += choice.delta.content;
                      
                      // 调用回调
                      callback({
                        id: responseId,
                        model,
                        content,
                        finishReason: choice.finish_reason || null
                      }, false);
                    }
                    
                    // 处理工具调用
                    if (choice.delta?.tool_calls) {
                      // 初始化工具调用
                      if (!toolCalls[choice.index]) {
                        toolCalls[choice.index] = {
                          name: '',
                          arguments: ''
                        };
                      }
                      
                      // 更新工具调用
                      const toolCall = choice.delta.tool_calls[0];
                      if (toolCall.function?.name) {
                        toolCalls[choice.index].name += toolCall.function.name;
                      }
                      
                      if (toolCall.function?.arguments) {
                        toolCalls[choice.index].arguments += toolCall.function.arguments;
                      }
                      
                      // 调用回调
                      callback({
                        id: responseId,
                        model,
                        content,
                        finishReason: choice.finish_reason || null,
                        toolCalls
                      }, false);
                    }
                    
                    // 检查是否完成
                    if (choice.finish_reason) {
                      callback({
                        id: responseId,
                        model,
                        content,
                        finishReason: choice.finish_reason,
                        toolCalls: toolCalls.length > 0 ? toolCalls : undefined
                      }, true);
                      return;
                    }
                  }
                } catch (error) {
                  console.error('解析流式响应时出错:', error);
                }
              }
            }
          }
        } catch (error) {
          if (error.name === 'AbortError') {
            callback({
              id: responseId,
              model,
              content,
              finishReason: 'cancelled',
              toolCalls: toolCalls.length > 0 ? toolCalls : undefined
            }, true);
          } else {
            console.error('处理流式响应时出错:', error);
            callback({
              id: responseId,
              model,
              content,
              finishReason: 'error',
              toolCalls: toolCalls.length > 0 ? toolCalls : undefined
            }, true);
          }
        } finally {
          reader.releaseLock();
        }
      };
      
      // 开始处理流
      processChunks();
      
      return requestId;
    } catch (error) {
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
      const apiUrl = this.getConfigValue<string>('apiUrl', 'https://api.openai.com');
      const url = `${apiUrl}/v1/models`;
      
      // 构建请求头
      const headers = {
        'Authorization': `Bearer ${this.getConfigValue<string>('apiKey')}`
      };
      
      // 添加组织ID（如果有）
      const organization = this.getConfigValue<string>('organization');
      if (organization) {
        headers['OpenAI-Organization'] = organization;
      }
      
      // 发送请求
      const response = await fetch(url, { headers });
      
      // 检查响应状态
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenAI API错误: ${errorData.error?.message || response.statusText}`);
      }
      
      // 解析响应
      const data = await response.json();
      
      // 过滤并返回模型列表
      return data.data
        .filter(model => model.id.startsWith('gpt-'))
        .map(model => model.id);
    } catch (error) {
      console.error('获取OpenAI模型列表时出错:', error);
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
    // 简单估算：每个单词约1.3个令牌
    const words = text.split(/\s+/).length;
    return Math.ceil(words * 1.3);
    
    // 注意：实际应用中应该使用tiktoken等库进行更准确的计算
    // 这里使用简单估算是为了避免引入额外依赖
  }
} 