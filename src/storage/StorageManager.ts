import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * 存储命名空间枚举
 */
export enum StorageNamespace {
  AGENTS = 'agents',
  WORKFLOWS = 'workflows',
  PROJECTS = 'projects',
  SETTINGS = 'settings',
  HISTORY = 'history'
}

/**
 * 存储接口
 */
export interface IStorage {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<boolean>;
  clear(): Promise<void>;
  getAll(): Promise<Map<string, any>>;
}

/**
 * 存储管理器类
 * 
 * 负责管理扩展的存储，包括全局状态、工作区状态和文件系统存储
 */
export class StorageManager {
  private context: vscode.ExtensionContext;
  private storages: Map<string, IStorage> = new Map();
  private storagePath: string;

  /**
   * 构造函数
   * 
   * @param context VSCode 扩展上下文
   */
  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.storagePath = context.globalStoragePath;
    
    // 确保存储目录存在
    if (!fs.existsSync(this.storagePath)) {
      fs.mkdirSync(this.storagePath, { recursive: true });
    }
    
    // 初始化默认存储
    this.initializeDefaultStorages();
  }

  /**
   * 初始化默认存储
   */
  private initializeDefaultStorages(): void {
    // 为每个命名空间创建存储
    Object.values(StorageNamespace).forEach(namespace => {
      this.createStorage(namespace);
    });
  }

  /**
   * 创建存储
   * 
   * @param namespace 存储命名空间
   * @returns 存储实例
   */
  public createStorage(namespace: string): IStorage {
    if (this.storages.has(namespace)) {
      return this.storages.get(namespace)!;
    }

    const storage = new ExtensionStorage(this.context, namespace, this.storagePath);
    this.storages.set(namespace, storage);
    return storage;
  }

  /**
   * 获取存储
   * 
   * @param namespace 存储命名空间
   * @returns 存储实例，如果不存在则返回 null
   */
  public getStorage(namespace: string): IStorage | null {
    return this.storages.get(namespace) || null;
  }

  /**
   * 获取所有存储
   * 
   * @returns 所有存储实例
   */
  public getAllStorages(): IStorage[] {
    return Array.from(this.storages.values());
  }

  /**
   * 清除所有存储
   */
  public async clearAll(): Promise<void> {
    const promises = Array.from(this.storages.values()).map(storage => storage.clear());
    await Promise.all(promises);
  }
}

/**
 * 扩展存储类
 * 
 * 实现 IStorage 接口，提供存储功能
 */
class ExtensionStorage implements IStorage {
  private context: vscode.ExtensionContext;
  private namespace: string;
  private storagePath: string;
  private filePath: string;
  private cache: Map<string, any> = new Map();

  /**
   * 构造函数
   * 
   * @param context VSCode 扩展上下文
   * @param namespace 存储命名空间
   * @param storagePath 存储路径
   */
  constructor(context: vscode.ExtensionContext, namespace: string, storagePath: string) {
    this.context = context;
    this.namespace = namespace;
    this.storagePath = storagePath;
    this.filePath = path.join(this.storagePath, `${namespace}.json`);
    
    // 加载缓存
    this.loadCache();
  }

  /**
   * 加载缓存
   */
  private loadCache(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const data = fs.readFileSync(this.filePath, 'utf8');
        const parsed = JSON.parse(data);
        this.cache = new Map(Object.entries(parsed));
      }
    } catch (error) {
      console.error(`加载缓存失败 (${this.namespace}):`, error);
    }
  }

  /**
   * 保存缓存
   */
  private async saveCache(): Promise<void> {
    try {
      const data = JSON.stringify(Object.fromEntries(this.cache), null, 2);
      await fs.promises.writeFile(this.filePath, data, 'utf8');
    } catch (error) {
      console.error(`保存缓存失败 (${this.namespace}):`, error);
    }
  }

  /**
   * 获取值
   * 
   * @param key 键
   * @returns 值
   */
  public async get<T>(key: string): Promise<T | undefined> {
    return this.cache.get(key) as T | undefined;
  }

  /**
   * 设置值
   * 
   * @param key 键
   * @param value 值
   */
  public async set<T>(key: string, value: T): Promise<void> {
    this.cache.set(key, value);
    await this.saveCache();
  }

  /**
   * 删除值
   * 
   * @param key 键
   * @returns 是否成功删除
   */
  public async delete(key: string): Promise<boolean> {
    const result = this.cache.delete(key);
    await this.saveCache();
    return result;
  }

  /**
   * 清除所有值
   */
  public async clear(): Promise<void> {
    this.cache.clear();
    await this.saveCache();
  }

  /**
   * 获取所有值
   * 
   * @returns 所有键值对
   */
  public async getAll(): Promise<Map<string, any>> {
    return new Map(this.cache);
  }
}