<template>
    <div id="app-container">
        <CesiumViewer @viewer-ready="onViewerReady" />
        <ControlPanel v-if="viewer" :viewer="viewer" />
        <AgentChat v-if="viewer" :viewer="viewer" />
        <StatsPanel v-if="viewer" :viewer="viewer" />
    </div>
</template>

<script setup>
import { ref } from "vue";
import CesiumViewer from "./components/CesiumViewer.vue";
import ControlPanel from "./components/ControlPanel.vue";
import AgentChat from "./components/AgentChat.vue";
import StatsPanel from "./components/StatsPanel.vue";

const viewer = ref(null);

// 监听CesiumViewer组件的ready事件并获取viewer实例作全局变量
const onViewerReady = (v) => {
    viewer.value = v;
};
</script>
