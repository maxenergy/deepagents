import { IAgent, AgentRole } from '../AgentManager';
import { CollaborationType } from './CollaborationManager';

/**
 * 协作提示生成器类
 * 
 * 负责生成协作提示
 */
export class CollaborationPromptGenerator {
  /**
   * 生成顺序协作提示
   * 
   * @param agents 参与协作的代理
   * @param previousAgentId 前一个代理ID
   * @param nextAgentId 下一个代理ID
   * @returns 协作提示
   */
  public static generateSequentialPrompt(
    agents: IAgent[],
    previousAgentId?: string,
    nextAgentId?: string
  ): string {
    const agentInfo = agents.map(agent => `- ${agent.name}（${this.getRoleDescription(agent.role)}）`).join('\n');
    
    let prompt = `你正在参与一个顺序协作过程，多个代理按顺序处理任务。\n\n`;
    prompt += `参与协作的代理：\n${agentInfo}\n\n`;
    
    if (previousAgentId) {
      const previousAgent = agents.find(agent => agent.id === previousAgentId);
      if (previousAgent) {
        prompt += `你收到了来自 ${previousAgent.name}（${this.getRoleDescription(previousAgent.role)}）的输入。\n`;
        prompt += `请基于这个输入继续工作。\n\n`;
      }
    }
    
    if (nextAgentId) {
      const nextAgent = agents.find(agent => agent.id === nextAgentId);
      if (nextAgent) {
        prompt += `你的输出将传递给 ${nextAgent.name}（${this.getRoleDescription(nextAgent.role)}）。\n`;
        prompt += `请确保你的输出对下一个代理有用。\n\n`;
      }
    }
    
    return prompt;
  }
  
  /**
   * 生成并行协作提示
   * 
   * @param agents 参与协作的代理
   * @returns 协作提示
   */
  public static generateParallelPrompt(agents: IAgent[]): string {
    const agentInfo = agents.map(agent => `- ${agent.name}（${this.getRoleDescription(agent.role)}）`).join('\n');
    
    let prompt = `你正在参与一个并行协作过程，多个代理同时处理同一个任务。\n\n`;
    prompt += `参与协作的代理：\n${agentInfo}\n\n`;
    prompt += `请从你的专业角度处理任务，不需要考虑其他代理的工作。\n`;
    prompt += `专注于你的专业领域，提供高质量的输出。\n\n`;
    
    return prompt;
  }
  
  /**
   * 生成层级协作提示（协调者）
   * 
   * @param agents 参与协作的代理
   * @param workers 工作者代理
   * @returns 协作提示
   */
  public static generateHierarchicalCoordinatorPrompt(
    agents: IAgent[],
    workers: IAgent[]
  ): string {
    const agentInfo = agents.map(agent => `- ${agent.name}（${this.getRoleDescription(agent.role)}）`).join('\n');
    const workerInfo = workers.map(worker => `- ${worker.name}（${this.getRoleDescription(worker.role)}，ID: ${worker.id}）`).join('\n');
    
    let prompt = `你是这个协作过程的协调者，负责分配任务和整合结果。\n\n`;
    prompt += `参与协作的代理：\n${agentInfo}\n\n`;
    prompt += `你可以分配任务给以下工作者：\n${workerInfo}\n\n`;
    prompt += `请根据任务需求和工作者的专业能力，合理分配任务。\n`;
    prompt += `分配任务时，请使用以下格式：\n\n`;
    prompt += `任务分配：\n`;
    prompt += `[工作者ID]: [任务描述]\n`;
    prompt += `[工作者ID]: [任务描述]\n\n`;
    prompt += `或者使用动作格式：\n\n`;
    prompt += `[ACTION:task_assignment]\n`;
    prompt += `[\n`;
    prompt += `  { "assignedTo": "[工作者ID]", "description": "[任务描述]" },\n`;
    prompt += `  { "assignedTo": "[工作者ID]", "description": "[任务描述]" }\n`;
    prompt += `]\n`;
    prompt += `[/ACTION]\n\n`;
    
    return prompt;
  }
  
  /**
   * 生成层级协作提示（工作者）
   * 
   * @param coordinator 协调者代理
   * @param task 任务描述
   * @returns 协作提示
   */
  public static generateHierarchicalWorkerPrompt(
    coordinator: IAgent,
    task: string
  ): string {
    let prompt = `你是这个协作过程的工作者，负责完成协调者分配的任务。\n\n`;
    prompt += `协调者：${coordinator.name}（${this.getRoleDescription(coordinator.role)}）\n\n`;
    prompt += `协调者给你分配的任务：\n${task}\n\n`;
    prompt += `请专注于完成这个任务，提供高质量的输出。\n`;
    prompt += `你的输出将返回给协调者进行整合。\n\n`;
    
    return prompt;
  }
  
  /**
   * 生成层级协作提示（结果整合）
   * 
   * @param workers 工作者代理
   * @param results 工作者结果
   * @returns 协作提示
   */
  public static generateHierarchicalIntegrationPrompt(
    workers: IAgent[],
    results: { agentId: string, output: string }[]
  ): string {
    let prompt = `你是这个协作过程的协调者，现在需要整合工作者的结果。\n\n`;
    
    for (const result of results) {
      const worker = workers.find(w => w.id === result.agentId);
      if (worker) {
        prompt += `${worker.name}（${this.getRoleDescription(worker.role)}）的输出：\n`;
        prompt += `${result.output}\n\n`;
      }
    }
    
    prompt += `请整合以上工作者的输出，提供一个综合的结果。\n`;
    prompt += `你可以添加自己的见解和建议，确保最终输出是连贯和完整的。\n\n`;
    
    return prompt;
  }
  
  /**
   * 获取角色描述
   * 
   * @param role 代理角色
   * @returns 角色描述
   */
  private static getRoleDescription(role: AgentRole): string {
    switch (role) {
      case AgentRole.PRODUCT_MANAGER:
        return '产品经理';
      case AgentRole.ARCHITECT:
        return '架构师';
      case AgentRole.DEVELOPER:
        return '开发者';
      case AgentRole.TESTER:
        return '测试员';
      case AgentRole.DEVOPS:
        return 'DevOps工程师';
      case AgentRole.DOCUMENTATION:
        return '文档编写员';
      case AgentRole.CUSTOM:
        return '自定义角色';
      default:
        return '未知角色';
    }
  }
}