// 代理模块索引文件

// 导出接口和枚举
export {
  AgentRole,
  AgentCapability,
  AgentState,
  AgentConfig,
  AgentInput,
  AgentOutput,
  AgentAction,
  Task,
  TaskStatus,
  TaskResult,
  IAgent
} from './AgentManager';

// 导出代理管理器
export { AgentManager } from './AgentManager';

// 导出具体代理类
export { ProductManagerAgent } from './ProductManagerAgent';
export { ArchitectAgent } from './ArchitectAgent';
export { DeveloperAgent } from './DeveloperAgent';
export { TesterAgent } from './TesterAgent';
export { DevOpsAgent } from './DevOpsAgent';
export { DocumentationAgent } from './DocumentationAgent';

// 导出协作模块
export * from './collaboration';