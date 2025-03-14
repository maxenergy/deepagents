/**
 * 项目状态枚举
 */
export enum ProjectStatus {
  CLOSED = 'closed',
  OPEN = 'open',
  CREATING = 'creating',
  ERROR = 'error'
}

/**
 * 项目文件接口
 */
export interface IProjectFile {
  /**
   * 文件名
   */
  name: string;

  /**
   * 文件路径
   */
  path: string;

  /**
   * 是否为目录
   */
  isDirectory: boolean;

  /**
   * 文件大小（字节）
   */
  size?: number;

  /**
   * 最后修改时间
   */
  lastModified?: Date;
}

/**
 * 项目配置接口
 */
export interface IProjectConfig {
  /**
   * 项目名称
   */
  name: string;

  /**
   * 项目描述
   */
  description?: string;

  /**
   * 项目路径
   */
  path: string;

  /**
   * 项目语言
   */
  language?: string;

  /**
   * 项目框架
   */
  framework?: string;

  /**
   * 项目依赖
   */
  dependencies?: Record<string, string>;

  /**
   * 项目设置
   */
  settings?: Record<string, any>;

  /**
   * 自定义配置
   */
  [key: string]: any;
}

/**
 * 项目接口
 */
export interface IProject {
  /**
   * 项目 ID
   */
  id: string;

  /**
   * 项目名称
   */
  name: string;

  /**
   * 项目路径
   */
  path: string;

  /**
   * 项目状态
   */
  status: ProjectStatus;

  /**
   * 项目配置
   */
  config: IProjectConfig;

  /**
   * 项目文件
   */
  files?: IProjectFile[];

  /**
   * 创建时间
   */
  createdAt: Date;

  /**
   * 最后修改时间
   */
  updatedAt: Date;

  /**
   * 初始化项目
   * 
   * @param config 项目配置
   */
  initialize(config: IProjectConfig): Promise<void>;

  /**
   * 打开项目
   */
  open(): Promise<void>;

  /**
   * 关闭项目
   */
  close(): Promise<void>;

  /**
   * 获取项目文件
   * 
   * @param path 文件路径
   */
  getFile(path: string): Promise<IProjectFile | null>;

  /**
   * 获取项目文件列表
   * 
   * @param path 目录路径
   */
  getFiles(path?: string): Promise<IProjectFile[]>;

  /**
   * 创建文件
   * 
   * @param path 文件路径
   * @param content 文件内容
   */
  createFile(path: string, content: string): Promise<IProjectFile>;

  /**
   * 更新文件
   * 
   * @param path 文件路径
   * @param content 文件内容
   */
  updateFile(path: string, content: string): Promise<IProjectFile>;

  /**
   * 删除文件
   * 
   * @param path 文件路径
   */
  deleteFile(path: string): Promise<boolean>;

  /**
   * 创建目录
   * 
   * @param path 目录路径
   */
  createDirectory(path: string): Promise<IProjectFile>;

  /**
   * 删除目录
   * 
   * @param path 目录路径
   */
  deleteDirectory(path: string): Promise<boolean>;
} 