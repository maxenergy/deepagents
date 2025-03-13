# DeepAgents - 多代理自动化开发工具

DeepAgents 是一个基于大型语言模型（LLM）的多代理自动化开发工具，以 VSCode 扩展的形式提供。它结合了 GPT-Pilot 的软件生命周期控制流程和 Roo-Code 的用户界面与交互体验，旨在提供一个全面的自动化开发解决方案。

## 核心特性

- **多代理协作**：支持产品经理、架构师、开发者、测试员等多种角色的代理协作
- **生命周期管理**：从需求分析到部署的完整软件开发生命周期管理
- **交互式界面**：提供直观的用户界面，支持与代理的自然语言交互
- **代码生成与修改**：自动生成和修改代码，支持多种编程语言
- **测试与调试**：自动生成测试用例并执行调试
- **文档生成**：自动生成项目文档和代码注释
- **多模型支持**：支持多种大型语言模型，如 OpenAI、Anthropic、DeepSeek 等
- **自定义工作流**：允许用户自定义开发工作流程和代理行为

## 安装

1. 下载最新的 `.vsix` 文件
2. 在 VSCode 中，选择 "扩展" 视图
3. 点击 "..." 菜单，选择 "从 VSIX 安装..."
4. 选择下载的 `.vsix` 文件

## 使用方法

1. 在 VSCode 中，按下 `Ctrl+Shift+P`（Windows/Linux）或 `Cmd+Shift+P`（macOS）打开命令面板
2. 输入 "DeepAgents: 启动多代理开发助手" 并选择该命令
3. 在打开的面板中，与代理进行交互，描述你的开发需求
4. 代理将协作完成各个开发阶段的任务

## 配置

1. 在 VSCode 中，按下 `Ctrl+Shift+P`（Windows/Linux）或 `Cmd+Shift+P`（macOS）打开命令面板
2. 输入 "DeepAgents: 配置设置" 并选择该命令
3. 在配置面板中，设置 LLM 提供商、API 密钥和工作流模板

## 开发

### 前提条件

- Node.js 16+
- npm 或 yarn
- VSCode

### 设置开发环境

1. 克隆仓库
   ```
   git clone https://github.com/yourusername/deepagents.git
   cd deepagents
   ```

2. 安装依赖
   ```
   npm install
   ```

3. 编译扩展
   ```
   npm run compile
   ```

4. 启动调试
   在 VSCode 中，按下 `F5` 启动调试

## 许可证

MIT