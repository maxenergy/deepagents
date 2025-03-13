import * as vscode from 'vscode';

/**
 * ExtensionCore 类
 * 
 * 负责扩展的核心功能，包括扩展生命周期管理、命令注册和上下文管理
 */
export class ExtensionCore {
  private context: vscode.ExtensionContext;
  private outputChannel: vscode.OutputChannel;

  /**
   * 构造函数
   * 
   * @param context VSCode 扩展上下文
   * @param outputChannel 输出通道
   */
  constructor(context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel) {
    this.context = context;
    this.outputChannel = outputChannel;
    this.initialize();
  }

  /**
   * 初始化扩展核心
   */
  private initialize(): void {
    this.outputChannel.appendLine('初始化 ExtensionCore');
    this.registerEventHandlers();
  }

  /**
   * 注册事件处理程序
   */
  private registerEventHandlers(): void {
    // 监听配置变更
    vscode.workspace.onDidChangeConfiguration(this.handleConfigChange, this, this.context.subscriptions);
    
    // 监听窗口状态变化
    vscode.window.onDidChangeWindowState(this.handleWindowStateChange, this, this.context.subscriptions);
  }

  /**
   * 处理配置变更事件
   * 
   * @param event 配置变更事件
   */
  private handleConfigChange(event: vscode.ConfigurationChangeEvent): void {
    if (event.affectsConfiguration('deepagents')) {
      this.outputChannel.appendLine('DeepAgents 配置已更改');
      // 通知其他组件配置已更改
      vscode.commands.executeCommand('deepagents.configChanged');
    }
  }

  /**
   * 处理窗口状态变化事件
   * 
   * @param windowState 窗口状态
   */
  private handleWindowStateChange(windowState: vscode.WindowState): void {
    if (windowState.focused) {
      this.outputChannel.appendLine('VSCode 窗口获得焦点');
    } else {
      this.outputChannel.appendLine('VSCode 窗口失去焦点');
    }
  }

  /**
   * 获取扩展上下文
   * 
   * @returns VSCode 扩展上下文
   */
  public getContext(): vscode.ExtensionContext {
    return this.context;
  }

  /**
   * 获取输出通道
   * 
   * @returns 输出通道
   */
  public getOutputChannel(): vscode.OutputChannel {
    return this.outputChannel;
  }

  /**
   * 获取扩展配置
   * 
   * @param section 配置节
   * @returns 配置值
   */
  public getConfiguration<T>(section: string): T | undefined {
    return vscode.workspace.getConfiguration('deepagents').get<T>(section);
  }

  /**
   * 更新扩展配置
   * 
   * @param section 配置节
   * @param value 配置值
   * @param global 是否全局配置
   */
  public async updateConfiguration<T>(section: string, value: T, global: boolean = true): Promise<void> {
    await vscode.workspace.getConfiguration('deepagents').update(section, value, global);
  }
}