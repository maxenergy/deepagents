import * as vscode from 'vscode';

/**
 * 代理角色枚举
 */
export enum AgentRole {
    PRODUCT_MANAGER = 'product_manager',
    ARCHITECT = 'architect',
    DEVELOPER = 'developer',
    TESTER = 'tester',
    DEVOPS = 'devops',
    DOCUMENTATION = 'documentation',
    CUSTOM = 'custom'
}

/**
 * 代理能力枚举
 */
export enum AgentCapability {
    REQUIREMENTS_ANALYSIS = 'requirements_analysis',
    SYSTEM_DESIGN = 'system_design',
    CODE_GENERATION = 'code_generation',
    TESTING = 'testing',
    DEPLOYMENT = 'deployment',
    DOCUMENTATION = 'documentation'
}

/**
 * 代理状态枚举
 */
export enum AgentState {
    IDLE = 'idle',
    INITIALIZING = 'initializing',
    PROCESSING = 'processing',
    ERROR = 'error'
}

/**
 * 代理配置接口
 */
export interface AgentConfig {
    id: string;
    name: string;
    role: AgentRole;
    [key: string]: any;
}

/**
 * 代理输入接口
 */
export interface AgentInput {
    prompt?: string;
    context?: any;
    [key: string]: any;
}

/**
 * 代理输出接口
 */
export interface AgentOutput {
    agentId: string;
    timestamp: Date;
    status: 'success' | 'error' | 'in_progress';
    message: string;
    [key: string]: any;
}

/**
 * 代理动作接口
 */
export interface AgentAction {
    type: string;
    payload: any;
}

/**
 * 代理接口
 */
export interface IAgent {
    id: string;
    name: string;
    role: AgentRole;
    capabilities: string[];
    state: AgentState;
    
    initialize(config: AgentConfig): Promise<void>;
    process(input: AgentInput): Promise<AgentOutput>;
    collaborate(agents: IAgent[]): Promise<void>;
    getState(): AgentState;
    setState(state: AgentState): void;
}
