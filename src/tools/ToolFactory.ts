import { ITool, ToolType, ToolConfig } from "./ITool";
import { CodeAnalysisTool } from "./codeAnalysis/CodeAnalysisTool";
import { GitTool } from "./versionControl/GitTool";

/**
 * 工具工厂类，负责创建各种类型的工具
 */
export class ToolFactory {
    /**
     * 创建工具
     * @param type 工具类型
     * @param config 工具配置
     * @returns 创建的工具实例
     */
    public static createTool(type: ToolType, config?: ToolConfig): ITool {
        switch (type) {
            case ToolType.CODE_ANALYSIS:
                return new CodeAnalysisTool(config);
            case ToolType.VERSION_CONTROL:
                return new GitTool(config);
            default:
                throw new Error(`Unsupported tool type: ${type}`);
        }
    }

    /**
     * 根据名称创建工具
     * @param name 工具名称
     * @param config 工具配置
     * @returns 创建的工具实例
     */
    public static createToolByName(name: string, config?: ToolConfig): ITool {
        // 根据名称映射到工具类型
        let type: ToolType;
        
        switch (name.toLowerCase()) {
            case "codeanalysis":
            case "code-analysis":
            case "code_analysis":
                type = ToolType.CODE_ANALYSIS;
                break;
            case "git":
            case "versioncontrol":
            case "version-control":
            case "version_control":
                type = ToolType.VERSION_CONTROL;
                break;
            default:
                throw new Error(`Unknown tool name: ${name}`);
        }
        
        return ToolFactory.createTool(type, config);
    }
}
