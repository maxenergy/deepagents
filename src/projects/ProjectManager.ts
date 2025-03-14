import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { IProject, IProjectConfig, ProjectStatus, IProjectFile } from './IProject';
import { StorageManager, StorageNamespace } from '../storage/StorageManager';

/**
 * 项目类
 * 
 * 实现 IProject 接口
 */
class Project implements IProject {
  public id: string;
  public name: string;
  public path: string;
  public status: ProjectStatus;
  public config: IProjectConfig;
  public files?: IProjectFile[];
  public createdAt: Date;
  public updatedAt: Date;

  /**
   * 构造函数
   * 
   * @param id 项目 ID
   * @param name 项目名称
   * @param config 项目配置
   */
  constructor(id: string, name: string, config: IProjectConfig) {
    this.id = id;
    this.name = name;
    this.path = config.path;
    this.status = ProjectStatus.CLOSED;
    this.config = config;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * 初始化项目
   * 
   * @param config 项目配置
   */
  public async initialize(config: IProjectConfig): Promise<void> {
    this.config = config;
    this.name = config.name;
    this.path = config.path;
    this.updatedAt = new Date();

    // 检查项目路径是否存在
    if (!fs.existsSync(this.path)) {
      try {
        // 创建项目目录
        fs.mkdirSync(this.path, { recursive: true });
      } catch (error) {
        this.status = ProjectStatus.ERROR;
        throw new Error(`无法创建项目目录: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // 获取项目文件列表
    await this.getFiles();
  }

  /**
   * 打开项目
   */
  public async open(): Promise<void> {
    if (this.status === ProjectStatus.OPEN) {
      return;
    }

    try {
      // 检查项目路径是否存在
      if (!fs.existsSync(this.path)) {
        throw new Error(`项目路径不存在: ${this.path}`);
      }

      // 获取项目文件列表
      await this.getFiles();

      // 在 VSCode 中打开项目文件夹
      const uri = vscode.Uri.file(this.path);
      await vscode.commands.executeCommand('vscode.openFolder', uri);

      this.status = ProjectStatus.OPEN;
      this.updatedAt = new Date();
    } catch (error) {
      this.status = ProjectStatus.ERROR;
      throw new Error(`无法打开项目: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 关闭项目
   */
  public async close(): Promise<void> {
    if (this.status === ProjectStatus.CLOSED) {
      return;
    }

    this.status = ProjectStatus.CLOSED;
    this.updatedAt = new Date();
  }

  /**
   * 获取项目文件
   * 
   * @param filePath 文件路径
   */
  public async getFile(filePath: string): Promise<IProjectFile | null> {
    const fullPath = path.join(this.path, filePath);

    try {
      const stats = fs.statSync(fullPath);
      
      return {
        name: path.basename(fullPath),
        path: filePath,
        isDirectory: stats.isDirectory(),
        size: stats.size,
        lastModified: stats.mtime
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * 获取项目文件列表
   * 
   * @param dirPath 目录路径
   */
  public async getFiles(dirPath?: string): Promise<IProjectFile[]> {
    const fullPath = dirPath ? path.join(this.path, dirPath) : this.path;
    
    try {
      const files: IProjectFile[] = [];
      
      // 读取目录内容
      const entries = fs.readdirSync(fullPath);
      
      for (const entry of entries) {
        const entryPath = path.join(fullPath, entry);
        const relativePath = dirPath ? path.join(dirPath, entry) : entry;
        const stats = fs.statSync(entryPath);
        
        files.push({
          name: entry,
          path: relativePath,
          isDirectory: stats.isDirectory(),
          size: stats.size,
          lastModified: stats.mtime
        });
      }
      
      this.files = files;
      return files;
    } catch (error) {
      throw new Error(`无法获取项目文件列表: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 创建文件
   * 
   * @param filePath 文件路径
   * @param content 文件内容
   */
  public async createFile(filePath: string, content: string): Promise<IProjectFile> {
    const fullPath = path.join(this.path, filePath);
    
    try {
      // 确保目录存在
      const dirPath = path.dirname(fullPath);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      
      // 写入文件内容
      fs.writeFileSync(fullPath, content, 'utf8');
      
      const stats = fs.statSync(fullPath);
      
      const file: IProjectFile = {
        name: path.basename(fullPath),
        path: filePath,
        isDirectory: false,
        size: stats.size,
        lastModified: stats.mtime
      };
      
      // 更新文件列表
      await this.getFiles();
      
      return file;
    } catch (error) {
      throw new Error(`无法创建文件: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 更新文件
   * 
   * @param filePath 文件路径
   * @param content 文件内容
   */
  public async updateFile(filePath: string, content: string): Promise<IProjectFile> {
    const fullPath = path.join(this.path, filePath);
    
    try {
      // 检查文件是否存在
      if (!fs.existsSync(fullPath)) {
        throw new Error(`文件不存在: ${filePath}`);
      }
      
      // 写入文件内容
      fs.writeFileSync(fullPath, content, 'utf8');
      
      const stats = fs.statSync(fullPath);
      
      const file: IProjectFile = {
        name: path.basename(fullPath),
        path: filePath,
        isDirectory: false,
        size: stats.size,
        lastModified: stats.mtime
      };
      
      return file;
    } catch (error) {
      throw new Error(`无法更新文件: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 删除文件
   * 
   * @param filePath 文件路径
   */
  public async deleteFile(filePath: string): Promise<boolean> {
    const fullPath = path.join(this.path, filePath);
    
    try {
      // 检查文件是否存在
      if (!fs.existsSync(fullPath)) {
        return false;
      }
      
      // 检查是否为目录
      const stats = fs.statSync(fullPath);
      if (stats.isDirectory()) {
        return false;
      }
      
      // 删除文件
      fs.unlinkSync(fullPath);
      
      // 更新文件列表
      await this.getFiles();
      
      return true;
    } catch (error) {
      throw new Error(`无法删除文件: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 创建目录
   * 
   * @param dirPath 目录路径
   */
  public async createDirectory(dirPath: string): Promise<IProjectFile> {
    const fullPath = path.join(this.path, dirPath);
    
    try {
      // 创建目录
      fs.mkdirSync(fullPath, { recursive: true });
      
      const stats = fs.statSync(fullPath);
      
      const dir: IProjectFile = {
        name: path.basename(fullPath),
        path: dirPath,
        isDirectory: true,
        lastModified: stats.mtime
      };
      
      // 更新文件列表
      await this.getFiles();
      
      return dir;
    } catch (error) {
      throw new Error(`无法创建目录: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 删除目录
   * 
   * @param dirPath 目录路径
   */
  public async deleteDirectory(dirPath: string): Promise<boolean> {
    const fullPath = path.join(this.path, dirPath);
    
    try {
      // 检查目录是否存在
      if (!fs.existsSync(fullPath)) {
        return false;
      }
      
      // 检查是否为目录
      const stats = fs.statSync(fullPath);
      if (!stats.isDirectory()) {
        return false;
      }
      
      // 删除目录及其内容
      fs.rmdirSync(fullPath, { recursive: true });
      
      // 更新文件列表
      await this.getFiles();
      
      return true;
    } catch (error) {
      throw new Error(`无法删除目录: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/**
 * 项目管理器类
 * 
 * 负责管理项目的创建、打开、关闭和删除
 */
export class ProjectManager {
  private storageManager: StorageManager;
  private projects: Map<string, IProject>;
  private storageKey = 'projects';

  /**
   * 构造函数
   * 
   * @param storageManager 存储管理器
   */
  constructor(storageManager: StorageManager) {
    this.storageManager = storageManager;
    this.projects = new Map<string, IProject>();
    this.loadProjects();
  }

  /**
   * 加载项目列表
   */
  private async loadProjects(): Promise<void> {
    try {
      const storage = this.storageManager.getStorage(StorageNamespace.PROJECTS);
      if (!storage) {
        return;
      }
      
      const projectsData = await storage.get<Record<string, any>[]>(this.storageKey) || [];
      
      for (const projectData of projectsData) {
        const project = new Project(
          projectData.id,
          projectData.name,
          projectData.config
        );
        
        project.status = projectData.status;
        project.files = projectData.files;
        project.createdAt = new Date(projectData.createdAt);
        project.updatedAt = new Date(projectData.updatedAt);
        
        this.projects.set(project.id, project);
      }
    } catch (error) {
      console.error('加载项目列表失败:', error);
    }
  }

  /**
   * 保存项目列表
   */
  private async saveProjects(): Promise<void> {
    try {
      const storage = this.storageManager.getStorage(StorageNamespace.PROJECTS);
      if (!storage) {
        return;
      }
      
      const projectsData = Array.from(this.projects.values()).map(project => ({
        id: project.id,
        name: project.name,
        path: project.path,
        status: project.status,
        config: project.config,
        files: project.files,
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString()
      }));
      
      await storage.set(this.storageKey, projectsData);
    } catch (error) {
      console.error('保存项目列表失败:', error);
    }
  }

  /**
   * 创建项目
   * 
   * @param name 项目名称
   * @param config 项目配置
   */
  public async createProject(name: string, config: IProjectConfig): Promise<IProject> {
    const id = uuidv4();
    const project = new Project(id, name, config);
    
    try {
      project.status = ProjectStatus.CREATING;
      await project.initialize(config);
      project.status = ProjectStatus.CLOSED;
      
      this.projects.set(id, project);
      await this.saveProjects();
      
      return project;
    } catch (error) {
      project.status = ProjectStatus.ERROR;
      throw new Error(`创建项目失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 获取项目
   * 
   * @param id 项目 ID
   */
  public async getProject(id: string): Promise<IProject | null> {
    return this.projects.get(id) || null;
  }

  /**
   * 获取所有项目
   */
  public async getAllProjects(): Promise<IProject[]> {
    return Array.from(this.projects.values());
  }

  /**
   * 更新项目
   * 
   * @param id 项目 ID
   * @param config 项目配置
   */
  public async updateProject(id: string, config: IProjectConfig): Promise<IProject> {
    const project = this.projects.get(id);
    
    if (!project) {
      throw new Error(`项目不存在: ${id}`);
    }
    
    await project.initialize(config);
    await this.saveProjects();
    
    return project;
  }

  /**
   * 删除项目
   * 
   * @param id 项目 ID
   */
  public async removeProject(id: string): Promise<boolean> {
    const project = this.projects.get(id);
    
    if (!project) {
      return false;
    }
    
    // 关闭项目
    if (project.status === ProjectStatus.OPEN) {
      await project.close();
    }
    
    this.projects.delete(id);
    await this.saveProjects();
    
    return true;
  }

  /**
   * 打开项目
   * 
   * @param id 项目 ID
   */
  public async openProject(id: string): Promise<IProject> {
    const project = this.projects.get(id);
    
    if (!project) {
      throw new Error(`项目不存在: ${id}`);
    }
    
    await project.open();
    await this.saveProjects();
    
    return project;
  }

  /**
   * 关闭项目
   * 
   * @param id 项目 ID
   */
  public async closeProject(id: string): Promise<IProject> {
    const project = this.projects.get(id);
    
    if (!project) {
      throw new Error(`项目不存在: ${id}`);
    }
    
    await project.close();
    await this.saveProjects();
    
    return project;
  }
} 