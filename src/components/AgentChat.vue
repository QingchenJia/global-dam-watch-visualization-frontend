<template>
    <div
        id="agent-chat-container"
        class="agent-chat-container"
        :class="{ minimized: isMinimized }"
        ref="chatContainer"
    >
        <!-- 头部 -->
        <div class="agent-header" @click="toggleMinimize">
            <div class="agent-header-left">
                <div class="agent-avatar-icon">
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <circle
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            stroke-width="1.5"
                        />
                        <path
                            d="M8 12h8M12 8v8"
                            stroke="currentColor"
                            stroke-width="1.5"
                            stroke-linecap="round"
                        />
                        <circle
                            cx="12"
                            cy="12"
                            r="3"
                            fill="currentColor"
                            opacity="0.4"
                        />
                    </svg>
                </div>
                <div class="agent-header-info">
                    <span class="agent-title">GIS Agent</span>
                    <span class="agent-subtitle"
                        >{{ agentMode }} · {{ modelName }}</span
                    >
                </div>
            </div>
            <div class="agent-header-right">
                <span
                    class="agent-status-dot"
                    :class="{ active: !loading }"
                ></span>
                <button
                    class="agent-minimize-btn"
                    :title="isMinimized ? '展开' : '收起'"
                >
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path
                            :d="
                                isMinimized ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'
                            "
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        />
                    </svg>
                </button>
            </div>
        </div>

        <!-- 消息区 -->
        <div class="agent-messages" ref="messagesContainer">
            <div
                v-for="(msg, index) in messages"
                :key="index"
                :class="['message-row', msg.sender]"
            >
                <!-- 智能体消息头像 -->
                <div
                    v-if="msg.sender === 'agent'"
                    class="msg-avatar agent-msg-avatar"
                >
                    <img
                        src="../assets/images/agent-avatar.svg"
                        alt="GIS Agent"
                    />
                </div>

                <div
                    :class="[
                        'message-bubble',
                        msg.sender,
                        { loading: msg.loading },
                    ]"
                >
                    <!-- 打字动画 -->
                    <template v-if="msg.loading">
                        <div class="typing-indicator">
                            <span></span><span></span><span></span>
                        </div>
                        <span class="typing-label">{{ msg.content }}</span>
                    </template>
                    <div
                        v-else
                        class="message-content"
                        v-html="msg.content"
                    ></div>
                </div>

                <!-- 用户消息头像 -->
                <div
                    v-if="msg.sender === 'user'"
                    class="msg-avatar user-msg-avatar"
                >
                    <img src="../assets/images/user-avatar.svg" alt="User" />
                </div>
            </div>
        </div>

        <!-- 输入区 -->
        <div class="agent-input-area">
            <input
                v-model="inputText"
                @keyup.enter="sendMessage"
                placeholder="向GIS Agent发送指令..."
                :disabled="loading"
                ref="inputInput"
            />
            <button
                class="send-btn"
                @click="sendMessage"
                :disabled="loading"
                title="发送"
            >
                <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path
                        d="M22 2L11 13"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    />
                    <path
                        d="M22 2L15 22L11 13L2 9L22 2Z"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    />
                </svg>
            </button>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, nextTick, computed } from "vue";
import { chatToAgent, llmConfig, defineTotalAgent } from "../hooks/agent.js";

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
    const name = llmConfig[llmConfig.agentMode]?.modelName || "未知模型";
    const index = name.lastIndexOf("/");

    return index === -1 ? name : name.slice(index + 1);
});

function toggleMinimize() {
    isMinimized.value = !isMinimized.value;
}

function addMessage(sender, content, isLoading = false) {
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
}

function updateLoadingMessage(text) {
    const loadingMsg = messages.value.find((m) => m.id === "agent-loading-msg");
    if (loadingMsg) {
        // 更新为最终文本并移除loading状态
        loadingMsg.content = text.replace(/\n/g, "<br>");
        loadingMsg.loading = false;
        // 移除id以避免误更新
        loadingMsg.id = undefined;
    }
}

function handleError(errorText) {
    updateLoadingMessage(errorText);
    loading.value = false;
    nextTick(() => inputInput.value?.focus());
}

function scrollToBottom() {
    nextTick(() => {
        if (messagesContainer.value) {
            messagesContainer.value.scrollTop =
                messagesContainer.value.scrollHeight;
        }
    });
}

async function sendMessage() {
    if (!inputText.value.trim() || loading.value) return;

    const text = inputText.value.trim();
    addMessage("user", text);
    inputText.value = "";
    loading.value = true;

    await chatToAgent(text, {
        question: (intent) => {
            // 发起对话反馈正在执行任务
            addMessage("agent", `执行任务(${intent})···`, true);
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
}

onMounted(() => {
    defineTotalAgent(globalVar.viewer);
    // 添加智能体的欢迎消息
    addMessage(
        "agent",
        `我是您的个人GIS助手(Hybrid Router架构)，有什么可以帮到您？`,
    );
});
</script>
