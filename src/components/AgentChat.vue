<template>
    <div id="agent-chat-container" class="agent-chat-container">
        <div class="agent-header">
            <div class="agent-header-left">
                <span class="quick-panel__title-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                        <path
                            d="M12 2a2 2 0 0 1 2 2v1h2a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3h-1.5l-3.68 3.15a1 1 0 0 1-1.64-.76V17H8a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3h2V4a2 2 0 0 1 2-2zm-2.5 8a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5zm5 0a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5z"
                        />
                    </svg>
                </span>
                <div class="agent-header-info">
                    <div class="quick-panel__title-text">
                        <h2 class="hud-card-title agent-title">GIS Agent</h2>
                    </div>
                </div>
            </div>
            <div class="agent-header-right">
                <span
                    class="agent-status-dot"
                    :class="{ active: !loading }"
                ></span>
            </div>
        </div>

        <div class="agent-messages" ref="messagesContainer">
            <div
                v-for="(msg, index) in messages"
                :key="index"
                :class="['message-row', msg.sender]"
            >
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
                                            @click="handleSelectTaskTag(tag)"
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
                                            @click="handleSelectTypeTag(tag)"
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
                                        @click="handleSelectPropertyTag(tag)"
                                    >
                                        {{ tag }}
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div class="message-content">{{ WAKE_HINT_TEXT }}</div>
                    </template>
                    <div
                        v-else
                        class="message-content"
                        v-html="msg.content"
                    ></div>
                </div>

                <div
                    v-if="msg.sender === 'user'"
                    class="msg-avatar user-msg-avatar"
                >
                    <img src="../assets/images/user-avatar.svg" alt="User" />
                </div>
            </div>
        </div>

        <div class="agent-input-area">
            <textarea
                v-model="inputText"
                @keydown.enter.exact.prevent="handleSendMessage"
                @input="adjustInputHeight"
                placeholder="向 GIS Agent 发送指令...（Shift+Enter 换行）"
                :disabled="loading"
                ref="inputInput"
            ></textarea>
            <div class="input-actions">
                <button
                    class="voice-btn"
                    :class="{ listening: isListening }"
                    @click="handleToggleVoiceInput"
                    :disabled="loading || !isSpeechSupported"
                    :title="voiceButtonTitle"
                    type="button"
                >
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path
                            d="M12 3C10.3431 3 9 4.34315 9 6V11C9 12.6569 10.3431 14 12 14C13.6569 14 15 12.6569 15 11V6C15 4.34315 13.6569 3 12 3Z"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        />
                        <path
                            d="M5 11C5 14.866 8.13401 18 12 18C15.866 18 19 14.866 19 11"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        />
                        <path
                            d="M12 18V21"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        />
                        <path
                            d="M9 21H15"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        />
                    </svg>
                </button>
                <button
                    class="send-btn"
                    @click="handleSendMessage"
                    :disabled="loading"
                    title="发送消息"
                    type="button"
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
import {
    ref,
    onMounted,
    onBeforeUnmount,
    nextTick,
    computed,
    watch,
} from "vue";
import { chatToAgent, defineGisAgent } from "../hooks/agent.js";
import {
    createSpeechInput,
    SPEECH_ERROR_CODES,
    STOP_LISTENING_ERRORS,
} from "../utils/voice.js";

const globalVar = defineProps({
    viewer: {
        type: Object,
        required: true,
    },
});

const messages = ref([]);
const inputText = ref("");
const loading = ref(false);
const messagesContainer = ref(null);
const inputInput = ref(null);
const selectedTask = ref("");
const selectedType = ref("");
const selectedPropertyTags = ref([]);
const isListening = ref(false);
const isSpeechSupported = ref(false);
const SPEECH_NOTIFY_ERROR_CODES = [
    ...STOP_LISTENING_ERRORS,
    SPEECH_ERROR_CODES.AUDIO_CAPTURE,
];

let speechInput = null;

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
    "我是您的 GIS 助手（Hybrid Router 架构），可直接点击下方标签快速组合输入：";
const WAKE_HINT_TEXT = "如有需要，可继续通过标签补充条件。";
const INPUT_MAX_HEIGHT = 120;

const voiceButtonTitle = computed(() => {
    if (!isSpeechSupported.value) {
        return "当前浏览器不支持语音输入";
    }

    if (isListening.value) {
        return "停止语音输入";
    }

    return "语音输入";
});

function syncInputFromSelections() {
    inputText.value = buildFormattedPrompt();
    nextTick(() => {
        adjustInputHeight();
        inputInput.value?.focus();
    });
}

function adjustInputHeight() {
    const textarea = inputInput.value;
    if (!textarea) {
        return;
    }

    textarea.style.height = "auto";
    const nextHeight = Math.min(textarea.scrollHeight, INPUT_MAX_HEIGHT);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY =
        textarea.scrollHeight > INPUT_MAX_HEIGHT ? "auto" : "hidden";
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
            "- **任务**：定位",
            `- **类型**：${selectedType.value || ""}`,
            "- **名称**：",
        ].join("\n");
    }

    if (selectedTask.value === "筛选") {
        const lines = [
            "- **任务**：筛选",
            `- **类型**：${selectedType.value || ""}`,
            "- **筛选类型**：",
        ];

        selectedPropertyTags.value.forEach((tag, index) => {
            lines.push(`  ${index + 1}. **${tag}**：`);
        });

        return lines.join("\n");
    }

    return [`- **任务**：${selectedTask.value}`, `- **类型**：${selectedType.value || ""}`].join(
        "\n",
    );
}

function handleSelectTaskTag(tag) {
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

function handleSelectTypeTag(tag) {
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

function handleSelectPropertyTag(tag) {
    if (selectedPropertyTags.value.includes(tag)) {
        selectedPropertyTags.value = selectedPropertyTags.value.filter(
            (item) => item !== tag,
        );
        syncInputFromSelections();
        return;
    }

    if (isPropertyTagDisabled(tag)) {
        return;
    }

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

    if (selectedType.value === "大坝") {
        return reservoirOnlyTags.includes(tag);
    }

    if (selectedType.value === "水库") {
        return damOnlyTags.includes(tag);
    }

    return false;
}

function addMessage(sender, content, isLoading = false, kind = "text") {
    const msg = {
        sender,
        content: formatMessageContent(content, isLoading),
        loading: isLoading,
        kind,
        id: isLoading ? "agent-loading-msg" : undefined,
    };

    messages.value.push(msg);
    scrollToBottom();

    return msg;
}

function formatMessageContent(content, isLoading) {
    if (isLoading) {
        return content;
    }

    return content.replace(/\n/g, "<br>");
}

function updateLoadingMessage(text) {
    const loadingMsg = messages.value.find((m) => m.id === "agent-loading-msg");
    if (loadingMsg) {
        loadingMsg.content = text.replace(/\n/g, "<br>");
        loadingMsg.loading = false;
        loadingMsg.id = undefined;
    }
}

function handleError(errorText) {
    updateLoadingMessage(errorText);
    loading.value = false;
    nextTick(() => {
        adjustInputHeight();
        inputInput.value?.focus();
    });
}

function handleCallAgent() {
    if (loading.value) {
        return;
    }

    addMessage("agent", WELCOME_TEXT, false, "tag-shortcuts");
}

function scrollToBottom() {
    nextTick(() => {
        if (messagesContainer.value) {
            messagesContainer.value.scrollTop =
                messagesContainer.value.scrollHeight;
        }
    });
}

function appendSpeechText(text) {
    const speechText = text.trim();

    if (!speechText) {
        return;
    }

    inputText.value = mergeSpeechText(inputText.value, speechText);
    nextTick(() => {
        adjustInputHeight();
        inputInput.value?.focus();
    });
}

function mergeSpeechText(currentText, speechText) {
    const normalizedCurrentText = currentText.trim();

    if (!normalizedCurrentText) {
        return speechText;
    }

    return `${normalizedCurrentText}\n${speechText}`;
}

function getSpeechErrorCode(error) {
    if (!error) {
        return "";
    }

    if (typeof error === "string") {
        return error;
    }

    if (typeof error.error === "string") {
        return error.error;
    }

    if (typeof error.name === "string") {
        return error.name;
    }

    return "";
}

function shouldNotifySpeechError(errorCode) {
    return !loading.value && SPEECH_NOTIFY_ERROR_CODES.includes(errorCode);
}

function initSpeechRecognition() {
    speechInput = createSpeechInput({
        lang: "zh-CN",
        onStart: () => {
            isListening.value = true;
        },
        onResult: (text) => {
            appendSpeechText(text);
        },
        onError: (error) => {
            isListening.value = false;

            const errorCode = getSpeechErrorCode(error);
            if (shouldNotifySpeechError(errorCode)) {
                addMessage(
                    "agent",
                    "语音输入未成功，请检查麦克风权限后重试。",
                );
            }
        },
        onEnd: () => {
            isListening.value = false;
        },
    });

    isSpeechSupported.value = speechInput.isSupported;
}

function handleToggleVoiceInput() {
    if (!isSpeechSupported.value || !speechInput || loading.value) {
        return;
    }

    if (isListening.value) {
        speechInput.stop();
        return;
    }

    speechInput.start();
}

async function requestAgentChat(text) {
    await chatToAgent(text, {
        question: (intent) => {
            addMessage("agent", `执行任务（${intent}）...`, true);
        },
        answer: (finalOutput) => {
            updateLoadingMessage(finalOutput);
            loading.value = false;
            nextTick(() => {
                adjustInputHeight();
                inputInput.value?.focus();
            });
        },
        handle: (errorMsg) => {
            handleError(errorMsg);
        },
    });
}

async function handleSendMessage() {
    if (!inputText.value.trim() || loading.value) {
        return;
    }

    const text = inputText.value.trim();
    addMessage("user", text);
    inputText.value = "";
    loading.value = true;

    await requestAgentChat(text);
}

watch(inputText, (value) => {
    nextTick(() => {
        adjustInputHeight();
    });

    if (value.trim()) {
        return;
    }

    selectedTask.value = "";
    selectedType.value = "";
    selectedPropertyTags.value = [];
});

onMounted(() => {
    initSpeechRecognition();
    handleCallAgent();
    defineGisAgent(globalVar.viewer);
    nextTick(() => {
        adjustInputHeight();
    });
});

onBeforeUnmount(() => {
    if (speechInput) {
        speechInput.destroy();
        speechInput = null;
    }
});
</script>
