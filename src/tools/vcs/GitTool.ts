import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { BaseTool } from '../BaseTool';
import { ToolType } from '../ToolManager';
import { spawn } from 'child_process';

/**
 * Git命令结果接口
 */
export interface GitCommandResult {
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
}

/**
 * Git状态接口
 */
export interface GitStatus {
  /**
   * 当前分支
   */
  branch: string;
  
  /**
   * 是否有未提交的更改
   */
  hasChanges: boolean;
  
  /**
   * 已修改的文件
   */
  modified: string[];
  
  /**
   * 已添加的文件
   */
  added: string[];
  
  /**
   * 已删除的文件
   */
  deleted: string[];
  
  /**
   * 未跟踪的文件
   */
  untracked: string[];
  
  /**
   * 冲突的文件
   */
  conflicts: string[];
}

/**
 * Git提交接口
 */
export interface GitCommit {
  /**
   * 提交哈希
   */
  hash: string;
  
  /**
   * 作者
   */
  author: string;
  
  /**
   * 日期
   */
  date: string;
  
  /**
   * 提交消息
   */
  message: string;
}

/**
 * Git分支接口
 */
export interface GitBranch {
  /**
   * 分支名称
   */
  name: string;
  
  /**
   * 是否是当前分支
   */
  current: boolean;
  
  /**
   * 最新提交哈希
   */
  commit: string;
  
  /**
   * 最新提交消息
   */
  message: string;
}

/**
 * Git工具参数接口
 */
export interface GitToolParams {
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
   * 超时时间（毫秒）
   */
  timeout?: number;
}

/**
 * Git工具类
 * 
 * 提供Git版本控制功能
 */
export class GitTool extends BaseTool {
  /**
   * 构造函数
   */
  constructor() {
    super(
      'git',
      'Git工具',
      ToolType.VERSION_CONTROL,
      '提供Git版本控制功能，包括提交、分支管理、状态查询等'
    );
  }
  
  /**
   * 初始化回调
   */
  protected async onInitialize(): Promise<void> {
    // 检查Git是否可用
    try {
      await this.executeGitCommand('--version');
    } catch (error: any) {
      throw new Error(`Git不可用: ${error.message}`);
    }
  }
  
  /**
   * 执行Git命令
   * 
   * @param params 参数
   * @returns 命令结果
   */
  protected async onExecute(params: GitToolParams): Promise<any> {
    // 验证参数
    if (!params.command) {
      throw new Error('命令不能为空');
    }
    
    // 根据命令执行不同的操作
    switch (params.command) {
      case 'status':
        return this.getStatus(params.cwd);
      case 'commit':
        return this.commit(params.args?.[0] || '', params.cwd);
      case 'add':
        return this.add(params.args || ['.'], params.cwd);
      case 'push':
        return this.push(params.args?.[0], params.args?.[1], params.cwd);
      case 'pull':
        return this.pull(params.cwd);
      case 'branch':
        return this.getBranches(params.cwd);
      case 'checkout':
        return this.checkout(params.args?.[0] || '', params.cwd);
      case 'log':
        return this.getLog(params.args?.[0] || '10', params.cwd);
      case 'diff':
        return this.getDiff(params.args?.[0], params.args?.[1], params.cwd);
      case 'clone':
        return this.clone(params.args?.[0] || '', params.args?.[1] || '.', params.cwd);
      case 'execute':
        return this.executeGitCommand(...(params.args || []), { cwd: params.cwd, timeout: params.timeout });
      default:
        throw new Error(`未知命令: ${params.command}`);
    }
  }
  
  /**
   * 获取Git状态
   * 
   * @param cwd 工作目录
   * @returns Git状态
   */
  private async getStatus(cwd?: string): Promise<GitStatus> {
    const result = await this.executeGitCommand('status', '--porcelain', '-b', { cwd });
    
    // 解析状态输出
    const lines = result.stdout.split('\n').filter(line => line.trim() !== '');
    
    // 解析分支信息
    const branchLine = lines[0];
    const branchMatch = branchLine.match(/## ([^.]+)(?:\.\.\.([^[ ]+))?/);
    const branch = branchMatch ? branchMatch[1] : 'unknown';
    
    // 初始化状态对象
    const status: GitStatus = {
      branch,
      hasChanges: lines.length > 1,
      modified: [],
      added: [],
      deleted: [],
      untracked: [],
      conflicts: []
    };
    
    // 解析文件状态
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const statusCode = line.substring(0, 2);
      const file = line.substring(3);
      
      if (statusCode === 'M ' || statusCode === ' M') {
        status.modified.push(file);
      } else if (statusCode === 'A ' || statusCode === 'AM') {
        status.added.push(file);
      } else if (statusCode === 'D ' || statusCode === ' D') {
        status.deleted.push(file);
      } else if (statusCode === '??') {
        status.untracked.push(file);
      } else if (statusCode === 'UU') {
        status.conflicts.push(file);
      }
    }
    
    return status;
  }
  
  /**
   * 提交更改
   * 
   * @param message 提交消息
   * @param cwd 工作目录
   * @returns 提交结果
   */
  private async commit(message: string, cwd?: string): Promise<GitCommandResult> {
    if (!message) {
      throw new Error('提交消息不能为空');
    }
    
    return this.executeGitCommand('commit', '-m', message, { cwd });
  }
  
  /**
   * 添加文件到暂存区
   * 
   * @param files 文件列表
   * @param cwd 工作目录
   * @returns 添加结果
   */
  private async add(files: string[], cwd?: string): Promise<GitCommandResult> {
    if (files.length === 0) {
      files = ['.'];
    }
    
    return this.executeGitCommand('add', ...files, { cwd });
  }
  
  /**
   * 推送更改
   * 
   * @param remote 远程仓库
   * @param branch 分支
   * @param cwd 工作目录
   * @returns 推送结果
   */
  private async push(remote?: string, branch?: string, cwd?: string): Promise<GitCommandResult> {
    const args: string[] = ['push'];
    
    if (remote) {
      args.push(remote);
      
      if (branch) {
        args.push(branch);
      }
    }
    
    return this.executeGitCommand(...args, { cwd });
  }
  
  /**
   * 拉取更改
   * 
   * @param cwd 工作目录
   * @returns 拉取结果
   */
  private async pull(cwd?: string): Promise<GitCommandResult> {
    return this.executeGitCommand('pull', { cwd });
  }
  
  /**
   * 获取分支列表
   * 
   * @param cwd 工作目录
   * @returns 分支列表
   */
  private async getBranches(cwd?: string): Promise<GitBranch[]> {
    const result = await this.executeGitCommand('branch', '--verbose', { cwd });
    
    // 解析分支输出
    const lines = result.stdout.split('\n').filter(line => line.trim() !== '');
    const branches: GitBranch[] = [];
    
    for (const line of lines) {
      const match = line.match(/^(\*?)\s+(\S+)\s+(\S+)\s+(.*)$/);
      
      if (match) {
        branches.push({
          current: match[1] === '*',
          name: match[2],
          commit: match[3],
          message: match[4].trim()
        });
      }
    }
    
    return branches;
  }
  
  /**
   * 切换分支
   * 
   * @param branch 分支名称
   * @param cwd 工作目录
   * @returns 切换结果
   */
  private async checkout(branch: string, cwd?: string): Promise<GitCommandResult> {
    if (!branch) {
      throw new Error('分支名称不能为空');
    }
    
    return this.executeGitCommand('checkout', branch, { cwd });
  }
  
  /**
   * 获取提交日志
   * 
   * @param count 提交数量
   * @param cwd 工作目录
   * @returns 提交日志
   */
  private async getLog(count: string, cwd?: string): Promise<GitCommit[]> {
    const limit = parseInt(count, 10) || 10;
    const result = await this.executeGitCommand(
      'log',
      `--max-count=${limit}`,
      '--pretty=format:%H|%an|%ad|%s',
      '--date=iso',
      { cwd }
    );
    
    // 解析日志输出
    const lines = result.stdout.split('\n').filter(line => line.trim() !== '');
    const commits: GitCommit[] = [];
    
    for (const line of lines) {
      const parts = line.split('|');
      
      if (parts.length >= 4) {
        commits.push({
          hash: parts[0],
          author: parts[1],
          date: parts[2],
          message: parts.slice(3).join('|')
        });
      }
    }
    
    return commits;
  }
  
  /**
   * 获取差异
   * 
   * @param file1 文件1
   * @param file2 文件2
   * @param cwd 工作目录
   * @returns 差异结果
   */
  private async getDiff(file1?: string, file2?: string, cwd?: string): Promise<string> {
    const args: string[] = ['diff'];
    
    if (file1) {
      args.push(file1);
      
      if (file2) {
        args.push(file2);
      }
    }
    
    const result = await this.executeGitCommand(...args, { cwd });
    return result.stdout;
  }
  
  /**
   * 克隆仓库
   * 
   * @param url 仓库URL
   * @param directory 目标目录
   * @param cwd 工作目录
   * @returns 克隆结果
   */
  private async clone(url: string, directory: string, cwd?: string): Promise<GitCommandResult> {
    if (!url) {
      throw new Error('仓库URL不能为空');
    }
    
    return this.executeGitCommand('clone', url, directory, { cwd });
  }
  
  /**
   * 执行Git命令
   * 
   * @param args 命令参数
   * @param options 选项
   * @returns 命令结果
   */
  private executeGitCommand(...args: any[]): Promise<GitCommandResult> {
    // 提取选项
    let options: { cwd?: string; timeout?: number } = {};
    if (args.length > 0 && typeof args[args.length - 1] === 'object' && !(args[args.length - 1] instanceof Array)) {
      options = args.pop();
    }
    
    return new Promise<GitCommandResult>((resolve, reject) => {
      // 创建子进程
      const git = spawn('git', args, {
        cwd: options.cwd || process.cwd(),
        env: process.env
      });
      
      let stdout = '';
      let stderr = '';
      let timeout: NodeJS.Timeout | null = null;
      
      // 设置超时
      if (options.timeout) {
        timeout = setTimeout(() => {
          git.kill();
          reject(new Error(`命令超时: git ${args.join(' ')}`));
        }, options.timeout);
      }
      
      // 收集输出
      git.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      git.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      // 处理完成
      git.on('close', (code) => {
        if (timeout) {
          clearTimeout(timeout);
        }
        
        const result: GitCommandResult = {
          exitCode: code || 0,
          stdout,
          stderr,
          success: code === 0
        };
        
        resolve(result);
      });
      
      // 处理错误
      git.on('error', (error) => {
        if (timeout) {
          clearTimeout(timeout);
        }
        
        reject(error);
      });
    });
  }
  
  /**
   * 销毁回调
   */
  protected onDispose(): void {
    // 清理资源
  }
}