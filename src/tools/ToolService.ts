import * as vscode from "vscode";
import { ITool, ToolType, ToolConfig, ToolResult, ToolParams } from "./ITool";
import { ToolManager } from "./ToolManager";
import { ToolFactory } from "./ToolFactory";

/**
 * 工具服务类，提供工具相关的服务和API
 */
export class ToolService {
    private static _instance: ToolService;
    private _toolManager: ToolManager;
    private _disposables: vscode.Disposable[];
    private _eventEmitter: vscode.EventEmitter<ToolResult>;
    private _onToolExecuted: vscode.Event<ToolResult>;

    private constructor() {
        this._toolManager = ToolManager.getInstance();
        this._disposables = [];
        this._eventEmitter = new vscode.EventEmitter<ToolResult>();
        this._onToolExecuted = this._eventEmitter.event;
    }

    /**
     * 获取工具服务实例（单例模式）
     */
    public static getInstance(): ToolService {
        if (!ToolService._instance) {
            ToolService._instance = new ToolService();
        }
        return ToolService._instance;
    }

    /**
     * 工具执行完成事件
     */
    public get onToolExecuted(): vscode.Event<ToolResult> {
        return this._onToolExecuted;
    }

    /**
     * 初始化工具服务
     * @param context VSCode扩展上下文
     */
    public initialize(context: vscode.ExtensionContext): void {
        // 注册命令
        this._registerCommands(context);
        
        // 添加到上下文的订阅中
        context.subscriptions.push(this);
    }

    /**
     * 注册命令
     * @param context VSCode扩展上下文
     */
    private _registerCommands(context: vscode.ExtensionContext): void {
        // 注册执行工具命令
        const executeToolCommand = vscode.commands.registerCommand(
            "deepagents.executeTool",
            async (toolName: string, params: ToolParams) => {
                return await this.executeTool(toolName, params);
            }
        );
        
        // 注册获取所有工具命令
        const getAllToolsCommand = vscode.commands.registerCommand(
            "deepagents.getAllTools",
            () => {
                return this.getAllTools();
            }
        );
        
        // 添加到订阅中
        this._disposables.push(executeToolCommand, getAllToolsCommand);
        context.subscriptions.push(executeToolCommand, getAllToolsCommand);
    }

    /**
     * 创建工具
     * @param type 工具类型
     * @param config 工具配置
     * @returns 创建的工具实例
     */
    public createTool(type: ToolType, config?: ToolConfig): ITool {
        const tool = ToolFactory.createTool(type, config);
        this._toolManager.registerTool(tool);
        return tool;
    }

    /**
     * 根据名称创建工具
     * @param name 工具名称
     * @param config 工具配置
     * @returns 创建的工具实例
     */
    public createToolByName(name: string, config?: ToolConfig): ITool {
        const tool = ToolFactory.createToolByName(name, config);
        this._toolManager.registerTool(tool);
        return tool;
    }

    /**
     * 获取工具
     * @param toolName 工具名称
     * @returns 工具实例或undefined（如果不存在）
     */
    public getTool(toolName: string): ITool | undefined {
        return this._toolManager.getTool(toolName);
    }

    /**
     * 获取所有工具
     * @returns 所有工具的数组
     */
    public getAllTools(): ITool[] {
        return this._toolManager.getAllTools();
    }

    /**
     * 执行工具
     * @param toolName 工具名称
     * @param params 执行参数
     * @returns 执行结果的Promise
     */
    public async executeTool(toolName: string, params: ToolParams): Promise<ToolResult> {
        try {
            const result = await this._toolManager.executeTool(toolName, params);
            
            // 触发工具执行完成事件
            this._eventEmitter.fire(result);
            
            return result;
        } catch (error) {
            console.error(`Error executing tool ${toolName}:`, error);
            throw error;
        }
    }

    /**
     * 释放资源
     */
    public dispose(): void {
        // 释放所有订阅
        this._disposables.forEach(d => d.dispose());
        this._disposables = [];
        
        // 释放事件发射器
        this._eventEmitter.dispose();
    }
}
