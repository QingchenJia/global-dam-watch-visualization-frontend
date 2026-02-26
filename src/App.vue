<template>
    <div id="app-container">
        <CesiumViewer @viewer-ready="onViewerReady" />
        <ControlPanel v-if="viewer" :viewer="viewer" />
        <AgentChat v-if="viewer" :viewer="viewer" />
    </div>
</template>

<script setup>
import { ref } from "vue";
import CesiumViewer from "./components/CesiumViewer.vue";
import ControlPanel from "./components/ControlPanel.vue";
import AgentChat from "./components/AgentChat.vue";

const viewer = ref(null);

// 获取viewer实例作全局变量
const onViewerReady = (v) => {
    viewer.value = v;
};
</script>
