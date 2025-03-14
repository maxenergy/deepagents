import * as vscode from 'vscode';
import { v4 as uuidv4 } from 'uuid';
import { IWorkflowStep } from './IWorkflow';
import { AgentManager } from '../agents/AgentManager';
import { AgentRole } from '../agents/IAgent';

/**
 * 工作流步骤工厂类
 * 
 * 用于创建常用的工作流步骤
 */
export class WorkflowStepFactory {
  private agentManager: AgentManager;

  /**
   * 构造函数
   * 
   * @param agentManager 代理管理器
   */
  constructor(agentManager: AgentManager) {
    this.agentManager = agentManager;
  }

  /**
   * 创建需求分析步骤
   * 
   * @param name 步骤名称
   * @param description 步骤描述
   * @param input 输入数据
   */
  public createRequirementsAnalysisStep(
    name: string = '需求分析',
    description: string = '分析项目需求并生成需求文档',
    input: any = {}
  ): IWorkflowStep {
    return {
      id: uuidv4(),
      name,
      description,
      completed: false,
      active: false,
      execute: async () => {
        // 获取产品经理代理
        const agents = await this.agentManager.getAgentsByRole(AgentRole.PRODUCT_MANAGER);
        if (agents.length === 0) {
          throw new Error('未找到产品经理代理');
        }

        const agent = agents[0];
        
        // 显示进度通知
        vscode.window.showInformationMessage(`正在执行 ${name} 步骤...`);
        
        // 执行需求分析
        const result = await agent.processRequest({
          type: 'requirements_analysis',
          data: {
            description: input.description || '请分析项目需求',
            context: input.context || {}
          }
        });
        
        // 返回结果
        return result;
      }
    };
  }

  /**
   * 创建架构设计步骤
   * 
   * @param name 步骤名称
   * @param description 步骤描述
   * @param input 输入数据
   */
  public createArchitectureDesignStep(
    name: string = '架构设计',
    description: string = '设计系统架构并生成架构文档',
    input: any = {}
  ): IWorkflowStep {
    return {
      id: uuidv4(),
      name,
      description,
      completed: false,
      active: false,
      execute: async () => {
        // 获取架构师代理
        const agents = await this.agentManager.getAgentsByRole(AgentRole.ARCHITECT);
        if (agents.length === 0) {
          throw new Error('未找到架构师代理');
        }

        const agent = agents[0];
        
        // 显示进度通知
        vscode.window.showInformationMessage(`正在执行 ${name} 步骤...`);
        
        // 执行架构设计
        const result = await agent.processRequest({
          type: 'architecture_design',
          data: {
            requirements: input.requirements || {},
            context: input.context || {}
          }
        });
        
        // 返回结果
        return result;
      }
    };
  }

  /**
   * 创建代码生成步骤
   * 
   * @param name 步骤名称
   * @param description 步骤描述
   * @param input 输入数据
   */
  public createCodeGenerationStep(
    name: string = '代码生成',
    description: string = '根据架构设计生成代码',
    input: any = {}
  ): IWorkflowStep {
    return {
      id: uuidv4(),
      name,
      description,
      completed: false,
      active: false,
      execute: async () => {
        // 获取开发者代理
        const agents = await this.agentManager.getAgentsByRole(AgentRole.DEVELOPER);
        if (agents.length === 0) {
          throw new Error('未找到开发者代理');
        }

        const agent = agents[0];
        
        // 显示进度通知
        vscode.window.showInformationMessage(`正在执行 ${name} 步骤...`);
        
        // 执行代码生成
        const result = await agent.processRequest({
          type: 'code_generation',
          data: {
            architecture: input.architecture || {},
            requirements: input.requirements || {},
            context: input.context || {}
          }
        });
        
        // 返回结果
        return result;
      }
    };
  }

  /**
   * 创建代码测试步骤
   * 
   * @param name 步骤名称
   * @param description 步骤描述
   * @param input 输入数据
   */
  public createCodeTestingStep(
    name: string = '代码测试',
    description: string = '测试生成的代码',
    input: any = {}
  ): IWorkflowStep {
    return {
      id: uuidv4(),
      name,
      description,
      completed: false,
      active: false,
      execute: async () => {
        // 获取测试员代理
        const agents = await this.agentManager.getAgentsByRole(AgentRole.TESTER);
        if (agents.length === 0) {
          throw new Error('未找到测试员代理');
        }

        const agent = agents[0];
        
        // 显示进度通知
        vscode.window.showInformationMessage(`正在执行 ${name} 步骤...`);
        
        // 执行代码测试
        const result = await agent.processRequest({
          type: 'code_testing',
          data: {
            code: input.code || {},
            requirements: input.requirements || {},
            context: input.context || {}
          }
        });
        
        // 返回结果
        return result;
      }
    };
  }

  /**
   * 创建代码部署步骤
   * 
   * @param name 步骤名称
   * @param description 步骤描述
   * @param input 输入数据
   */
  public createCodeDeploymentStep(
    name: string = '代码部署',
    description: string = '部署生成的代码',
    input: any = {}
  ): IWorkflowStep {
    return {
      id: uuidv4(),
      name,
      description,
      completed: false,
      active: false,
      execute: async () => {
        // 获取开发运维代理
        const agents = await this.agentManager.getAgentsByRole(AgentRole.DEVOPS);
        if (agents.length === 0) {
          throw new Error('未找到开发运维代理');
        }

        const agent = agents[0];
        
        // 显示进度通知
        vscode.window.showInformationMessage(`正在执行 ${name} 步骤...`);
        
        // 执行代码部署
        const result = await agent.processRequest({
          type: 'code_deployment',
          data: {
            code: input.code || {},
            environment: input.environment || 'development',
            context: input.context || {}
          }
        });
        
        // 返回结果
        return result;
      }
    };
  }

  /**
   * 创建文档生成步骤
   * 
   * @param name 步骤名称
   * @param description 步骤描述
   * @param input 输入数据
   */
  public createDocumentationStep(
    name: string = '文档生成',
    description: string = '生成项目文档',
    input: any = {}
  ): IWorkflowStep {
    return {
      id: uuidv4(),
      name,
      description,
      completed: false,
      active: false,
      execute: async () => {
        // 获取文档编写代理
        const agents = await this.agentManager.getAgentsByRole(AgentRole.DOCUMENTATION);
        if (agents.length === 0) {
          throw new Error('未找到文档编写代理');
        }

        const agent = agents[0];
        
        // 显示进度通知
        vscode.window.showInformationMessage(`正在执行 ${name} 步骤...`);
        
        // 执行文档生成
        const result = await agent.processRequest({
          type: 'documentation_generation',
          data: {
            code: input.code || {},
            requirements: input.requirements || {},
            architecture: input.architecture || {},
            context: input.context || {}
          }
        });
        
        // 返回结果
        return result;
      }
    };
  }

  /**
   * 创建自定义步骤
   * 
   * @param name 步骤名称
   * @param description 步骤描述
   * @param executeFunction 执行函数
   * @param rollbackFunction 回滚函数
   */
  public createCustomStep(
    name: string,
    description: string,
    executeFunction: () => Promise<any>,
    rollbackFunction?: () => Promise<void>
  ): IWorkflowStep {
    return {
      id: uuidv4(),
      name,
      description,
      completed: false,
      active: false,
      execute: executeFunction,
      rollback: rollbackFunction
    };
  }

  /**
   * 创建完整开发工作流步骤
   * 
   * @param input 输入数据
   */
  public createFullDevelopmentWorkflowSteps(input: any = {}): IWorkflowStep[] {
    return [
      this.createRequirementsAnalysisStep('需求分析', '分析项目需求并生成需求文档', input),
      this.createArchitectureDesignStep('架构设计', '设计系统架构并生成架构文档', input),
      this.createCodeGenerationStep('代码生成', '根据架构设计生成代码', input),
      this.createCodeTestingStep('代码测试', '测试生成的代码', input),
      this.createDocumentationStep('文档生成', '生成项目文档', input),
      this.createCodeDeploymentStep('代码部署', '部署生成的代码', input)
    ];
  }
} 