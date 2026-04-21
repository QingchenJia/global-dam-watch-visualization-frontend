<template>
    <section class="control-panel-actions hud-card">
        <div class="quick-panel__header">
            <div class="quick-panel__title">
                <span class="quick-panel__title-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                        <path
                            d="M4 7h9v2H4V7zm0 8h15v2H4v-2zm11-9h5v4h-5V6zM8 14h5v4H8v-4z"
                        />
                    </svg>
                </span>
                <div class="quick-panel__title-text">
                    <h2 class="hud-card-title">快速操作</h2>
                </div>
            </div>

            <div class="type-switch" role="tablist" aria-label="数据类型切换">
                <button
                    type="button"
                    class="type-switch__btn"
                    :class="{ active: dataType === 'barrier' }"
                    @click="setDataType('barrier')"
                >
                    大坝
                </button>
                <button
                    type="button"
                    class="type-switch__btn"
                    :class="{ active: dataType === 'reservoir' }"
                    @click="setDataType('reservoir')"
                >
                    水库
                </button>
            </div>
        </div>

        <div class="quick-panel__grid">
            <button
                type="button"
                class="quick-action"
                title="重新加载实体"
                @click="reloadAll"
            >
                <span class="quick-action__icon">
                    <svg viewBox="0 0 24 24">
                        <path
                            d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"
                        />
                    </svg>
                </span>
                <span class="quick-action__label">重载实体</span>
            </button>

            <button
                type="button"
                class="quick-action"
                title="重置视角"
                @click="resetView"
            >
                <span class="quick-action__icon">
                    <svg viewBox="0 0 24 24">
                        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
                    </svg>
                </span>
                <span class="quick-action__label">主页视角</span>
            </button>

            <div ref="baseMapControl" class="quick-action-wrap">
                <button
                    type="button"
                    class="quick-action"
                    :title="`切换底图(当前：${currentBaseMapLabel})`"
                    @click="toggleBaseMapPanel"
                >
                    <span class="quick-action__icon">
                        <svg viewBox="0 0 24 24">
                            <path
                                d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20V6.5zm2 1.34v9.32l3-1.25V6.59L5 7.84zm5-.06v9.32l4 1.67V9.45l-4-1.67zm6 1.67v9.32l3-1.25V8.2l-3 1.25z"
                            />
                        </svg>
                    </span>
                    <span class="quick-action__label">底图切换</span>
                </button>

                <div
                    v-if="baseMapBoxShow"
                    class="quick-popover quick-popover--basemap"
                >
                    <button
                        v-for="item in baseMapOptions"
                        :key="item.type"
                        type="button"
                        class="quick-popover__option"
                        :class="[
                            { active: currentBaseMapType === item.type },
                            getBaseMapOptionClass(item.type),
                        ]"
                        @click="switchBaseMap(item.type)"
                    >
                        {{ item.label }}
                    </button>
                </div>
            </div>

            <div ref="visibilityControlRef" class="quick-action-wrap">
                <button
                    type="button"
                    class="quick-action"
                    :class="{ active: visible }"
                    title="控制图层显隐"
                    @click="toggleVisibilityOptions"
                >
                    <span class="quick-action__icon">
                        <svg viewBox="0 0 24 24">
                            <path
                                d="M12 5c-5.5 0-9.5 4.8-10.5 6.1a1.4 1.4 0 0 0 0 1.8C2.5 14.2 6.5 19 12 19s9.5-4.8 10.5-6.1a1.4 1.4 0 0 0 0-1.8C21.5 9.8 17.5 5 12 5zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm0-6.2A2.2 2.2 0 1 0 12 14.2 2.2 2.2 0 0 0 12 9.8z"
                            />
                        </svg>
                    </span>
                    <span class="quick-action__label">图层显隐</span>
                </button>

                <div
                    v-if="visibilityOptionsOpen"
                    class="quick-popover quick-popover--visibility"
                >
                    <label class="quick-switch">
                        <span>大坝</span>
                        <input
                            type="checkbox"
                            :checked="barrierVisible"
                            @change="toggleBarrierVisible"
                        />
                    </label>
                    <label class="quick-switch">
                        <span>水库</span>
                        <input
                            type="checkbox"
                            :checked="reservoirVisible"
                            @change="toggleReservoirVisible"
                        />
                    </label>
                </div>
            </div>

            <button
                type="button"
                class="quick-action"
                :class="{ active: clusterEnabled }"
                title="点聚合开关"
                @click="toggleClusterEnabled"
            >
                <span class="quick-action__icon">
                    <svg viewBox="0 0 24 24">
                        <path
                            d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm-7.5 4c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5zm15 0c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5zm-7.5-6.5c-.83 0-1.5-.67-1.5-1.5S11.17 4 12 4s1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm0 15c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"
                        />
                    </svg>
                </span>
                <span class="quick-action__label">点聚合</span>
            </button>

            <button
                type="button"
                class="quick-action"
                :class="{ active: showTimeline }"
                title="显示或隐藏时间轴"
                @click="$emit('toggle-timeline')"
            >
                <span class="quick-action__icon">
                    <svg viewBox="0 0 24 24">
                        <path
                            d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm4.24 16L11 13V7h1.5v5.25l4.5 2.67-1.26 2.08z"
                        />
                    </svg>
                </span>
                <span class="quick-action__label">时间轴</span>
            </button>
        </div>
    </section>
</template>

<script setup>
import * as Cesium from "cesium";
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useDashboard } from "../hooks/dashboard.js";
import {
    clearAllEntities,
    getBarrierDataSource,
    setDataSourceVisible,
    showLightBarrier,
    showLightReservoir,
} from "../hooks/earth.js";
import { setAutoClusterEnabled } from "../utils/cluster.js";
import {
    barrierVisible,
    DEFAULT_BASE_MAP_TYPE,
    reservoirVisible,
    setupBaseMapSwitcher,
} from "../utils/layer.js";

const props = defineProps({
    viewer: {
        type: Object,
        required: true,
    },
    showTimeline: {
        type: Boolean,
        default: false,
    },
});

defineEmits(["toggle-timeline"]);

const { dataType, setDataType } = useDashboard();

const visible = ref(true);
const visibilityOptionsOpen = ref(false);
const visibilityControlRef = ref(null);
const clusterEnabled = ref(true);
const baseMapControl = ref(null);
const baseMapBoxShow = ref(false);
const baseMapOptions = ref([]);
const currentBaseMapType = ref(DEFAULT_BASE_MAP_TYPE);
const currentBaseMapLabel = computed(() => {
    const option = baseMapOptions.value.find(
        (item) => item.type === currentBaseMapType.value,
    );
    return option ? option.label : "未设置";
});

function getEntityDataType(entity) {
    if (!entity || !entity.properties || !entity.properties.dataType) {
        return "";
    }

    return entity.properties.dataType.getValue();
}

function getBaseMapOptionClass(type) {
    return `quick-popover__option--${type}`;
}

function updateGlobalVisibleState() {
    visible.value = barrierVisible.value && reservoirVisible.value;
}

function applyBarrierVisible(visibility) {
    const type = "barrier";
    setDataSourceVisible(type, visibility);

    if (
        !visibility &&
        getEntityDataType(props.viewer.selectedEntity) === type
    ) {
        props.viewer.selectedEntity = null;
    }
}

function applyReservoirVisible(visibility) {
    const type = "reservoir";
    setDataSourceVisible(type, visibility);

    if (
        !visibility &&
        getEntityDataType(props.viewer.selectedEntity) === type
    ) {
        props.viewer.selectedEntity = null;
    }
}

function reloadAll() {
    clearAllEntities(props.viewer);
    showLightBarrier(props.viewer);
    showLightReservoir(props.viewer);
    applyBarrierVisible(barrierVisible.value);
    applyReservoirVisible(reservoirVisible.value);
    updateGlobalVisibleState();
}

function resetView() {
    props.viewer.selectedEntity = null;

    props.viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(105, 35, 23750000),
        duration: 1.5,
    });
}

function toggleVisibilityOptions() {
    visibilityOptionsOpen.value = !visibilityOptionsOpen.value;
}

function toggleBarrierVisible() {
    barrierVisible.value = !barrierVisible.value;
    applyBarrierVisible(barrierVisible.value);
    updateGlobalVisibleState();
}

function toggleReservoirVisible() {
    reservoirVisible.value = !reservoirVisible.value;
    applyReservoirVisible(reservoirVisible.value);
    updateGlobalVisibleState();
}

function toggleBaseMapPanel() {
    baseMapBoxShow.value = !baseMapBoxShow.value;
}

async function switchBaseMap(type) {
    const setter = props.viewer.__setBaseMapType;
    if (typeof setter !== "function") {
        return;
    }

    const switched = await setter(type);
    if (switched) {
        currentBaseMapType.value = type;
        baseMapBoxShow.value = false;
    }
}

async function initBaseMapState() {
    if (typeof props.viewer.__setBaseMapType !== "function") {
        await setupBaseMapSwitcher(props.viewer);
    }

    const optionsGetter = props.viewer.__getBaseMapOptions;
    const typeGetter = props.viewer.__getBaseMapType;

    if (typeof optionsGetter === "function") {
        baseMapOptions.value = optionsGetter();
    }

    if (typeof typeGetter === "function") {
        currentBaseMapType.value = typeGetter();
    }
}

function handleOutsideClick(event) {
    if (
        visibilityOptionsOpen.value &&
        visibilityControlRef.value &&
        !visibilityControlRef.value.contains(event.target)
    ) {
        visibilityOptionsOpen.value = false;
    }

    if (
        baseMapBoxShow.value &&
        baseMapControl.value &&
        !baseMapControl.value.contains(event.target)
    ) {
        baseMapBoxShow.value = false;
    }
}

function toggleClusterEnabled() {
    clusterEnabled.value = !clusterEnabled.value;
    setAutoClusterEnabled(clusterEnabled.value);

    const barrierDataSource = getBarrierDataSource(props.viewer);
    if (barrierDataSource) {
        barrierDataSource.clustering.enabled = clusterEnabled.value;
        const previousRange = barrierDataSource.clustering.pixelRange;
        barrierDataSource.clustering.pixelRange = previousRange + 0.1;
        setTimeout(() => {
            barrierDataSource.clustering.pixelRange = previousRange;
            props.viewer.scene?.requestRender?.();
        }, 0);
    }
}

function handleSyncCompleted() {
    barrierVisible.value = true;
    reservoirVisible.value = true;
    applyBarrierVisible(true);
    applyReservoirVisible(true);
    updateGlobalVisibleState();
}

onMounted(() => {
    initBaseMapState();
    updateGlobalVisibleState();
    window.addEventListener("map-sync-completed", handleSyncCompleted);
    window.addEventListener("click", handleOutsideClick);
});

onUnmounted(() => {
    window.removeEventListener("map-sync-completed", handleSyncCompleted);
    window.removeEventListener("click", handleOutsideClick);
});
</script>
