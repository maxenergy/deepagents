// 模拟 vscode 模块
export const window = {
    showInformationMessage: (message: string, ...items: string[]) => {
        console.log(`[INFO] ${message}`);
        if (items.length > 0) {
            console.log(`[INFO] 选项: ${items.join(', ')}`);
            return Promise.resolve(items[0]); // 自动选择第一个选项
        }
        return Promise.resolve(undefined);
    },
    showErrorMessage: (message: string, ...items: string[]) => {
        console.log(`[ERROR] ${message}`);
        return Promise.resolve(undefined);
    },
    showInputBox: (options?: any) => {
        console.log(`[INPUT] ${options?.prompt || 'Enter value:'}`);
        const defaultValue = 'Test Workflow';
        console.log(`[INPUT] 返回默认值: ${defaultValue}`);
        return Promise.resolve(defaultValue);
    },
    showQuickPick: (items: any[], options?: any) => {
        console.log(`[QUICK_PICK] ${options?.placeHolder || 'Select an item:'}`);
        const itemLabels = items.map(item => typeof item === 'string' ? item : item.label);
        console.log(`[QUICK_PICK] 可用选项: ${itemLabels.join(', ')}`);
        const selected = items[0];
        console.log(`[QUICK_PICK] 选择: ${typeof selected === 'string' ? selected : selected.label}`);
        return Promise.resolve(selected);
    },
    createOutputChannel: (name: string) => {
        console.log(`[OUTPUT_CHANNEL] 创建输出通道: ${name}`);
        return {
            appendLine: (message: string) => {
                console.log(`[OUTPUT:${name}] ${message}`);
            },
            show: () => {
                console.log(`[OUTPUT:${name}] 显示输出通道`);
            },
            dispose: () => {
                console.log(`[OUTPUT:${name}] 释放输出通道`);
            }
        };
    }
};

export const commands = {
    registerCommand: (command: string, callback: (...args: any[]) => any) => {
        console.log(`[REGISTER_COMMAND] ${command}`);
        registeredCommands[command] = callback;
        return { dispose: () => {} };
    },
    executeCommand: async (command: string, ...args: any[]) => {
        console.log(`[EXECUTE_COMMAND] ${command} 参数:`, args);
        if (registeredCommands[command]) {
            try {
                const result = await registeredCommands[command](...args);
                console.log(`[EXECUTE_COMMAND] ${command} 执行结果:`, result);
                return result;
            } catch (error) {
                console.error(`[EXECUTE_COMMAND] ${command} 执行出错:`, error);
                throw error;
            }
        } else {
            console.log(`[EXECUTE_COMMAND] 命令未注册: ${command}`);
        }
        return undefined;
    }
};

// 存储注册的命令
const registeredCommands: Record<string, (...args: any[]) => any> = {};

export class ExtensionContext {
    subscriptions: any[] = [];
    workspaceState = {
        get: (key: string) => {
            console.log(`[CONTEXT] 获取工作区状态: ${key}`);
            return null;
        },
        update: (key: string, value: any) => {
            console.log(`[CONTEXT] 更新工作区状态: ${key} = ${JSON.stringify(value)}`);
            return Promise.resolve();
        }
    };
    globalState = {
        get: (key: string) => {
            console.log(`[CONTEXT] 获取全局状态: ${key}`);
            return null;
        },
        update: (key: string, value: any) => {
            console.log(`[CONTEXT] 更新全局状态: ${key} = ${JSON.stringify(value)}`);
            return Promise.resolve();
        }
    };
    extensionPath = '/path/to/extension';
    storagePath = '/path/to/storage';
    logPath = '/path/to/logs';
}

export enum ThemeColor {
    BLUE = 'blue',
    RED = 'red',
    GREEN = 'green'
}

export class ThemeIcon {
    constructor(public id: string, public color?: ThemeColor) {}
}

export class Uri {
    static file(path: string): Uri {
        return new Uri(path);
    }

    constructor(public path: string) {}

    toString(): string {
        return this.path;
    }
}

export enum ViewColumn {
    Active = -1,
    Beside = -2,
    One = 1,
    Two = 2,
    Three = 3
}

export enum TreeItemCollapsibleState {
    None = 0,
    Collapsed = 1,
    Expanded = 2
}

export class TreeItem {
    constructor(
        public label: string,
        public collapsibleState?: TreeItemCollapsibleState
    ) {}
    
    command?: any;
    tooltip?: string;
    description?: string;
    iconPath?: string | Uri | { light: string | Uri; dark: string | Uri };
    contextValue?: string;
}

export class EventEmitter<T> {
    private listeners: ((e: T) => any)[] = [];

    event(listener: (e: T) => any): { dispose: () => void } {
        this.listeners.push(listener);
        return {
            dispose: () => {
                const index = this.listeners.indexOf(listener);
                if (index !== -1) {
                    this.listeners.splice(index, 1);
                }
            }
        };
    }

    fire(data: T): void {
        this.listeners.forEach(listener => listener(data));
    }
}

export class Disposable {
    static from(...disposables: { dispose: () => any }[]): Disposable {
        return new Disposable(() => {
            for (const disposable of disposables) {
                disposable.dispose();
            }
        });
    }

    constructor(private callOnDispose: () => any) {}

    dispose(): void {
        this.callOnDispose();
    }
}

export const workspace = {
    getConfiguration: (section?: string) => {
        return {
            get: (key: string, defaultValue?: any) => {
                console.log(`[CONFIG] 获取配置: ${section ? section + '.' : ''}${key}`);
                return defaultValue;
            },
            update: (key: string, value: any, global?: boolean) => {
                console.log(`[CONFIG] 更新配置: ${section ? section + '.' : ''}${key} = ${JSON.stringify(value)}, global: ${global}`);
                return Promise.resolve();
            }
        };
    },
    workspaceFolders: [
        {
            uri: Uri.file('/workspace'),
            name: 'workspace',
            index: 0
        }
    ],
    onDidChangeConfiguration: new EventEmitter<any>().event
};

export const extensions = {
    getExtension: (extensionId: string) => {
        console.log(`[EXTENSIONS] 获取扩展: ${extensionId}`);
        return {
            id: extensionId,
            extensionPath: '/path/to/extension',
            isActive: true,
            packageJSON: {},
            exports: {}
        };
    }
};

export enum StatusBarAlignment {
    Left = 1,
    Right = 2
}

export const StatusBarItem = class {
    text: string = '';
    tooltip: string = '';
    command: string = '';
    color: string = '';
    backgroundColor: string = '';
    alignment: StatusBarAlignment = StatusBarAlignment.Left;
    priority: number = 0;
    
    show(): void {
        console.log(`[STATUS_BAR] 显示状态栏项: ${this.text}`);
    }
    
    hide(): void {
        console.log(`[STATUS_BAR] 隐藏状态栏项: ${this.text}`);
    }
    
    dispose(): void {
        console.log(`[STATUS_BAR] 释放状态栏项: ${this.text}`);
    }
};

export const languages = {
    registerCodeLensProvider: () => {
        return { dispose: () => {} };
    },
    registerHoverProvider: () => {
        return { dispose: () => {} };
    }
};

export const env = {
    clipboard: {
        writeText: (text: string) => {
            console.log(`[CLIPBOARD] 写入文本: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`);
            return Promise.resolve();
        },
        readText: () => {
            return Promise.resolve('模拟剪贴板内容');
        }
    },
    openExternal: (uri: Uri) => {
        console.log(`[ENV] 打开外部链接: ${uri.toString()}`);
        return Promise.resolve(true);
    }
};

export const ProgressLocation = {
    Notification: 1,
    SourceControl: 2,
    Window: 3
};

export const window_progress = {
    withProgress: async <T>(options: any, task: (progress: any, token: any) => Thenable<T>): Promise<T> => {
        console.log(`[PROGRESS] 开始进度: ${options.title || ''}`);
        const progress = {
            report: (value: { message?: string; increment?: number }) => {
                console.log(`[PROGRESS] 报告进度: ${value.message || ''} ${value.increment !== undefined ? value.increment + '%' : ''}`);
            }
        };
        const token = {
            isCancellationRequested: false,
            onCancellationRequested: new EventEmitter<any>().event
        };
        try {
            const result = await task(progress, token);
            console.log(`[PROGRESS] 完成进度`);
            return result;
        } catch (error) {
            console.log(`[PROGRESS] 进度出错: ${error}`);
            throw error;
        }
    }
};

Object.assign(window, window_progress);

export default {
    window,
    commands,
    ExtensionContext,
    ThemeIcon,
    Uri,
    ViewColumn,
    TreeItemCollapsibleState,
    TreeItem,
    EventEmitter,
    Disposable,
    workspace,
    extensions,
    StatusBarAlignment,
    StatusBarItem,
    languages,
    env,
    ProgressLocation
}; 