import * as vscode from 'vscode';
import { BaseUIComponent } from '../BaseUIComponent';
import { UIComponentType, UIComponentState, UIComponentMessage, UIComponentConfig } from '../IUIComponent';

/**
 * 树视图组件配置
 */
export interface TreeViewConfig extends UIComponentConfig {
  viewId: string;
  showCollapseAll?: boolean;
  canSelectMany?: boolean;
}

/**
 * 树项数据接口
 */
export interface TreeItemData {
  id: string;
  label: string;
  description?: string;
  tooltip?: string;
  iconPath?: string | vscode.Uri | { light: string | vscode.Uri; dark: string | vscode.Uri };
  contextValue?: string;
  command?: vscode.Command;
  children?: TreeItemData[];
  collapsibleState?: vscode.TreeItemCollapsibleState;
  [key: string]: any;
}

/**
 * 树视图组件类
 * 
 * 提供树视图功能的UI组件
 */
export class TreeViewComponent extends BaseUIComponent implements vscode.TreeDataProvider<TreeItemData> {
  protected _treeView: vscode.TreeView<TreeItemData> | undefined;
  protected _viewId: string;
  protected _items: TreeItemData[] = [];
  protected _onDidChangeTreeData: vscode.EventEmitter<TreeItemData | undefined> = new vscode.EventEmitter<TreeItemData | undefined>();
  
  /**
   * 树数据变化事件
   */
  public readonly onDidChangeTreeData: vscode.Event<TreeItemData | undefined> = this._onDidChangeTreeData.event;
  
  /**
   * 构造函数
   */
  constructor() {
    super();
    this._type = UIComponentType.TREE_VIEW;
    this._viewId = '';
  }
  
  /**
   * 初始化回调
   */
  protected async onInitialize(): Promise<void> {
    this._viewId = this.getConfigValue<string>('viewId', this._id);
    
    // 注册树视图
    this._treeView = vscode.window.createTreeView(this._viewId, {
      treeDataProvider: this,
      showCollapseAll: this.getConfigValue<boolean>('showCollapseAll', true),
      canSelectMany: this.getConfigValue<boolean>('canSelectMany', false)
    });
    
    this.registerDisposable(this._treeView);
    this.registerDisposable(this._onDidChangeTreeData);
    
    // 注册选择事件
    this._treeView.onDidChangeSelection(e => this.onSelectionChanged(e.selection));
    
    // 注册可见性变化事件
    this._treeView.onDidChangeVisibility(e => {
      if (e.visible) {
        this.onVisible();
      } else {
        this.onHidden();
      }
    });
  }
  
  /**
   * 获取树项
   * 
   * @param element 树项数据
   * @returns 树项
   */
  public getTreeItem(element: TreeItemData): vscode.TreeItem {
    const treeItem = new vscode.TreeItem(
      element.label,
      element.collapsibleState !== undefined
        ? element.collapsibleState
        : element.children && element.children.length > 0
          ? vscode.TreeItemCollapsibleState.Collapsed
          : vscode.TreeItemCollapsibleState.None
    );
    
    // 设置ID
    treeItem.id = element.id;
    
    // 设置描述
    if (element.description) {
      treeItem.description = element.description;
    }
    
    // 设置提示
    if (element.tooltip) {
      treeItem.tooltip = element.tooltip;
    }
    
    // 设置图标
    if (element.iconPath) {
      treeItem.iconPath = this.getIconPath(element.iconPath);
    }
    
    // 设置上下文值
    if (element.contextValue) {
      treeItem.contextValue = element.contextValue;
    }
    
    // 设置命令
    if (element.command) {
      treeItem.command = element.command;
    }
    
    return treeItem;
  }
  
  /**
   * 获取图标路径
   * 
   * @param iconPath 图标路径
   * @returns 图标路径
   */
  protected getIconPath(iconPath: string | vscode.Uri | { light: string | vscode.Uri; dark: string | vscode.Uri }): string | vscode.Uri | { light: vscode.Uri; dark: vscode.Uri } {
    if (typeof iconPath === 'string') {
      return this.getResourceUri(iconPath);
    } else if (iconPath instanceof vscode.Uri) {
      return iconPath;
    } else {
      return {
        light: typeof iconPath.light === 'string' ? this.getResourceUri(iconPath.light) : iconPath.light,
        dark: typeof iconPath.dark === 'string' ? this.getResourceUri(iconPath.dark) : iconPath.dark
      };
    }
  }
  
  /**
   * 获取子项
   * 
   * @param element 树项数据
   * @returns 子项数组
   */
  public getChildren(element?: TreeItemData): TreeItemData[] {
    if (!element) {
      return this._items;
    }
    
    return element.children || [];
  }
  
  /**
   * 获取父项
   * 
   * @param element 树项数据
   * @returns 父项
   */
  public getParent(element: TreeItemData): TreeItemData | undefined {
    // 查找父项
    const findParent = (items: TreeItemData[], target: TreeItemData): TreeItemData | undefined => {
      for (const item of items) {
        if (item.children) {
          if (item.children.some(child => child.id === target.id)) {
            return item;
          }
          
          const parent = findParent(item.children, target);
          if (parent) {
            return parent;
          }
        }
      }
      
      return undefined;
    };
    
    return findParent(this._items, element);
  }
  
  /**
   * 设置树项
   * 
   * @param items 树项数据数组
   */
  public setItems(items: TreeItemData[]): void {
    this._items = items;
    this.refresh();
  }
  
  /**
   * 添加树项
   * 
   * @param item 树项数据
   * @param parentId 父项ID
   */
  public addItem(item: TreeItemData, parentId?: string): void {
    if (!parentId) {
      this._items.push(item);
      this.refresh();
      return;
    }
    
    // 查找父项并添加子项
    const addToParent = (items: TreeItemData[], target: string, newItem: TreeItemData): boolean => {
      for (const item of items) {
        if (item.id === target) {
          if (!item.children) {
            item.children = [];
          }
          
          item.children.push(newItem);
          return true;
        }
        
        if (item.children && item.children.length > 0) {
          if (addToParent(item.children, target, newItem)) {
            return true;
          }
        }
      }
      
      return false;
    };
    
    if (addToParent(this._items, parentId, item)) {
      this.refresh();
    }
  }
  
  /**
   * 更新树项
   * 
   * @param itemId 树项ID
   * @param data 更新数据
   */
  public updateItem(itemId: string, data: Partial<TreeItemData>): void {
    // 查找并更新树项
    const updateItemById = (items: TreeItemData[], id: string, updateData: Partial<TreeItemData>): boolean => {
      for (let i = 0; i < items.length; i++) {
        if (items[i].id === id) {
          items[i] = { ...items[i], ...updateData };
          return true;
        }
        
        if (items[i].children) {
          if (updateItemById(items[i].children!, id, updateData)) {
            return true;
          }
        }
      }
      
      return false;
    };
    
    if (updateItemById(this._items, itemId, data)) {
      this.refresh();
    }
  }
  
  /**
   * 删除树项
   * 
   * @param itemId 树项ID
   */
  public removeItem(itemId: string): void {
    // 查找并删除树项
    const removeItemById = (items: TreeItemData[], id: string): boolean => {
      for (let i = 0; i < items.length; i++) {
        if (items[i].id === id) {
          items.splice(i, 1);
          return true;
        }
        
        if (items[i].children) {
          if (removeItemById(items[i].children!, id)) {
            return true;
          }
        }
      }
      
      return false;
    };
    
    if (removeItemById(this._items, itemId)) {
      this.refresh();
    }
  }
  
  /**
   * 刷新树视图
   * 
   * @param item 要刷新的树项，如果为undefined则刷新整个树
   */
  public refresh(item?: TreeItemData): void {
    this._onDidChangeTreeData.fire(item);
  }
  
  /**
   * 选择树项
   * 
   * @param itemIds 树项ID数组
   */
  public selectItems(itemIds: string[]): void {
    if (!this._treeView) {
      return;
    }
    
    // 查找树项
    const findItems = (items: TreeItemData[], ids: string[]): TreeItemData[] => {
      const result: TreeItemData[] = [];
      
      for (const item of items) {
        if (ids.includes(item.id)) {
          result.push(item);
        }
        
        if (item.children && item.children.length > 0) {
          result.push(...findItems(item.children, ids));
        }
      }
      
      return result;
    };
    
    const items = findItems(this._items, itemIds);
    if (items.length > 0) {
      // 由于selection是只读属性，我们需要使用reveal方法来选择项目
      this._treeView.reveal(items[0], { select: true });
    }
  }
  
  /**
   * 展开树项
   * 
   * @param itemId 树项ID
   */
  public expandItem(itemId: string): void {
    if (!this._treeView) {
      return;
    }
    
    // 查找树项
    const findItem = (items: TreeItemData[], id: string): TreeItemData | undefined => {
      for (const item of items) {
        if (item.id === id) {
          return item;
        }
        
        if (item.children && item.children.length > 0) {
          const found = findItem(item.children, id);
          if (found) {
            return found;
          }
        }
      }
      
      return undefined;
    };
    
    const item = findItem(this._items, itemId);
    if (item) {
      this._treeView.reveal(item, { expand: true });
    }
  }
  
  /**
   * 选择变化回调
   * 
   * @param selection 选中的树项数组
   */
  protected onSelectionChanged(selection: readonly TreeItemData[]): void {
    // 子类可以重写此方法以提供自定义选择逻辑
  }
  
  /**
   * 视图可见时的回调
   */
  protected onVisible(): void {
    // 子类可以重写此方法以提供自定义可见逻辑
  }
  
  /**
   * 视图隐藏时的回调
   */
  protected onHidden(): void {
    // 子类可以重写此方法以提供自定义隐藏逻辑
  }
  
  /**
   * 渲染组件
   * 
   * @returns 树视图
   */
  public render(): vscode.TreeView<TreeItemData> | undefined {
    return this._treeView;
  }
  
  /**
   * 更新回调
   * 
   * @param data 更新数据
   */
  protected onUpdate(data: any): void {
    if (data && data.items) {
      this.setItems(data.items);
    }
  }
  
  /**
   * 显示回调
   */
  protected onShow(): void {
    // 尝试显示视图
    vscode.commands.executeCommand(`${this._viewId}.focus`);
  }
  
  /**
   * 隐藏回调
   */
  protected onHide(): void {
    // 树视图无法直接隐藏，由VSCode管理
  }
  
  /**
   * 发送消息回调
   * 
   * @param message 消息
   */
  protected onPostMessage(message: UIComponentMessage): void {
    // 树视图不支持消息
  }
  
  /**
   * 处理消息回调
   * 
   * @param message 消息
   * @returns 处理结果
   */
  protected async onHandleMessage(message: UIComponentMessage): Promise<any> {
    // 树视图不支持消息
    return null;
  }
  
  /**
   * 销毁回调
   */
  protected onDispose(): void {
    this._treeView = undefined;
  }
}
