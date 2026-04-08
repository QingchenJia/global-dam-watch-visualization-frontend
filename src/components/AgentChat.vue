<template>
    <div
        id="agent-chat-container"
        class="agent-chat-container"
        :class="{ minimized: isMinimized }"
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
                        >{{ mode }} · {{ modelName }}</span
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
                    <template v-else-if="msg.kind === 'tag-shortcuts'">
                        <div class="message-content">{{ msg.content }}</div>
                        <div class="msg-tag-groups">
                            <div class="msg-top-groups">
                                <div class="msg-tag-group">
                                    <p>任务</p>
                                    <div class="msg-tag-list">
                                        <button
                                            v-for="tag in quickActions"
                                            :key="`action-${tag}`"
                                            class="msg-tag"
                                            :class="{
                                                active: selectedTask === tag,
                                            }"
                                            type="button"
                                            @click="selectTaskTag(tag)"
                                        >
                                            {{ tag }}
                                        </button>
                                    </div>
                                </div>

                                <div class="msg-tag-group">
                                    <p>类型</p>
                                    <div class="msg-tag-list">
                                        <button
                                            v-for="tag in quickTypes"
                                            :key="`type-${tag}`"
                                            class="msg-tag"
                                            :class="{
                                                active: selectedType === tag,
                                            }"
                                            type="button"
                                            @click="selectTypeTag(tag)"
                                        >
                                            {{ tag }}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div class="msg-tag-group">
                                <p>属性</p>
                                <div class="msg-tag-list">
                                    <button
                                        v-for="tag in allPropertyTags"
                                        :key="`property-${tag}`"
                                        class="msg-tag"
                                        :class="{
                                            active: selectedPropertyTags.includes(
                                                tag,
                                            ),
                                        }"
                                        :disabled="isPropertyTagDisabled(tag)"
                                        type="button"
                                        @click="selectPropertyTag(tag)"
                                    >
                                        {{ tag }}
                                    </button>
                                </div>
                            </div>
                        </div>
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
            <textarea
                v-model="inputText"
                @keydown.enter.exact.prevent="sendMessage"
                placeholder="向GIS Agent发送指令···"
                :disabled="loading"
                ref="inputInput"
            ></textarea>
            <div class="input-actions">
                <button
                    class="call-btn"
                    @click="
                        addMessage(
                            'agent',
                            WELCOME_TEXT,
                            false,
                            'tag-shortcuts',
                        )
                    "
                    :disabled="loading"
                    title="呼叫"
                >
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path
                            d="M22 16.5V20a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.52 19.52 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3.5a2 2 0 0 1 2 1.72c.12.91.35 1.81.68 2.67a2 2 0 0 1-.45 2.11L8.36 9.97a16 16 0 0 0 5.67 5.67l1.47-1.48a2 2 0 0 1 2.11-.45c.86.33 1.76.56 2.67.68A2 2 0 0 1 22 16.5Z"
                            stroke="currentColor"
                            stroke-width="1.8"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        />
                    </svg>
                </button>
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
    </div>
</template>

<script setup>
import { ref, onMounted, nextTick, computed, watch } from "vue";
import { chatToAgent, llmConfig, defineGisAgent } from "../hooks/agent.js";

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
const selectedTask = ref("");
const selectedType = ref("");
const selectedPropertyTags = ref([]);

const quickActions = ["定位", "筛选"];
const quickTypes = ["大坝", "水库"];
const commonTags = [
    "主要流域",
    "主要用途",
    "数据质量",
    "建成年份",
    "国家或地区",
];
const damOnlyTags = ["大坝类型", "大坝长度", "大坝高度"];
const reservoirOnlyTags = ["库容", "表面积", "水库深度"];
const allPropertyTags = [...commonTags, ...damOnlyTags, ...reservoirOnlyTags];
const WELCOME_TEXT =
    "我是您的个人GIS助手(Hybrid Router架构)，可直接点击下方标签快速组合输入：";

// 计算当前模式和模型名称用于标题显示
const mode = computed(() => llmConfig.agentMode);
const modelName = computed(() => {
    const name = llmConfig.modelName[mode.value] || "未知模型";
    const index = name.lastIndexOf("/");

    return index === -1 ? name : name.slice(index + 1);
});

function toggleMinimize() {
    isMinimized.value = !isMinimized.value;
}

function syncInputFromSelections() {
    inputText.value = buildFormattedPrompt();
    nextTick(() => inputInput.value?.focus());
}

function buildFormattedPrompt() {
    if (
        !selectedTask.value &&
        !selectedType.value &&
        !selectedPropertyTags.value.length
    ) {
        return "";
    }

    if (selectedTask.value === "定位") {
        return [
            `- **任务**：定位`,
            `- **类型**：${selectedType.value || ""}`,
            `- **名称**：`,
        ].join("\n");
    }

    if (selectedTask.value === "筛选") {
        const lines = [
            `- **任务**：筛选`,
            `- **类型**：${selectedType.value || ""}`,
            `- **筛选类型**：`,
        ];

        selectedPropertyTags.value.forEach((tag, index) => {
            lines.push(`  ${index + 1}. **${tag}**：`);
        });

        return lines.join("\n");
    }

    return [`- **任务**：`, `- **类型**：${selectedType.value || ""}`].join(
        "\n",
    );
}

function selectTaskTag(tag) {
    if (selectedTask.value === tag) {
        selectedTask.value = "";
        selectedPropertyTags.value = [];
        syncInputFromSelections();
        return;
    }

    selectedTask.value = tag;

    if (tag === "定位" && selectedPropertyTags.value.length) {
        selectedPropertyTags.value = [];
    }

    syncInputFromSelections();
}

function selectTypeTag(tag) {
    if (selectedType.value === tag) {
        selectedType.value = "";
        selectedPropertyTags.value = [];
        syncInputFromSelections();
        return;
    }

    selectedType.value = tag;

    if (selectedTask.value === "筛选") {
        const tagsToRemove = tag === "大坝" ? reservoirOnlyTags : damOnlyTags;
        selectedPropertyTags.value = selectedPropertyTags.value.filter(
            (item) => !tagsToRemove.includes(item),
        );
    }

    syncInputFromSelections();
}

function selectPropertyTag(tag) {
    if (selectedPropertyTags.value.includes(tag)) {
        selectedPropertyTags.value = selectedPropertyTags.value.filter(
            (item) => item !== tag,
        );
        syncInputFromSelections();
        return;
    }

    if (isPropertyTagDisabled(tag)) return;

    selectedPropertyTags.value = [...selectedPropertyTags.value, tag];
    syncInputFromSelections();
}

function isPropertyTagDisabled(tag) {
    if (selectedPropertyTags.value.includes(tag)) {
        return false;
    }

    if (selectedTask.value !== "筛选") {
        return true;
    }

    if (!selectedType.value) {
        return true;
    }

    if (selectedTask.value === "定位") {
        return true;
    }

    if (selectedTask.value === "筛选" && selectedType.value === "大坝") {
        return reservoirOnlyTags.includes(tag);
    }

    if (selectedTask.value === "筛选" && selectedType.value === "水库") {
        return damOnlyTags.includes(tag);
    }

    return false;
}

watch(inputText, (value) => {
    if (!value.trim()) {
        selectedTask.value = "";
        selectedType.value = "";
        selectedPropertyTags.value = [];
    }
});

function addMessage(sender, content, isLoading = false, kind = "text") {
    // 格式化换行符
    const formattedContent = isLoading
        ? content
        : content.replace(/\n/g, "<br>");

    const msg = {
        sender,
        content: formattedContent,
        loading: isLoading,
        kind,
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
    // 先展示欢迎语
    // 避免初始化异常导致首条消息缺失
    addMessage("agent", WELCOME_TEXT, false, "tag-shortcuts");
    defineGisAgent(globalVar.viewer);
});
</script>
