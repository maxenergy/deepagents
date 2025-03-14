declare module 'mock-require' {
    /**
     * 模拟模块导入
     * @param path 要模拟的模块路径
     * @param exports 模拟的导出内容
     */
    function mockRequire(path: string, exports: any): void;
    
    /**
     * 停止模拟模块
     * @param path 要停止模拟的模块路径
     */
    function stop(path: string): void;
    
    /**
     * 停止所有模拟
     */
    function stopAll(): void;
    
    /**
     * 重新加载模块
     * @param path 要重新加载的模块路径
     */
    function reRequire(path: string): any;
    
    export = mockRequire;
} 