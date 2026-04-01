<template>
    <div id="app-container">
        <!-- 三维地球 -->
        <CesiumViewer @viewer-ready="onViewerReady" />

        <!-- 控制面板 -->
        <ControlPanel
            v-if="viewer"
            :viewer="viewer"
            :show-stats="showStats"
            :show-timeline="showTimeline"
            :show-bookmark="showBookmark"
            @toggle-stats="showStats = !showStats"
            @toggle-timeline="showTimeline = !showTimeline"
            @open-bookmark="showBookmark = !showBookmark"
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

        <!-- 书签面板 -->
        <BookmarkPanel
            v-if="viewer"
            :viewer="viewer"
            :show="showBookmark"
            @close="showBookmark = false"
        />

        <!-- 时间轴面板 -->
        <TimelineSlider
            v-if="viewer"
            :viewer="viewer"
            :show="showTimeline"
            @close="showTimeline = false"
        />

        <!-- 实体描述和对比信息面板 -->
        <EntityDescription v-if="viewer" :viewer="viewer" />

        <!-- 鼠标焦点位置信息 -->
        <PositionInformation v-if="viewer" :viewer="viewer" />
    </div>
</template>

<script setup>
import { ref } from "vue";
import CesiumViewer from "./components/CesiumViewer.vue";
import ControlPanel from "./components/ControlPanel.vue";
import AgentChat from "./components/AgentChat.vue";
import StatsPanel from "./components/StatsPanel.vue";
import TimelineSlider from "./components/TimelineSlider.vue";
import BookmarkPanel from "./components/BookmarkPanel.vue";
import EntityDescription from "./components/EntityDescription.vue";
import PositionInformation from "./components/PositionInformation.vue";

const viewer = ref(null);
const showStats = ref(false);
const showTimeline = ref(false);
const showBookmark = ref(false);

// 监听viewer实例初始化就绪事件
// 触发后获取viewer实例作为全局变量
const onViewerReady = (v) => {
    viewer.value = v;
};
</script>
