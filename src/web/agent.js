import axios from "axios";
import z from "zod";
import { ChatOpenAI } from "@langchain/openai";
import { ChatOllama } from "@langchain/ollama";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { AgentExecutor, createToolCallingAgent } from "langchain/agents";
import { API_ENDPOINT, SYSTEM_PROMPT, SQL_PROMPT } from "./config";

const agentConfig = {
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
};

let agentExecutor = null;
let chatHistory = [];

window.initAgent = async function (viewer) {
    // 初始化聊天对话框界面
    const ui = initUI();

    if (agentConfig.agentMode === "cloud" && !agentConfig.cloud.apiKey) {
        ui.addMessage("agent", "错误:Cloud模式下未配置API-Key,请检查.env文件.");
        return;
    }

    try {
        let llm;
        let currentModelName;

        // 根据智能体模式选择对应语言模型
        if (agentConfig.agentMode === "local") {
            // 本地部署模型
            llm = new ChatOllama({
                baseUrl: agentConfig.local.baseUrl,
                model: agentConfig.local.modelName,
                temperature: 0,
            });
            currentModelName = agentConfig.local.modelName;
        } else if (agentConfig.agentMode === "cloud") {
            // 云服务远程调用模型
            llm = new ChatOpenAI({
                apiKey: agentConfig.cloud.apiKey,
                configuration: { baseURL: agentConfig.cloud.baseUrl },
                model: agentConfig.cloud.modelName,
                temperature: 0,
                // 关闭用量统计提高云服务接口兼容
                streamUsage: false,
            });
            currentModelName = agentConfig.cloud.modelName;
        }

        const tools = defineTools(viewer);

        const prompt = ChatPromptTemplate.fromMessages([
            ["system", `${SYSTEM_PROMPT}`],
            ["placeholder", "{chat_history}"],
            ["human", "{input}"],
            ["placeholder", "{agent_scratchpad}"],
        ]);

        const agent = createToolCallingAgent({
            llm,
            tools,
            prompt,
        });

        agentExecutor = new AgentExecutor({
            agent,
            tools,
            // 开启解析错误处理
            handleParsingErrors: true,
            // 限制最大迭代次数防止无限循环
            maxIterations: 5,
        });

        ui.clearLoading();
        ui.updateHeader(agentConfig.agentMode);
        // 聊天窗口欢迎招呼消息
        ui.addMessage(
            "agent",
            `就绪!我是GIS助手(模式:${agentConfig.agentMode},模型:${currentModelName}).`,
        );
        bindEvents(ui);
    } catch (error) {
        console.error("Agent初始化失败:", error);
        ui.clearLoading();
        // 检查本地模型连接情况
        if (
            agentConfig.agentMode === "local" &&
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
            "高级过滤工具.根据SQL条件筛选实体.适用于'大于'、'小于'、'筛选'等批量查询场景.",
        schema: z.object({
            sql: z.string().describe(`${SQL_PROMPT}`),
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

        const loadingId = ui.addMessage("agent", "思考中...", true);

        try {
            if (!agentExecutor) throw new Error("Agent未初始化");

            const result = await agentExecutor.invoke({
                input: text,
                // 传递对话记录供模型上下文参考
                chat_history: chatHistory,
            });
            // 更新聊天历史对话记录
            chatHistory.push(new HumanMessage(text));
            chatHistory.push(new AIMessage(result.output));

            // 保留最新的十条对话记录
            if (chatHistory.length > 10) {
                chatHistory = chatHistory.slice(chatHistory.length - 10);
            }
            // 更新智能体回复内容替换思考提示
            ui.updateMessage(loadingId, result.output);
        } catch (e) {
            console.error(e);
            ui.updateMessage(loadingId, `执行出错:${e.message}`);
        } finally {
            ui.sendBtn.disabled = false;
            ui.sendBtn.style.opacity = "1";
            ui.input.focus();
        }
    };

    // 发送按钮与回车按键绑定消息发送
    ui.sendBtn.onclick = handleSend;
    ui.input.onkeypress = (e) => e.key === "Enter" && handleSend();
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
