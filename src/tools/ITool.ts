/**
 * 工具类型枚举
 */
export enum ToolType {
  CODE_ANALYSIS = 'code_analysis',
  VERSION_CONTROL = 'version_control',
  FILE_SYSTEM = 'file_system',
  TERMINAL = 'terminal',
  SEARCH = 'search',
  DOCUMENTATION = 'documentation',
  TESTING = 'testing',
  CUSTOM = 'custom'
}

/**
 * 工具执行结果接口
 */
export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * 工具参数接口
 */
export interface ToolParams {
  [key: string]: any;
}

/**
 * 工具配置接口
 */
export interface ToolConfig {
  type: ToolType;
  name: string;
  description: string;
  enabled: boolean;
  [key: string]: any;
}

/**
 * 工具接口
 */
export interface ITool {
  /**
   * 工具类型
   */
  readonly type: ToolType;
  
  /**
   * 工具名称
   */
  readonly name: string;
  
  /**
   * 工具描述
   */
  readonly description: string;
  
  /**
   * 工具是否启用
   */
  readonly enabled: boolean;
  
  /**
   * 初始化工具
   * 
   * @param config 工具配置
   */
  initialize(config: ToolConfig): Promise<void>;
  
  /**
   * 执行工具
   * 
   * @param params 工具参数
   * @returns 工具执行结果
   */
  execute(params: ToolParams): Promise<ToolResult>;
  
  /**
   * 获取工具配置
   * 
   * @returns 工具配置
   */
  getConfig(): ToolConfig;
  
  /**
   * 更新工具配置
   * 
   * @param config 工具配置
   */
  updateConfig(config: Partial<ToolConfig>): void;
  
  /**
   * 启用工具
   */
  enable(): void;
  
  /**
   * 禁用工具
   */
  disable(): void;
  
  /**
   * 销毁工具
   */
  dispose(): void;
}