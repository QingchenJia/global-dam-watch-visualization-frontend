<template>
    <div
        id="agent-chat-container"
        class="agent-chat-container"
        :class="{ minimized: isMinimized }"
        ref="chatContainer"
    >
        <div class="agent-header" @click="toggleMinimize">
            <!-- 动态显示模型名称 -->
            <span id="agent-title"
                >GIS Agent({{ agentMode }}) - {{ modelName }}</span
            >
            <span class="agent-toggle">{{ isMinimized ? "+" : "-" }}</span>
        </div>
        <div class="agent-messages" ref="messagesContainer">
            <div
                v-for="(msg, index) in messages"
                :key="index"
                :class="['message', msg.sender, { loading: msg.loading }]"
            >
                <div class="message-content" v-html="msg.content"></div>
            </div>
        </div>
        <div class="agent-input-area">
            <input
                v-model="inputText"
                @keyup.enter="sendMessage"
                placeholder="输入指令..."
                :disabled="loading"
                ref="inputInput"
            />
            <button @click="sendMessage" :disabled="loading">发送</button>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, nextTick, computed } from "vue";
import { agentChat, llmConfig, defineAgentExecutors } from "../utils/agent.js";

const globalVar = defineProps({
    viewer: {
        type: Object,
        required: true,
    },
});

const isMinimized = ref(false);
const messages = ref([]);
const inputText = ref("");
const loading = ref(false);
const messagesContainer = ref(null);
const inputInput = ref(null);

// 计算当前模式和模型名称用于标题显示
const agentMode = computed(() => llmConfig.agentMode);
const modelName = computed(() => {
    return llmConfig[llmConfig.agentMode]?.modelName || "未知模型";
});

const toggleMinimize = () => {
    isMinimized.value = !isMinimized.value;
};

const addMessage = (sender, content, isLoading = false) => {
    // 格式化换行符
    const formattedContent = isLoading
        ? content
        : content.replace(/\n/g, "<br>");

    const msg = {
        sender,
        content: formattedContent,
        loading: isLoading,
        // 如果是loading消息则添加id
        id: isLoading ? "agent-loading-msg" : undefined,
    };

    messages.value.push(msg);
    scrollToBottom();

    // 返回消息引用便于后续更新
    return msg;
};

const updateLoadingMessage = (text) => {
    const loadingMsg = messages.value.find((m) => m.id === "agent-loading-msg");
    if (loadingMsg) {
        // 更新为最终文本并移除loading状态
        loadingMsg.content = text.replace(/\n/g, "<br>");
        loadingMsg.loading = false;
        // 移除id以避免误更新
        loadingMsg.id = undefined;
    }
};

const handleError = (errorText) => {
    updateLoadingMessage(errorText);
    loading.value = false;
    nextTick(() => inputInput.value?.focus());
};

const scrollToBottom = () => {
    nextTick(() => {
        if (messagesContainer.value) {
            messagesContainer.value.scrollTop =
                messagesContainer.value.scrollHeight;
        }
    });
};

const sendMessage = async () => {
    if (!inputText.value.trim() || loading.value) return;

    const text = inputText.value.trim();
    addMessage("user", text);
    inputText.value = "";
    loading.value = true;

    try {
        await agentChat(text, {
            question: (intent) => {
                // 发起对话反馈正在执行任务
                addMessage("agent", `执行任务(${intent})...`, true);
            },
            answer: (finalOutput) => {
                // 任务完成更新对话结果
                updateLoadingMessage(finalOutput);
                loading.value = false;
                nextTick(() => inputInput.value?.focus());
            },
            handle: (errorMsg) => {
                handleError(errorMsg);
            },
        });
    } catch (err) {
        if (loading.value) {
            handleError(`执行出错:${err.message}`);
        }
    }
};

onMounted(() => {
    defineAgentExecutors(globalVar.viewer);
    // 添加智能体的欢迎消息
    addMessage(
        "agent",
        `就绪!我是您的个人GIS助手(Hybrid Router架构),有什么可以帮到您?`,
    );
});
</script>
