import axios from "axios";
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
import { API_ENDPOINT, RULE_PROMPT, FIND_PROMPT, SQL_PROMPT } from "./config";

const llmConfig = {
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

// 定义不同任务职责的智能体执行器
let agentExecutors = {
    position: null,
    filter: null,
    chat: null,
    router: null,
};
let chatHistory = [];

window.initAgent = async function (viewer) {
    // 初始化聊天对话框界面
    const ui = initUI();

    if (llmConfig.agentMode === "cloud" && !llmConfig.cloud.apiKey) {
        ui.addMessage("agent", "错误:Cloud模式下未配置API key,请检查.env文件.");
        return;
    }

    try {
        // 定义大语言模型与聊天模型
        const { llm, chatLlm, currentModelName } = defineLlm();
        // 初始化定义智能体所需的工具
        const [searchAndFlyTool, flyToEntityTool, sqlFilterEntityTool] =
            defineTools(viewer);
        // 定义不同任务职责的智能体
        defineAgent(
            llm,
            chatLlm,
            searchAndFlyTool,
            flyToEntityTool,
            sqlFilterEntityTool,
        );

        ui.clearLoading();
        ui.updateHeader(llmConfig.agentMode);
        // 聊天窗口欢迎招呼消息
        ui.addMessage(
            "agent",
            `就绪!我是GIS助手(Hybrid Router架构,模型:${currentModelName}).`,
        );
        bindEvents(ui);
    } catch (error) {
        console.error("Agent初始化失败:", error);
        ui.clearLoading();
        // 检查本地模型连接情况
        if (
            llmConfig.agentMode === "local" &&
            (error.message.includes("fetch") ||
                error.message.includes("network"))
        ) {
            // 连接本地模型失败提示
            ui.addMessage(
                "agent",
                "连接Ollama失败.请确保服务已启动(ollama serve).",
            );
        } else {
            ui.addMessage("agent", `初始化失败:${error.message}`);
        }
    }
};

function defineLlm() {
    let llm;
    let currentModelName;

    // 根据智能体模式选择对应语言模型
    if (llmConfig.agentMode === "local") {
        // 本地部署模型
        llm = new ChatOllama({
            baseUrl: llmConfig.local.baseUrl,
            model: llmConfig.local.modelName,
            temperature: 0,
            keepAlive: "15m",
        });
        currentModelName = llmConfig.local.modelName;
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
        currentModelName = llmConfig.cloud.modelName;
    }

    const chatLlm = new ChatOpenAI({
        apiKey: llmConfig.chat.apiKey,
        configuration: { baseURL: llmConfig.chat.baseUrl },
        model: llmConfig.chat.modelName,
    });

    return { llm, chatLlm, currentModelName };
}

function defineAgent(
    llm,
    chatLlm,
    searchAndFlyTool,
    flyToEntityTool,
    sqlFilterEntityTool,
) {
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
        [
            "system",
            `你负责**实体定位**任务.请使用'search_and_fly'或'fly_to_entity'工具来响应用户.${RULE_PROMPT}${FIND_PROMPT}`,
        ],
        new MessagesPlaceholder("chat_history"),
        ["human", "{input}"],
        new MessagesPlaceholder("agent_scratchpad"),
    ]);
    const positionAgent = createToolCallingAgent({
        llm: llm,
        tools: [searchAndFlyTool, flyToEntityTool],
        prompt: positionPrompt,
    });
    // 定义实体定位智能体执行器
    agentExecutors.position = new AgentExecutor({
        agent: positionAgent,
        tools: [searchAndFlyTool, flyToEntityTool],
        handleParsingErrors: true,
    });

    const filterPrompt = ChatPromptTemplate.fromMessages([
        [
            "system",
            `你负责**条件筛选**任务.你的核心能力是将用户的自然语言转换为PostGIS SQL语句.${RULE_PROMPT}${SQL_PROMPT}`,
        ],
        new MessagesPlaceholder("chat_history"),
        ["human", "{input}"],
        new MessagesPlaceholder("agent_scratchpad"),
    ]);
    const filterAgent = createToolCallingAgent({
        llm: llm,
        tools: [sqlFilterEntityTool],
        prompt: filterPrompt,
    });
    // 定义条件筛选智能体执行器
    agentExecutors.filter = new AgentExecutor({
        agent: filterAgent,
        tools: [sqlFilterEntityTool],
        handleParsingErrors: true,
    });

    const chatPrompt = ChatPromptTemplate.fromMessages([
        [
            "system",
            "你是一个友好的GIS助手.请用简练专业的语言回答用户的普通闲聊问题.",
        ],
        new MessagesPlaceholder("chat_history"),
        ["human", "{input}"],
    ]);
    // 定义普通聊天智能体执行器
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
        func: async ({ keyword, type }) =>
            searchAndFlyToEntity(viewer, keyword, type),
    });

    const flyToEntityTool = new DynamicStructuredTool({
        name: "fly_to_entity",
        description:
            "精确id定位工具.当上下文中已经知道实体的id时,必须优先使用此工具进行跳转,而不是重新搜索名称.",
        schema: z.object({
            id: z.string().describe("实体唯一id(格式如'b-12345'或'r-67890')"),
        }),
        func: async ({ id }) => {
            const entity = viewer.entities.getById(id);
            if (entity) {
                viewer.selectedEntity = entity;
                viewer.flyTo(entity, { duration: 1.5 });
                return `SUCCESS:已定位到实体"${entity.name}"(id:${id}),视角已自动调整.`;
            } else {
                return `ERROR:不存在当前实体(id:${id}).`;
            }
        },
    });

    const sqlFilterEntityTool = new DynamicStructuredTool({
        name: "sql_filter_entity",
        description:
            "高级过滤工具.根据生成的SQL执行查询.注意:调用此工具前必须确保SQL语句符合Schema定义.",
        schema: z.object({
            sql: z.string().describe("符合SQL_PROMPT要求的PostgreSQL查询语句"),
            type: z.enum(["barrier", "reservoir"]).describe("实体类型"),
        }),
        func: async ({ sql, type }) => sqlFilterEntity(viewer, sql, type),
    });

    return [searchAndFlyTool, flyToEntityTool, sqlFilterEntityTool];
}

async function searchAndFlyToEntity(viewer, keyword, type) {
    const entities = viewer.entities.values;

    // 遍历本地实体列表查找名称模糊匹配
    const localTarget = entities.find((e) => {
        if (e.properties?.dataType?.getValue() !== type) return false;
        return e.name.includes(keyword);
    });

    if (localTarget) {
        viewer.selectedEntity = localTarget;
        viewer.flyTo(localTarget, { duration: 1.5 });
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
                viewer.flyTo(entity, { duration: 1.5 });
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

async function sqlFilterEntity(viewer, sql, type) {
    try {
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

function bindEvents(ui) {
    const handleSend = async () => {
        // 裁切输入文本中多余空白
        const text = ui.input.value.trim();
        if (!text || ui.sendBtn.disabled) return;
        // 消息发送期间禁用发送按钮
        ui.sendBtn.disabled = true;
        ui.sendBtn.style.opacity = "0.6";

        ui.addMessage("user", text);
        ui.input.value = "";

        try {
            if (!agentExecutors.router) throw new Error("Agent未初始化");

            const intent = await agentExecutors.router.invoke({
                input: text,
                chat_history: chatHistory,
            });

            let resultOutput = "";
            let executor = null;

            const loadingId = ui.addMessage(
                "agent",
                `执行任务(${intent})...`,
                true,
            );

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
            // 更新智能体回复内容替换思考提示
            ui.updateMessage(loadingId, finalOutput);
        } catch (e) {
            console.error(e);
            const errorMsg = e.message.includes("404")
                ? "服务未响应"
                : e.message;
            ui.updateMessage(loadingId, `执行出错:${errorMsg}`);
        } finally {
            ui.sendBtn.disabled = false;
            ui.sendBtn.style.opacity = "1";
            ui.input.focus();
        }
    };

    // 发送按钮与回车按键绑定消息发送
    ui.sendBtn.onclick = handleSend;

    ui.input.onkeypress = (e) => {
        // 避免箭头函数直接返回false导致阻止默认输入行为
        if (e.key === "Enter") {
            handleSend();
        }
    };
}

function initUI() {
    const container = document.getElementById("agent-chat-container");
    const messagesContainer = document.getElementById("agent-messages");
    const toggleBtn = document.getElementById("agent-toggle");
    const titleSpan = document.getElementById("agent-title");
    const input = document.getElementById("agent-input");
    const sendBtn = document.getElementById("agent-send-btn");

    if (!container || !messagesContainer || !input || !sendBtn) {
        console.error("Agent UI elements not found in index.html");
        return null;
    }

    toggleBtn.onclick = () => container.classList.toggle("minimized");

    container.querySelector(".agent-header").onclick = (e) => {
        if (e.target !== toggleBtn) container.classList.toggle("minimized");
    };

    return {
        input: input,
        sendBtn: sendBtn,
        container: container,
        messagesContainer: messagesContainer,
        toggleBtn: toggleBtn,
        titleSpan: titleSpan,

        // 同步更新标题栏显示智能体模式
        updateHeader: (mode) => {
            titleSpan.textContent = `🦜🔗 GIS Agent(${mode})`;
        },

        scrollToBottom: () => {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        },

        addMessage: (role, text, loading) => {
            const msgDiv = document.createElement("div");
            msgDiv.className = `message ${role} ${loading ? "loading" : ""}`;

            if (!loading) {
                text = text.replace(/\n/g, "<br>");
            }
            msgDiv.innerHTML = text;

            if (loading) msgDiv.id = "agent-loading-msg";

            messagesContainer.appendChild(msgDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;

            return msgDiv.id;
        },

        updateMessage: (id, text) => {
            if (!id) return;
            // 更新指定消息的内容
            const msgDiv = document.getElementById(id);
            if (msgDiv) {
                msgDiv.innerHTML = text.replace(/\n/g, "<br>");
                msgDiv.classList.remove("loading");
                msgDiv.removeAttribute("id");
            }
        },

        clearLoading: () => {
            const loadingMsg = document.getElementById("agent-loading-msg");
            if (loadingMsg) loadingMsg.remove();
        },
    };
}
