/**
 * LLM消息角色
 */
export type LLMMessageRole = 'user' | 'assistant' | 'system';

/**
 * LLM消息
 */
export interface LLMMessage {
  role: LLMMessageRole;
  content: string;
}

/**
 * LLM请求
 */
export interface LLMRequest {
  systemPrompt: string;
  messages: LLMMessage[];
  temperature?: number;
  maxTokens?: number;
}

/**
 * LLM使用统计
 */
export interface LLMUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * LLM响应
 */
export interface LLMResponse {
  content: string;
  usage: LLMUsage;
  raw: any;
}

/**
 * LLM提供商配置
 */
export interface LLMProviderConfig {
  [key: string]: any;
}

/**
 * LLM提供商接口
 */
export interface ILLMProvider {
  /**
   * 发送请求到LLM
   * 
   * @param request LLM请求
   * @returns LLM响应
   */
  sendRequest(request: LLMRequest): Promise<LLMResponse>;
  
  /**
   * 获取提供商名称
   * 
   * @returns 提供商名称
   */
  getName(): string;
  
  /**
   * 获取提供商配置
   * 
   * @returns 提供商配置
   */
  getConfig(): LLMProviderConfig;
  
  /**
   * 更新提供商配置
   * 
   * @param config 新的提供商配置
   */
  updateConfig(config: Partial<LLMProviderConfig>): void;
} 