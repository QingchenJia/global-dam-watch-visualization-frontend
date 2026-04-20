<template>
    <div id="app-container" class="dashboard-shell">
        <CesiumViewer class="dashboard-viewer" @viewer-ready="onViewerReady" />
        <div class="dashboard-noise"></div>
        <div class="dashboard-vignette"></div>

        <div v-if="viewer" class="dashboard-hud">
            <TopHeaderBar :viewer="viewer" />

            <div class="dashboard-main">
                <aside class="dashboard-rail dashboard-rail--left">
                    <div
                        class="dashboard-stack-panel dashboard-stack-panel--bookmark"
                    >
                        <BookmarkPanel :viewer="viewer" :show="true" />
                    </div>

                    <div
                        class="dashboard-stack-panel dashboard-stack-panel--filter"
                    >
                        <FilterPanel />
                    </div>

                    <div
                        class="dashboard-stack-panel dashboard-stack-panel--agent-chat"
                    >
                        <AgentChat :viewer="viewer" />
                    </div>
                </aside>

                <div class="dashboard-center"></div>

                <aside class="dashboard-rail dashboard-rail--right">
                    <div class="dashboard-right-stack">
                        <div class="dashboard-right-stack__control">
                            <ControlPanel
                                :viewer="viewer"
                                :show-timeline="showTimeline"
                                @toggle-timeline="showTimeline = !showTimeline"
                            />
                        </div>
                        <div class="dashboard-right-stack__stats">
                            <StatsPanel :show="true" />
                        </div>
                        <div class="dashboard-right-stack__location">
                            <PositionInformation :viewer="viewer" />
                        </div>
                    </div>
                </aside>
            </div>

            <div class="dashboard-bottom">
                <div class="dashboard-bottom__timeline">
                    <TimelineSlider
                        :viewer="viewer"
                        :show="showTimeline"
                        @close="showTimeline = false"
                    />
                </div>
            </div>

            <EntityDescription v-if="showEntityDescription" :viewer="viewer" />
        </div>
    </div>
</template>

<script setup>
import { onBeforeUnmount, ref } from "vue";
import CesiumViewer from "./components/CesiumViewer.vue";
import ControlPanel from "./components/ControlPanel.vue";
import AgentChat from "./components/AgentChat.vue";
import StatsPanel from "./components/StatsPanel.vue";
import TimelineSlider from "./components/TimelineSlider.vue";
import BookmarkPanel from "./components/BookmarkPanel.vue";
import EntityDescription from "./components/EntityDescription.vue";
import PositionInformation from "./components/PositionInformation.vue";
import TopHeaderBar from "./components/TopHeaderBar.vue";
import FilterPanel from "./components/FilterPanel.vue";

const viewer = ref(null);
const showTimeline = ref(false);
const showEntityDescription = ref(false);

let detachSelectionListener = null;

const onViewerReady = (value) => {
    viewer.value = value;

    if (detachSelectionListener) {
        detachSelectionListener();
        detachSelectionListener = null;
    }

    if (!viewer.value?.selectedEntityChanged) {
        return;
    }

    const handler = (entity) => {
        showEntityDescription.value = Boolean(entity);
    };

    showEntityDescription.value = Boolean(viewer.value.selectedEntity);
    viewer.value.selectedEntityChanged.addEventListener(handler);
    detachSelectionListener = () => {
        viewer.value?.selectedEntityChanged.removeEventListener(handler);
    };
};

onBeforeUnmount(() => {
    if (detachSelectionListener) {
        detachSelectionListener();
        detachSelectionListener = null;
    }
});
</script>
