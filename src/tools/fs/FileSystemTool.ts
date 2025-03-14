import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { BaseTool } from '../BaseTool';
import { ToolType } from '../ToolManager';

/**
 * 文件信息接口
 */
export interface FileInfo {
  /**
   * 文件路径
   */
  path: string;
  
  /**
   * 文件名
   */
  name: string;
  
  /**
   * 是否是目录
   */
  isDirectory: boolean;
  
  /**
   * 文件大小（字节）
   */
  size: number;
  
  /**
   * 创建时间
   */
  createdAt: Date;
  
  /**
   * 修改时间
   */
  modifiedAt: Date;
  
  /**
   * 文件扩展名
   */
  extension: string;
}

/**
 * 文件系统工具参数接口
 */
export interface FileSystemParams {
  /**
   * 命令
   */
  command: string;
  
  /**
   * 路径
   */
  path: string;
  
  /**
   * 目标路径（用于复制、移动等操作）
   */
  targetPath?: string;
  
  /**
   * 内容（用于写入文件）
   */
  content?: string;
  
  /**
   * 编码（用于读写文件）
   */
  encoding?: string;
  
  /**
   * 递归标志（用于目录操作）
   */
  recursive?: boolean;
  
  /**
   * 过滤器（用于列出文件）
   */
  filter?: string;
}

/**
 * 文件系统工具类
 * 
 * 提供文件和目录操作功能
 */
export class FileSystemTool extends BaseTool {
  /**
   * 构造函数
   */
  constructor() {
    super(
      'file_system',
      '文件系统工具',
      ToolType.FILE_SYSTEM,
      '提供文件和目录操作功能，包括读写文件、创建目录、列出文件等'
    );
  }
  
  /**
   * 初始化回调
   */
  protected async onInitialize(): Promise<void> {
    // 初始化文件系统工具
  }
  
  /**
   * 执行文件系统操作
   * 
   * @param params 参数
   * @returns 操作结果
   */
  protected async onExecute(params: FileSystemParams): Promise<any> {
    // 验证参数
    if (!params.command) {
      throw new Error('命令不能为空');
    }
    
    if (!params.path) {
      throw new Error('路径不能为空');
    }
    
    // 根据命令执行不同的操作
    switch (params.command) {
      case 'read':
        return this.readFile(params.path, params.encoding);
      case 'write':
        return this.writeFile(params.path, params.content || '', params.encoding);
      case 'append':
        return this.appendFile(params.path, params.content || '', params.encoding);
      case 'delete':
        return this.deleteFile(params.path);
      case 'exists':
        return this.fileExists(params.path);
      case 'stat':
        return this.getFileInfo(params.path);
      case 'list':
        return this.listFiles(params.path, params.filter);
      case 'mkdir':
        return this.createDirectory(params.path, params.recursive);
      case 'rmdir':
        return this.deleteDirectory(params.path, params.recursive);
      case 'copy':
        return this.copyFile(params.path, params.targetPath || '');
      case 'move':
        return this.moveFile(params.path, params.targetPath || '');
      case 'rename':
        return this.renameFile(params.path, params.targetPath || '');
      default:
        throw new Error(`未知命令: ${params.command}`);
    }
  }
  
  /**
   * 读取文件
   * 
   * @param filePath 文件路径
   * @param encoding 编码
   * @returns 文件内容
   */
  private async readFile(filePath: string, encoding?: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      fs.readFile(filePath, encoding || 'utf8', (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data.toString());
        }
      });
    });
  }
  
  /**
   * 写入文件
   * 
   * @param filePath 文件路径
   * @param content 内容
   * @param encoding 编码
   * @returns 是否成功
   */
  private async writeFile(filePath: string, content: string, encoding?: string): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      fs.writeFile(filePath, content, encoding || 'utf8', (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(true);
        }
      });
    });
  }
  
  /**
   * 追加文件
   * 
   * @param filePath 文件路径
   * @param content 内容
   * @param encoding 编码
   * @returns 是否成功
   */
  private async appendFile(filePath: string, content: string, encoding?: string): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      fs.appendFile(filePath, content, encoding || 'utf8', (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(true);
        }
      });
    });
  }
  
  /**
   * 删除文件
   * 
   * @param filePath 文件路径
   * @returns 是否成功
   */
  private async deleteFile(filePath: string): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      fs.unlink(filePath, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(true);
        }
      });
    });
  }
  
  /**
   * 检查文件是否存在
   * 
   * @param filePath 文件路径
   * @returns 是否存在
   */
  private async fileExists(filePath: string): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      fs.access(filePath, fs.constants.F_OK, (err) => {
        resolve(!err);
      });
    });
  }
  
  /**
   * 获取文件信息
   * 
   * @param filePath 文件路径
   * @returns 文件信息
   */
  private async getFileInfo(filePath: string): Promise<FileInfo> {
    return new Promise<FileInfo>((resolve, reject) => {
      fs.stat(filePath, (err, stats) => {
        if (err) {
          reject(err);
        } else {
          const parsedPath = path.parse(filePath);
          
          resolve({
            path: filePath,
            name: parsedPath.base,
            isDirectory: stats.isDirectory(),
            size: stats.size,
            createdAt: stats.birthtime,
            modifiedAt: stats.mtime,
            extension: parsedPath.ext
          });
        }
      });
    });
  }
  
  /**
   * 列出目录中的文件
   * 
   * @param dirPath 目录路径
   * @param filter 过滤器
   * @returns 文件列表
   */
  private async listFiles(dirPath: string, filter?: string): Promise<FileInfo[]> {
    return new Promise<FileInfo[]>((resolve, reject) => {
      fs.readdir(dirPath, async (err, files) => {
        if (err) {
          reject(err);
        } else {
          try {
            const fileInfos: FileInfo[] = [];
            
            // 创建正则表达式过滤器
            const regex = filter ? new RegExp(filter) : null;
            
            for (const file of files) {
              // 如果有过滤器，检查文件名是否匹配
              if (regex && !regex.test(file)) {
                continue;
              }
              
              const filePath = path.join(dirPath, file);
              
              try {
                const fileInfo = await this.getFileInfo(filePath);
                fileInfos.push(fileInfo);
              } catch (error) {
                // 忽略无法获取信息的文件
                console.error(`无法获取文件信息: ${filePath}`, error);
              }
            }
            
            resolve(fileInfos);
          } catch (error) {
            reject(error);
          }
        }
      });
    });
  }
  
  /**
   * 创建目录
   * 
   * @param dirPath 目录路径
   * @param recursive 是否递归创建
   * @returns 是否成功
   */
  private async createDirectory(dirPath: string, recursive?: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      fs.mkdir(dirPath, { recursive: recursive !== false }, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(true);
        }
      });
    });
  }
  
  /**
   * 删除目录
   * 
   * @param dirPath 目录路径
   * @param recursive 是否递归删除
   * @returns 是否成功
   */
  private async deleteDirectory(dirPath: string, recursive?: boolean): Promise<boolean> {
    if (recursive) {
      return this.deleteDirectoryRecursive(dirPath);
    } else {
      return new Promise<boolean>((resolve, reject) => {
        fs.rmdir(dirPath, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve(true);
          }
        });
      });
    }
  }
  
  /**
   * 递归删除目录
   * 
   * @param dirPath 目录路径
   * @returns 是否成功
   */
  private async deleteDirectoryRecursive(dirPath: string): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      fs.rm(dirPath, { recursive: true, force: true }, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(true);
        }
      });
    });
  }
  
  /**
   * 复制文件
   * 
   * @param sourcePath 源路径
   * @param targetPath 目标路径
   * @returns 是否成功
   */
  private async copyFile(sourcePath: string, targetPath: string): Promise<boolean> {
    if (!targetPath) {
      throw new Error('目标路径不能为空');
    }
    
    return new Promise<boolean>((resolve, reject) => {
      fs.copyFile(sourcePath, targetPath, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(true);
        }
      });
    });
  }
  
  /**
   * 移动文件
   * 
   * @param sourcePath 源路径
   * @param targetPath 目标路径
   * @returns 是否成功
   */
  private async moveFile(sourcePath: string, targetPath: string): Promise<boolean> {
    if (!targetPath) {
      throw new Error('目标路径不能为空');
    }
    
    try {
      // 先复制文件
      await this.copyFile(sourcePath, targetPath);
      
      // 然后删除源文件
      await this.deleteFile(sourcePath);
      
      return true;
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * 重命名文件
   * 
   * @param oldPath 旧路径
   * @param newPath 新路径
   * @returns 是否成功
   */
  private async renameFile(oldPath: string, newPath: string): Promise<boolean> {
    if (!newPath) {
      throw new Error('新路径不能为空');
    }
    
    return new Promise<boolean>((resolve, reject) => {
      fs.rename(oldPath, newPath, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(true);
        }
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