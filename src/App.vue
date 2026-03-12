<template>
    <div id="app-container">
        <CesiumViewer @viewer-ready="onViewerReady" />
        <ControlPanel
            v-if="viewer"
            :viewer="viewer"
            :show-stats="showStats"
            :show-timeline="showTimeline"
            @toggle-stats="showStats = !showStats"
            @toggle-timeline="showTimeline = !showTimeline"
        />
        <AgentChat v-if="viewer" :viewer="viewer" />

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
