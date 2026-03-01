<template>
    <div id="app-container">
        <CesiumViewer @viewer-ready="onViewerReady" />
        <ControlPanel v-if="viewer" :viewer="viewer" />
        <AgentChat v-if="viewer" :viewer="viewer" />

        <!-- 顶部下拉按钮 -->
        <div
            class="stats-toggle-btn"
            :class="{ active: showStats }"
            @click="showStats = !showStats"
            title="统计面板"
        >
            <svg viewBox="0 0 24 24" class="stats-toggle-icon">
                <path
                    d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"
                />
            </svg>
            <span class="stats-toggle-text">统计</span>
            <svg viewBox="0 0 24 24" class="stats-toggle-arrow">
                <path d="M7 10l5 5 5-5z" />
            </svg>
        </div>

        <!-- 统计面板 -->
        <transition name="stats-slide">
            <StatsPanel v-show="showStats" :show="showStats" />
        </transition>
    </div>
</template>

<script setup>
import { ref } from "vue";
import CesiumViewer from "./components/CesiumViewer.vue";
import ControlPanel from "./components/ControlPanel.vue";
import AgentChat from "./components/AgentChat.vue";
import StatsPanel from "./components/StatsPanel.vue";

const viewer = ref(null);
const showStats = ref(false);

/*
 * 监听viewer实例初始化就绪事件
 * 触发后获取viewer实例作为全局变量
 * */
const onViewerReady = (v) => {
    viewer.value = v;
};
</script>
