import axios from "axios";
import { toRaw } from "vue";
import z from "zod";
import { ChatOpenAI } from "@langchain/openai";
import { ChatOllama } from "@langchain/ollama";
import { DynamicStructuredTool } from "@langchain/core/tools";
import {
    ChatPromptTemplate,
    MessagesPlaceholder,
} from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { AgentExecutor, createToolCallingAgent } from "langchain/agents";
import {
    API_ENDPOINT,
    POSITION_PROMPT,
    FILTER_PROMPT,
    SQL_PROMPT,
} from "./config";

// 定义不同任务职责的智能体执行器
let agentExecutors = {
    router: null,
    position: null,
    filter: null,
    chat: null,
};
export const llmConfig = {
    // 加载环境变量配置智能体模式
    agentMode: import.meta.env.VITE_AGENT_MODE,
    cloud: {
        baseUrl: import.meta.env.VITE_OPENAI_BASE_URL,
        apiKey: import.meta.env.VITE_OPENAI_API_KEY,
        modelName: import.meta.env.VITE_OPENAI_MODEL_NAME,
    },
    local: {
        baseUrl: import.meta.env.VITE_OLLAMA_BASE_URL,
        modelName: import.meta.env.VITE_OLLAMA_MODEL_NAME,
    },
    chat: {
        baseUrl: import.meta.env.VITE_CHAT_BASE_URL,
        apiKey: import.meta.env.VITE_CHAT_API_KEY,
        modelName: import.meta.env.VITE_CHAT_MODEL_NAME,
    },
};
let chatHistory = [];

// 核心对话处理函数
export async function agentChat(text, callbacks) {
    const { question, answer, handle } = callbacks;

    try {
        const intent = await agentExecutors.router.invoke({
            input: text,
            chat_history: chatHistory,
        });

        let resultOutput = "";
        let executor = null;

        // 通知ui开始执行任务
        question(intent);

        if (intent === "POSITION") {
            executor = agentExecutors.position;
        } else if (intent === "FILTER") {
            executor = agentExecutors.filter;
        } else {
            executor = agentExecutors.chat;
        }

        const result = await executor.invoke({
            input: text,
            chat_history: chatHistory,
        });

        if (intent === "CHAT" || !result.output) {
            resultOutput =
                typeof result === "string"
                    ? result
                    : result.content || result.output || "";
        } else {
            resultOutput = result.output;
        }

        // 移除输出结果首尾多余的空白字符和换行符
        const finalOutput = resultOutput.trim();

        // 更新聊天历史对话记录
        chatHistory.push(new HumanMessage(text));
        chatHistory.push(new AIMessage(finalOutput));

        // 保留最新的10条对话记录
        if (chatHistory.length > 10) {
            chatHistory = chatHistory.slice(chatHistory.length - 10);
        }

        // 通知 UI 更新结果
        answer(finalOutput);
    } catch (e) {
        console.error("消息处理出错:", e);
        const errorMsg = e.message.includes("404") ? "服务未响应" : e.message;

        // 通知ui发生错误
        handle(`执行出错:${errorMsg}`);
    }
}

function defineLlm() {
    let llm;

    // 根据智能体模式选择对应语言模型
    if (llmConfig.agentMode === "local") {
        // 本地部署模型
        llm = new ChatOllama({
            baseUrl: llmConfig.local.baseUrl,
            model: llmConfig.local.modelName,
            temperature: 0,
            keepAlive: "15m",
        });
    } else if (llmConfig.agentMode === "cloud") {
        // 云服务远程调用模型
        llm = new ChatOpenAI({
            apiKey: llmConfig.cloud.apiKey,
            configuration: { baseURL: llmConfig.cloud.baseUrl },
            model: llmConfig.cloud.modelName,
            temperature: 0,
            // 关闭用量统计提高云服务接口兼容
            streamUsage: false,
        });
    }

    const chatLlm = new ChatOpenAI({
        apiKey: llmConfig.chat.apiKey,
        configuration: { baseURL: llmConfig.chat.baseUrl },
        model: llmConfig.chat.modelName,
    });

    return { llm, chatLlm };
}

export function defineAgentExecutors(viewer) {
    // 定义大语言模型与聊天模型
    const { llm, chatLlm } = defineLlm();
    // 初始化定义智能体所需的工具
    const [searchAndFlyTool, flyToTool, sqlFilterTool] = defineTools(viewer);

    agentExecutors.router = {
        invoke: async ({ input }) => {
            const text = input.trim();

            const positionRegex = /(定位|搜索|寻找|查一下|去|哪里|位置|坐标)/i;
            if (positionRegex.test(text)) {
                return "POSITION";
            }
            const filterRegex =
                /(筛选|过滤|大于|小于|等于|最[大高低深浅长多少]|(列|查|找|显示)(出|一下)?(所有|全部)|统计|数量|多少|列表)/i;
            if (filterRegex.test(text)) {
                return "FILTER";
            }

            return "CHAT";
        },
    };

    const positionPrompt = ChatPromptTemplate.fromMessages([
        ["system", `${POSITION_PROMPT}`],
        new MessagesPlaceholder("chat_history"),
        ["human", "{input}"],
        new MessagesPlaceholder("agent_scratchpad"),
    ]);
    const positionAgent = createToolCallingAgent({
        llm: llm,
        tools: [searchAndFlyTool, flyToTool],
        prompt: positionPrompt,
    });
    // 定义实体定位智能体执行器
    agentExecutors.position = new AgentExecutor({
        agent: positionAgent,
        tools: [searchAndFlyTool, flyToTool],
        handleParsingErrors: true,
        maxIterations: 4,
    });

    const filterPrompt = ChatPromptTemplate.fromMessages([
        ["system", `${FILTER_PROMPT}`],
        new MessagesPlaceholder("chat_history"),
        ["human", "{input}"],
        new MessagesPlaceholder("agent_scratchpad"),
    ]);
    const filterAgent = createToolCallingAgent({
        llm: llm,
        tools: [sqlFilterTool],
        prompt: filterPrompt,
    });
    // 定义条件筛选智能体执行器
    agentExecutors.filter = new AgentExecutor({
        agent: filterAgent,
        tools: [sqlFilterTool],
        handleParsingErrors: true,
        maxIterations: 4,
    });

    const chatPrompt = ChatPromptTemplate.fromMessages([
        [
            "system",
            "你是一个友好的GIS助手.请用简练专业的语言回答用户的普通闲聊问题.",
        ],
        new MessagesPlaceholder("chat_history"),
        ["human", "{input}"],
    ]);
    agentExecutors.chat = chatPrompt
        .pipe(chatLlm)
        .pipe(new StringOutputParser())
        .pipe((text) => {
            // 移除markdown符号仅保留文本和基本标点
            return text ? text.replace(/[*#`_~>]/g, "") : "";
        });
}

function defineTools(viewer) {
    const searchAndFlyTool = new DynamicStructuredTool({
        name: "search_and_fly",
        description:
            "综合搜索定位工具.按名称搜索实体,优先查找本地,若无则查询远程数据库.找到后自动控制地图飞行定位.",
        schema: z.object({
            keyword: z
                .string()
                .describe(
                    "实体名称关键词(英文,尽可能简短如'Three Gorges','Miyun','Winnipeg')",
                ),
            // 限定实体数据类型
            type: z.enum(["barrier", "reservoir"]).describe("实体类型"),
        }),
        func: async ({ keyword, type }) => searchAndFly(viewer, keyword, type),
    });

    const flyToTool = new DynamicStructuredTool({
        name: "fly_to",
        description:
            "精确id定位工具.当上下文中已经知道实体的id时,必须优先使用此工具进行跳转,而不是重新搜索名称.",
        schema: z.object({
            id: z.string().describe("实体唯一id(格式如'b-12345'或'r-67890')"),
        }),
        func: async ({ id }) => {
            const entity = viewer.entities.getById(id);
            if (entity) {
                viewer.selectedEntity = entity;
                viewer.flyTo(toRaw(viewer.selectedEntity), { duration: 1.5 });
                return `SUCCESS:已定位到实体"${entity.name}"(id:${id}),视角已自动调整.`;
            } else {
                return `ERROR:不存在当前实体(id:${id}).`;
            }
        },
    });

    const sqlFilterTool = new DynamicStructuredTool({
        name: "sql_filter",
        description:
            "高级过滤工具.根据SQL进行数据库查询实现过滤,请严格按照提示语中SQL语法要求构造查询条件.",
        schema: z.object({
            sql: z.string().describe(`${SQL_PROMPT}`),
        }),
        func: async ({ sql }) => sqlFilter(viewer, sql),
    });

    return [searchAndFlyTool, flyToTool, sqlFilterTool];
}

async function searchAndFly(viewer, keyword, type) {
    const entities = viewer.entities.values;

    // 遍历本地实体列表查找名称模糊匹配
    const localTarget = entities.find((e) => {
        if (e.properties?.dataType?.getValue() !== type) return false;
        return e.name.includes(keyword);
    });

    if (localTarget) {
        viewer.selectedEntity = localTarget;
        viewer.flyTo(toRaw(viewer.selectedEntity), { duration: 1.5 });
        return `SUCCESS:本地已找到实体"${localTarget.name}"(id:${localTarget.id}),视角已自动定位.`;
    }

    try {
        const url = API_ENDPOINT.position[type];
        const res = await axios.post(url, keyword, {
            headers: { "Content-Type": "text/plain" },
        });

        if (res.data.code === 1 && res.data.data) {
            const item = res.data.data;

            let entityId = null;
            let entityName = null;

            if (type === "barrier") {
                entityId = "b-" + item.gdwId;
                entityName = item.dam_name || "Barrier #" + item.gdwId;
            } else if (type === "reservoir") {
                entityId = "r-" + item.gdwId;
                entityName = item.res_name || "Reservoir #" + item.gdwId;
            }

            const entity = viewer.entities.getById(entityId);
            if (entity) {
                viewer.selectedEntity = entity;
                viewer.flyTo(toRaw(viewer.selectedEntity), { duration: 1.5 });
                return `SUCCESS:远程数据库查找到"${entityName}"(id:${entityId}),已加载并自动定位.`;
            } else {
                return `ERROR:数据库查找到数据,但实体加载失败(id:${entityId}).`;
            }
        }

        return `ERROR:未找到名为"${keyword}"的${type}实体(本地与远程均无结果).`;
    } catch (error) {
        return `ERROR:搜索过程出错:${error.message}`;
    }
}

async function sqlFilter(viewer, sql) {
    try {
        let type = null;
        // 根据单表查询语句所在表名判断实体类型
        if (sql.includes("public.gdw_barrier")) type = "barrier";
        else if (sql.includes("public.gdw_reservoir")) type = "reservoir";

        const url = API_ENDPOINT.filter[type];

        viewer.entities.removeAll();

        const res = await axios.post(url, sql, {
            headers: { "Content-Type": "text/plain" },
        });

        if (res.data.code === 1 && Array.isArray(res.data.data)) {
            const data = res.data.data;
            // 符合查询条件的实体确实不存在
            if (data.length === 0) {
                return "SUCCESS:查询成功,但未找到符合条件的实体.";
            }

            data.forEach((item) => {
                if (type === "barrier") {
                    window.loadBarrierEntity(viewer, item);
                } else if (type === "reservoir") {
                    window.loadReservoirEntity(viewer, item);
                }
            });
            // 调整地图相机视角适应所有实体
            viewer.zoomTo(viewer.entities);

            return `SUCCESS:查询成功!已筛选${data.length}个符合条件的${type}实体.`;
        } else {
            return `ERROR:查询失败:${res.data.message || "未知错误"}.`;
        }
    } catch (error) {
        return `ERROR:查询出错:${error.message}`;
    }
}
