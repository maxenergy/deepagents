import * as vscode from 'vscode';
import * as child_process from 'child_process';
import { BaseTool } from '../BaseTool';
import { ToolType } from '../ToolManager';

/**
 * 终端命令结果接口
 */
export interface TerminalCommandResult {
  /**
   * 退出码
   */
  exitCode: number;
  
  /**
   * 标准输出
   */
  stdout: string;
  
  /**
   * 标准错误
   */
  stderr: string;
  
  /**
   * 是否成功
   */
  success: boolean;
  
  /**
   * 执行时间（毫秒）
   */
  executionTime: number;
}

/**
 * 终端工具参数接口
 */
export interface TerminalParams {
  /**
   * 命令
   */
  command: string;
  
  /**
   * 参数
   */
  args?: string[];
  
  /**
   * 工作目录
   */
  cwd?: string;
  
  /**
   * 环境变量
   */
  env?: Record<string, string>;
  
  /**
   * 超时时间（毫秒）
   */
  timeout?: number;
  
  /**
   * 是否使用Shell
   */
  shell?: boolean;
  
  /**
   * 是否显示在VSCode终端
   */
  showInTerminal?: boolean;
}

/**
 * 终端工具类
 * 
 * 提供命令行操作功能
 */
export class TerminalTool extends BaseTool {
  private terminals: Map<string, vscode.Terminal> = new Map();
  
  /**
   * 构造函数
   */
  constructor() {
    super(
      'terminal',
      '终端工具',
      ToolType.TERMINAL,
      '提供命令行操作功能，包括执行命令、管理终端等'
    );
  }
  
  /**
   * 初始化回调
   */
  protected async onInitialize(): Promise<void> {
    // 监听终端关闭事件
    this._context.subscriptions.push(
      vscode.window.onDidCloseTerminal(terminal => {
        // 从映射中移除已关闭的终端
        for (const [id, t] of this.terminals.entries()) {
          if (t === terminal) {
            this.terminals.delete(id);
            break;
          }
        }
      })
    );
  }
  
  /**
   * 执行终端操作
   * 
   * @param params 参数
   * @returns 操作结果
   */
  protected async onExecute(params: TerminalParams): Promise<any> {
    // 验证参数
    if (!params.command) {
      throw new Error('命令不能为空');
    }
    
    // 如果需要在VSCode终端中显示，则使用VSCode终端API
    if (params.showInTerminal) {
      return this.executeInVSCodeTerminal(params);
    } else {
      // 否则使用子进程执行
      return this.executeCommand(params);
    }
  }
  
  /**
   * 在VSCode终端中执行命令
   * 
   * @param params 参数
   * @returns 终端ID
   */
  private async executeInVSCodeTerminal(params: TerminalParams): Promise<string> {
    // 生成唯一ID
    const terminalId = `terminal_${Date.now()}`;
    
    // 创建终端选项
    const options: vscode.TerminalOptions = {
      name: `DeepAgents: ${params.command}`,
      cwd: params.cwd,
      env: params.env
    };
    
    // 创建终端
    const terminal = vscode.window.createTerminal(options);
    
    // 存储终端引用
    this.terminals.set(terminalId, terminal);
    
    // 显示终端
    terminal.show();
    
    // 构建完整命令
    let fullCommand = params.command;
    
    if (params.args && params.args.length > 0) {
      fullCommand += ' ' + params.args.join(' ');
    }
    
    // 发送命令到终端
    terminal.sendText(fullCommand);
    
    return terminalId;
  }
  
  /**
   * 执行命令
   * 
   * @param params 参数
   * @returns 命令结果
   */
  private async executeCommand(params: TerminalParams): Promise<TerminalCommandResult> {
    return new Promise<TerminalCommandResult>((resolve, reject) => {
      const startTime = Date.now();
      let timeout: NodeJS.Timeout | null = null;
      
      // 设置选项
      const options: child_process.SpawnOptions = {
        cwd: params.cwd,
        env: params.env ? { ...process.env, ...params.env } : process.env,
        shell: params.shell !== false
      };
      
      // 创建子进程
      const childProcess = params.shell !== false
        ? child_process.spawn(params.command, params.args || [], options)
        : child_process.spawn(params.command, params.args || [], options);
      
      let stdout = '';
      let stderr = '';
      
      // 设置超时
      if (params.timeout) {
        timeout = setTimeout(() => {
          childProcess.kill();
          reject(new Error(`命令超时: ${params.command}`));
        }, params.timeout);
      }
      
      // 收集输出
      childProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      childProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      // 处理完成
      childProcess.on('close', (code) => {
        if (timeout) {
          clearTimeout(timeout);
        }
        
        const endTime = Date.now();
        
        const result: TerminalCommandResult = {
          exitCode: code || 0,
          stdout,
          stderr,
          success: code === 0,
          executionTime: endTime - startTime
        };
        
        resolve(result);
      });
      
      // 处理错误
      childProcess.on('error', (error) => {
        if (timeout) {
          clearTimeout(timeout);
        }
        
        reject(error);
      });
    });
  }
  
  /**
   * 获取终端
   * 
   * @param id 终端ID
   * @returns 终端
   */
  public getTerminal(id: string): vscode.Terminal | null {
    return this.terminals.get(id) || null;
  }
  
  /**
   * 关闭终端
   * 
   * @param id 终端ID
   * @returns 是否成功
   */
  public closeTerminal(id: string): boolean {
    const terminal = this.getTerminal(id);
    
    if (terminal) {
      terminal.dispose();
      this.terminals.delete(id);
      return true;
    }
    
    return false;
  }
  
  /**
   * 关闭所有终端
   */
  public closeAllTerminals(): void {
    for (const terminal of this.terminals.values()) {
      terminal.dispose();
    }
    
    this.terminals.clear();
  }
  
  /**
   * 销毁回调
   */
  protected onDispose(): void {
    // 关闭所有终端
    this.closeAllTerminals();
  }
}