import * as vscode from "vscode";
import { ITool, ToolType } from "./ITool";
import { BaseTool } from "./BaseTool";
import { CodeAnalysisTool } from "./codeAnalysis/CodeAnalysisTool";
import { GitTool } from "./versionControl/GitTool";

/**
 * 工具管理器类，负责管理所有工具的注册、获取和执行
 */
export class ToolManager {
    private static _instance: ToolManager;
    private _tools: Map<string, ITool>;
    private _disposables: vscode.Disposable[];

    private constructor() {
        this._tools = new Map<string, ITool>();
        this._disposables = [];
        this._registerDefaultTools();
    }

    /**
     * 获取工具管理器实例（单例模式）
     */
    public static getInstance(): ToolManager {
        if (!ToolManager._instance) {
            ToolManager._instance = new ToolManager();
        }
        return ToolManager._instance;
    }

    /**
     * 注册默认工具
     */
    private _registerDefaultTools(): void {
        // 注册代码分析工具
        this.registerTool(new CodeAnalysisTool());
        
        // 注册版本控制工具
        this.registerTool(new GitTool());
        
        // 可以在这里注册更多默认工具
    }

    /**
     * 注册工具
     * @param tool 要注册的工具
     * @returns 是否注册成功
     */
    public registerTool(tool: ITool): boolean {
        if (this._tools.has(tool.name)) {
            console.warn(`Tool with name ${tool.name} already exists. Skipping registration.`);
            return false;
        }

        this._tools.set(tool.name, tool);
        console.log(`Tool ${tool.name} registered successfully.`);
        return true;
    }

    /**
     * 注销工具
     * @param toolName 要注销的工具名称
     * @returns 是否注销成功
     */
    public unregisterTool(toolName: string): boolean {
        if (!this._tools.has(toolName)) {
            console.warn(`Tool with name ${toolName} does not exist. Cannot unregister.`);
            return false;
        }

        const tool = this._tools.get(toolName);
        if (tool) {
            tool.dispose();
        }
        
        this._tools.delete(toolName);
        console.log(`Tool ${toolName} unregistered successfully.`);
        return true;
    }

    /**
     * 获取工具
     * @param toolName 工具名称
     * @returns 工具实例或undefined（如果不存在）
     */
    public getTool(toolName: string): ITool | undefined {
        return this._tools.get(toolName);
    }

    /**
     * 获取特定类型的所有工具
     * @param type 工具类型
     * @returns 指定类型的工具数组
     */
    public getToolsByType(type: ToolType): ITool[] {
        const tools: ITool[] = [];
        this._tools.forEach(tool => {
            if (tool.type === type) {
                tools.push(tool);
            }
        });
        return tools;
    }

    /**
     * 获取所有工具
     * @returns 所有工具的数组
     */
    public getAllTools(): ITool[] {
        return Array.from(this._tools.values());
    }

    /**
     * 执行工具
     * @param toolName 工具名称
     * @param params 执行参数
     * @returns 执行结果的Promise
     */
    public async executeTool(toolName: string, params: any): Promise<any> {
        const tool = this.getTool(toolName);
        if (!tool) {
            throw new Error(`Tool with name ${toolName} not found.`);
        }

        if (!tool.enabled) {
            throw new Error(`Tool ${toolName} is disabled.`);
        }

        try {
            return await tool.execute(params);
        } catch (error) {
            console.error(`Error executing tool ${toolName}:`, error);
            throw error;
        }
    }

    /**
     * 启用工具
     * @param toolName 工具名称
     * @returns 是否成功启用
     */
    public enableTool(toolName: string): boolean {
        const tool = this.getTool(toolName);
        if (!tool) {
            console.warn(`Tool with name ${toolName} not found. Cannot enable.`);
            return false;
        }

        tool.enable();
        return true;
    }

    /**
     * 禁用工具
     * @param toolName 工具名称
     * @returns 是否成功禁用
     */
    public disableTool(toolName: string): boolean {
        const tool = this.getTool(toolName);
        if (!tool) {
            console.warn(`Tool with name ${toolName} not found. Cannot disable.`);
            return false;
        }

        tool.disable();
        return true;
    }

    /**
     * 释放资源
     */
    public dispose(): void {
        // 释放所有工具资源
        this._tools.forEach(tool => {
            tool.dispose();
        });
        
        // 清空工具集合
        this._tools.clear();
        
        // 释放所有订阅
        this._disposables.forEach(d => d.dispose());
        this._disposables = [];
    }
}
