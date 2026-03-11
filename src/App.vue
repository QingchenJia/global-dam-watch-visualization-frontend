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
            <StatsPanel
                v-if="viewer"
                :viewer="viewer"
                v-show="showStats"
                :show="showStats"
                @request-close="showStats = false"
            />
        </transition>

        <!-- 时间轴触发按钮 -->
        <div
            v-if="viewer"
            class="timeline-toggle-btn"
            :class="{ active: showTimeline }"
            @click="showTimeline = !showTimeline"
            title="建设历程时间轴"
        >
            <svg viewBox="0 0 24 24" class="timeline-toggle-icon">
                <path
                    d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm4.24 16L11 13V7h1.5v5.25l4.5 2.67-1.26 2.08z"
                />
            </svg>
            <span class="timeline-toggle-text">历程</span>
        </div>

        <!-- 时间轴面板 -->
        <TimelineSlider
            v-if="viewer"
            :show="showTimeline"
            :viewer="viewer"
            @close="showTimeline = false"
        />
    </div>
</template>

<script setup>
import { ref } from "vue";
import CesiumViewer from "./components/CesiumViewer.vue";
import ControlPanel from "./components/ControlPanel.vue";
import AgentChat from "./components/AgentChat.vue";
import StatsPanel from "./components/StatsPanel.vue";
import TimelineSlider from "./components/TimelineSlider.vue";

const viewer = ref(null);
const showStats = ref(false);
const showTimeline = ref(false);

/*
 * 监听viewer实例初始化就绪事件
 * 触发后获取viewer实例作为全局变量
 * */
const onViewerReady = (v) => {
    viewer.value = v;
};
</script>
