/**
 * LLM提供商类型枚举
 */
export enum LLMProviderType {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  AZURE_OPENAI = 'azure_openai',
  DEEPSEEK = 'deepseek',
  GEMINI = 'gemini',
  LOCAL = 'local',
  CUSTOM = 'custom'
}

/**
 * LLM模型角色枚举
 */
export enum LLMModelRole {
  SYSTEM = 'system',
  USER = 'user',
  ASSISTANT = 'assistant',
  FUNCTION = 'function'
}

/**
 * LLM消息接口
 */
export interface LLMMessage {
  role: LLMModelRole;
  content: string;
  name?: string;
}

/**
 * LLM函数调用接口
 */
export interface LLMFunctionCall {
  name: string;
  arguments: string;
}

/**
 * LLM函数接口
 */
export interface LLMFunction {
  name: string;
  description?: string;
  parameters: Record<string, any>;
}

/**
 * LLM工具接口
 */
export interface LLMTool {
  type: 'function';
  function: LLMFunction;
}

/**
 * LLM请求选项接口
 */
export interface LLMRequestOptions {
  model: string;
  messages: LLMMessage[];
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  stop?: string[];
  tools?: LLMTool[];
  toolChoice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
  stream?: boolean;
  timeout?: number;
}

/**
 * LLM响应接口
 */
export interface LLMResponse {
  id: string;
  model: string;
  content: string;
  finishReason: string;
  toolCalls?: LLMFunctionCall[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * LLM提供商配置接口
 */
export interface LLMProviderConfig {
  type: LLMProviderType;
  apiKey?: string;
  apiUrl?: string;
  defaultModel: string;
  models: string[];
  timeout?: number;
  [key: string]: any;
}

/**
 * LLM提供商接口
 */
export interface ILLMProvider {
  /**
   * 提供商类型
   */
  readonly type: LLMProviderType;
  
  /**
   * 提供商名称
   */
  readonly name: string;
  
  /**
   * 默认模型
   */
  readonly defaultModel: string;
  
  /**
   * 可用模型列表
   */
  readonly models: string[];
  
  /**
   * 初始化提供商
   * 
   * @param config 提供商配置
   */
  initialize(config: LLMProviderConfig): Promise<void>;
  
  /**
   * 发送请求到LLM
   * 
   * @param options 请求选项
   * @returns LLM响应
   */
  sendRequest(options: LLMRequestOptions): Promise<LLMResponse>;
  
  /**
   * 发送流式请求到LLM
   * 
   * @param options 请求选项
   * @param callback 回调函数，用于处理流式响应
   * @returns 请求ID
   */
  sendStreamingRequest(
    options: LLMRequestOptions,
    callback: (chunk: Partial<LLMResponse>, done: boolean) => void
  ): Promise<string>;
  
  /**
   * 取消请求
   * 
   * @param requestId 请求ID
   */
  cancelRequest(requestId: string): void;
  
  /**
   * 获取模型列表
   * 
   * @returns 模型列表
   */
  listModels(): Promise<string[]>;
  
  /**
   * 计算令牌数量
   * 
   * @param text 文本
   * @param model 模型名称
   * @returns 令牌数量
   */
  countTokens(text: string, model?: string): Promise<number>;
  
  /**
   * 销毁提供商
   */
  dispose(): void;
} 