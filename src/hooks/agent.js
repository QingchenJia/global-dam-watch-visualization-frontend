import axios from "axios";
import { toRaw } from "vue";
import z from "zod";
import { ChatOpenAI } from "@langchain/openai";
import { DynamicStructuredTool } from "@langchain/core/tools";
import {
    ChatPromptTemplate,
    MessagesPlaceholder,
} from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { AgentExecutor, createToolCallingAgent } from "langchain/agents";
import {
    loadBarrierEntity,
    loadReservoirEntity,
    clearAllEntities,
    getAllEntities,
    getEntitiesFromDataSource,
} from "./earth.js";
import { API_ENDPOINT } from "../configs/api.js";
import { POSITION_PROMPT, FILTER_PROMPT } from "../configs/prompt.js";
import { retrieveFilterContext } from "../knowledge/rag.js";
import { rotateEarth, computeCenter } from "../utils/camera.js";

let GIS_AGENT = {
    router: null,
    position: null,
    filter: null,
    chat: null,
};

export const llmConfig = {
    agentMode: import.meta.env.VITE_AGENT_MODE,
    modelName: {
        cloud: import.meta.env.VITE_OPENAI_MODEL_NAME,
        local: import.meta.env.VITE_OLLAMA_MODEL_NAME,
        chat: import.meta.env.VITE_CHAT_MODEL_NAME,
    },
};

let chatHistory = [];

export async function chatToAgent(text, callbacks) {
    const { question, answer, handle } = callbacks;

    try {
        const intent = await GIS_AGENT.router.invoke({
            input: text,
            chat_history: chatHistory,
        });

        question(missionLabel(intent));

        const executor = intent === "chat" ? GIS_AGENT.chat : GIS_AGENT[intent].executor;
        const agentInput = {
            input: text,
            chat_history: chatHistory,
        };

        if (intent === "filter") {
            agentInput.retrieved_context = await retrieveFilterContext(text);
        }

        const result = await executor.invoke(agentInput);

        const resultOutput =
            intent === "chat" || !result?.output
                ? typeof result === "string"
                    ? result
                    : result?.content || result?.output || ""
                : result.output;

        const finalOutput = String(resultOutput || "").trim();

        chatHistory.push(new HumanMessage(text));
        chatHistory.push(new AIMessage(finalOutput));

        if (chatHistory.length > 10) {
            chatHistory = chatHistory.slice(chatHistory.length - 10);
        }

        answer(finalOutput);
    } catch (e) {
        console.error("消息处理出错:", e);

        const rawMsg =
            e?.response?.data?.error?.message ||
            e?.response?.data?.message ||
            e?.message ||
            "未知错误";

        const errorMsg = rawMsg.includes("404") ? "服务未响应" : rawMsg;

        handle(`执行出错:${errorMsg}`);
    }
}

function createProxyLlm(provider, model, temperature = 0) {
    return new ChatOpenAI({
        apiKey: "proxy",
        configuration: {
            baseURL: API_ENDPOINT.llmProxy(provider),
        },
        model,
        temperature,
        streamUsage: false,
        streaming: false,
    });
}

function defineLlm() {
    const provider = llmConfig.agentMode;
    const llmModel = llmConfig.modelName[provider];

    const llm = createProxyLlm(provider, llmModel, 0);
    const chatLlm = createProxyLlm("chat", llmConfig.modelName.chat, 0);

    return { llm, chatLlm };
}

export function defineGisAgent(viewer) {
    const { llm, chatLlm } = defineLlm();
    const [searchAndFlyTool, flyToTool, sqlFilterTool] = defineTools(viewer);

    GIS_AGENT.router = {
        invoke: async ({ input }) => {
            const text = String(input || "").trim();

            if (
                text.includes("- **任务**：定位") &&
                text.includes("- **类型**：") &&
                text.includes("- **名称**：")
            ) {
                return "position";
            }

            if (
                text.includes("- **任务**：筛选") &&
                text.includes("- **类型**：") &&
                text.includes("- **筛选类型**：")
            ) {
                return "filter";
            }

            if (/(定位|搜索|查找|飞到|跳转到)/i.test(text)) {
                return "position";
            }

            if (
                /(筛选|过滤|只看|位于|属于|统计|数量|多少|列表|大于|小于|介于)/i.test(
                    text,
                )
            ) {
                return "filter";
            }

            return "chat";
        },
    };

    const positionPrompt = ChatPromptTemplate.fromMessages([
        ["system", `${POSITION_PROMPT}`],
        new MessagesPlaceholder("chat_history"),
        ["human", "{input}"],
        new MessagesPlaceholder("agent_scratchpad"),
    ]);

    const positionAgent = createToolCallingAgent({
        llm,
        tools: [searchAndFlyTool, flyToTool],
        prompt: positionPrompt,
        streamRunnable: false,
    });

    GIS_AGENT.position = {
        agent: positionAgent,
        executor: new AgentExecutor({
            agent: positionAgent,
            tools: [searchAndFlyTool, flyToTool],
            handleParsingErrors: true,
            maxIterations: 4,
            verbose: false,
        }),
    };

    const filterPrompt = ChatPromptTemplate.fromMessages([
        ["system", `${FILTER_PROMPT}`],
        new MessagesPlaceholder("chat_history"),
        ["human", "{input}"],
        new MessagesPlaceholder("agent_scratchpad"),
    ]);

    const filterAgent = createToolCallingAgent({
        llm,
        tools: [sqlFilterTool],
        prompt: filterPrompt,
        streamRunnable: false,
    });

    GIS_AGENT.filter = {
        agent: filterAgent,
        executor: new AgentExecutor({
            agent: filterAgent,
            tools: [sqlFilterTool],
            handleParsingErrors: true,
            maxIterations: 4,
            verbose: false,
        }),
    };

    const chatPrompt = ChatPromptTemplate.fromMessages([
        [
            "system",
            "你是一个友好的 GIS 助手。请用简洁、专业的语言回答用户的普通闲聊问题。",
        ],
        new MessagesPlaceholder("chat_history"),
        ["human", "{input}"],
    ]);

    GIS_AGENT.chat = chatPrompt
        .pipe(chatLlm)
        .pipe(new StringOutputParser())
        .pipe((text) => (text ? text.replace(/[*#`_~>]/g, "") : ""));
}

function defineTools(viewer) {
    const searchAndFlyTool = new DynamicStructuredTool({
        name: "search_and_fly",
        description:
            "综合搜索定位工具。按名称搜索实体，优先查找本地数据；若没有命中，再查询远程数据库。找到后自动控制地图飞行定位。",
        schema: z.object({
            keyword: z
                .string()
                .describe("实体名称关键词，尽量使用简短英文，如 'Three Gorges'、'Miyun'、'Winnipeg'"),
            type: z.enum(["barrier", "reservoir"]).describe("实体类型"),
        }),
        func: async ({ keyword, type }) => searchAndFly(viewer, keyword, type),
    });

    const flyToTool = new DynamicStructuredTool({
        name: "fly_to",
        description:
            "精确 ID 定位工具。当上下文中已经知道实体 id 时，必须优先使用该工具，而不是重新按名称搜索。",
        schema: z.object({
            id: z.string().describe("实体唯一 id，格式如 'b-12345' 或 'r-67890'"),
        }),
        func: async ({ id }) => {
            const entity = getAllEntities().getById(id);

            if (entity) {
                viewer.selectedEntity = entity;
                await viewer.flyTo(toRaw(viewer.selectedEntity), {
                    duration: 1.5,
                });
                return `SUCCESS:已定位到实体"${entity.name}"(id:${id})，视角已自动调整。`;
            }

            return `ERROR:当前不存在该实体(id:${id})。`;
        },
    });

    const sqlFilterTool = new DynamicStructuredTool({
        name: "sql_filter",
        description:
            "高级过滤工具。根据实体类型和 SQL 条件子句查询数据库，并更新地图筛选结果。调用前必须参考 retrieved_context 生成 condition。",
        schema: z.object({
            type: z.enum(["barrier", "reservoir"]).describe("实体类型"),
            condition: z
                .string()
                .describe(
                    "WHERE 子句中的 condition，不包含 WHERE、SELECT、FROM、表名、排序或分页。",
                ),
        }),
        func: async ({ type, condition }) => sqlFilter(viewer, type, condition),
    });

    return [searchAndFlyTool, flyToTool, sqlFilterTool];
}

async function searchAndFly(viewer, keyword, type) {
    const normalizedKeyword = String(keyword || "").trim();
    if (!normalizedKeyword) {
        return "ERROR:关键词为空，无法执行定位。";
    }

    const entities = getEntitiesFromDataSource(type);
    const localTarget = entities.find((e) =>
        String(e?.name || "").includes(normalizedKeyword),
    );

    if (localTarget) {
        viewer.selectedEntity = localTarget;
        await viewer.flyTo(toRaw(viewer.selectedEntity), { duration: 1.5 });
        return `SUCCESS:本地已找到实体"${localTarget.name}"(id:${localTarget.id})，视角已自动定位。`;
    }

    try {
        const url = API_ENDPOINT.position[type];
        const res = await axios.post(url, normalizedKeyword, {
            headers: { "Content-Type": "text/plain" },
        });

        if (res.data.code === 1 && res.data.data) {
            const item = res.data.data;

            let entityId = "";
            let entityName = "";

            switch (type) {
                case "barrier":
                    entityId = `b-${item.gdwId}`;
                    entityName = item.dam_name || `Barrier #${item.gdwId}`;
                    break;
                case "reservoir":
                    entityId = `r-${item.gdwId}`;
                    entityName = item.res_name || `Reservoir #${item.gdwId}`;
                    break;
                default:
                    return `ERROR:未知实体类型:${type}。`;
            }

            const entity = entities.getById(entityId);

            if (entity) {
                viewer.selectedEntity = entity;
                await viewer.flyTo(toRaw(viewer.selectedEntity), {
                    duration: 1.5,
                });
                return `SUCCESS:远程数据库查询到"${entityName}"(id:${entityId})，已加载并自动定位。`;
            }

            return `ERROR:数据库查到结果，但实体加载失败(id:${entityId})。`;
        }

        return `ERROR:未找到名称为"${normalizedKeyword}"的${type}实体。`;
    } catch (error) {
        return `ERROR:搜索过程出错:${error.message}`;
    }
}

async function sqlFilter(viewer, type, condition) {
    const normalizedCondition = String(condition || "").trim();
    if (!normalizedCondition) {
        return "ERROR:筛选条件为空，无法执行查询。";
    }

    try {
        const url = API_ENDPOINT.filter[type];
        clearAllEntities(viewer);

        const res = await axios.post(url, normalizedCondition, {
            headers: { "Content-Type": "text/plain" },
        });

        if (res.data.code === 1 && Array.isArray(res.data.data)) {
            const data = res.data.data;

            if (data.length === 0) {
                return "SUCCESS:查询成功，但未找到符合条件的实体。";
            }

            data.forEach((item) => {
                if (type === "barrier") {
                    loadBarrierEntity(viewer, item);
                } else if (type === "reservoir") {
                    loadReservoirEntity(viewer, item);
                } else {
                    console.warn(`未知实体类型:${type}`);
                }
            });

            await rotateEarth(viewer, computeCenter(getAllEntities()));

            return `SUCCESS:查询成功，已筛选出 ${data.length} 个符合条件的${type}实体。`;
        }

        return `ERROR:查询失败:${res.data.message || "未知错误"}。`;
    } catch (error) {
        return `ERROR:查询出错:${error.message}`;
    }
}

function missionLabel(intent) {
    switch (intent) {
        case "position":
            return "定位";
        case "filter":
            return "筛选";
        case "chat":
            return "聊天";
        default:
            return "聊天";
    }
}
