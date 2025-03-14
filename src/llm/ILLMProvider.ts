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
 * LLM查询选项接口
 */
export interface LLMQueryOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
  [key: string]: any;
}

/**
 * LLM提供商接口
 */
export interface ILLMProvider {
  id: string;
  name: string;
  models: string[];
  
  /**
   * 初始化 LLM 提供者
   * @param config 配置
   */
  initialize(config: any): Promise<void>;
  
  /**
   * 查询 LLM
   * @param prompt 提示
   * @param options 选项
   * @returns LLM 响应
   */
  query(prompt: string, options: LLMQueryOptions): Promise<LLMResponse>;
  
  /**
   * 流式查询 LLM
   * @param prompt 提示
   * @param options 选项
   * @returns LLM 响应流
   */
  streamQuery(prompt: string, options: LLMQueryOptions): AsyncIterator<LLMResponse>;
  
  /**
   * 获取可用模型
   * @returns 模型列表
   */
  getModels(): string[];
  
  /**
   * 估算文本的 token 数量
   * @param text 文本
   * @returns token 数量
   */
  estimateTokens(text: string): number;
} 