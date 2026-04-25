<template>
    <section class="control-panel-actions hud-card">
        <div class="quick-panel__header">
            <div class="quick-panel__title">
                <el-icon class="quick-panel__title-icon" aria-hidden="true">
                    <Operation />
                </el-icon>
                <div class="quick-panel__title-text">
                    <h2 class="hud-card-title">快速操作</h2>
                </div>
            </div>

            <el-segmented
                class="type-switch"
                :model-value="dataType"
                :options="dataTypeOptions"
                size="small"
                aria-label="数据类型切换"
                @change="setDataType"
            />
        </div>

        <div class="quick-panel__grid quick-panel__grid--native">
            <button
                type="button"
                class="quick-panel-button custom-reload-button"
                title="重新加载实体"
                @click="reloadAll"
            >
                <span class="quick-panel-button__icon">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path
                            d="M17.65 6.35A7.95 7.95 0 0 0 12 4V1L7 6l5 5V7a5 5 0 1 1-5 5H5a7 7 0 1 0 12.65-5.65z"
                        />
                    </svg>
                </span>
                <span class="quick-panel-button__label">重载实体</span>
            </button>

            <button
                type="button"
                class="quick-panel-button custom-reset-button"
                title="重置视角"
                @click="resetView"
            >
                <span class="quick-panel-button__icon">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
                    </svg>
                </span>
                <span class="quick-panel-button__label">主页视角</span>
            </button>

            <div ref="baseMapControl" class="quick-panel-control">
                <button
                    type="button"
                    class="quick-panel-button custom-basemap-button"
                    :class="{ 'is-active': baseMapBoxShow }"
                    :title="`切换底图(当前：${currentBaseMapLabel})`"
                    @click.stop="toggleBaseMapPanel"
                >
                    <span class="quick-panel-button__icon">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path
                                d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20V6.5zm2 1.34v9.32l3-1.25V6.59L5 7.84zm5-.06v9.32l4 1.67V9.45l-4-1.67zm6 1.67v9.32l3-1.25V8.2l-3 1.25z"
                            />
                        </svg>
                    </span>
                    <span class="quick-panel-button__label">底图切换</span>
                </button>

                <div
                    v-if="baseMapBoxShow"
                    class="floating-panel basemap-options-panel"
                >
                    <button
                        v-for="item in baseMapOptions"
                        :key="item.type"
                        type="button"
                        class="floating-option basemap-option-item"
                        :class="{
                            'is-selected': currentBaseMapType === item.type,
                        }"
                        :style="getBaseMapOptionStyle(item.type)"
                        @click="switchBaseMap(item.type)"
                    >
                        {{ item.label }}
                    </button>
                </div>
            </div>

            <div ref="visibilityControlRef" class="quick-panel-control">
                <button
                    type="button"
                    class="quick-panel-button custom-visibility-button"
                    :class="{
                        'is-active': visibilityOptionsOpen,
                        'is-hidden': !visible,
                    }"
                    :title="visible ? '图层显隐' : '当前存在隐藏图层'"
                    @click.stop="toggleVisibilityPanel"
                >
                    <span class="quick-panel-button__icon">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path
                                v-if="visible"
                                d="M12 6c-4.8 0-8.87 2.98-10.52 7.2a.8.8 0 0 0 0 .6C3.13 18.02 7.2 21 12 21s8.87-2.98 10.52-7.2a.8.8 0 0 0 0-.6C20.87 8.98 16.8 6 12 6zm0 12c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"
                            />
                            <path
                                v-else
                                d="M3.27 2 2 3.27l2.45 2.45C3.13 6.92 2.09 8.42 1.48 10a.8.8 0 0 0 0 .6C3.13 14.82 7.2 17.8 12 17.8c1.92 0 3.7-.47 5.24-1.29L20.73 20 22 18.73 3.27 2zM12 15.8c-2.76 0-5-2.24-5-5 0-.84.21-1.63.57-2.33l1.56 1.56a3 3 0 0 0 3.2 3.2l1.56 1.56c-.7.36-1.49.57-2.33.57zm0-10.8c4.8 0 8.87 2.98 10.52 7.2a.8.8 0 0 1 0 .6c-.38.96-.9 1.86-1.55 2.66l-1.43-1.43c.31-.43.58-.9.78-1.4C18.97 9.58 15.68 7 12 7c-1.25 0-2.45.3-3.51.83L6.94 6.28A11.2 11.2 0 0 1 12 5z"
                            />
                        </svg>
                    </span>
                    <span class="quick-panel-button__label">图层显隐</span>
                </button>

                <div
                    v-if="visibilityOptionsOpen"
                    class="floating-panel visibility-options-panel"
                >
                    <div class="visibility-option-item">
                        <span>大坝</span>
                        <label class="switch">
                            <input
                                type="checkbox"
                                :checked="barrierVisible"
                                @change="toggleBarrierVisible"
                            />
                            <span class="slider round"></span>
                        </label>
                    </div>
                    <div class="visibility-option-item">
                        <span>水库</span>
                        <label class="switch">
                            <input
                                type="checkbox"
                                :checked="reservoirVisible"
                                @change="toggleReservoirVisible"
                            />
                            <span class="slider round"></span>
                        </label>
                    </div>
                </div>
            </div>

            <button
                type="button"
                class="quick-panel-button custom-cluster-button"
                :class="{ 'is-active': clusterEnabled }"
                title="点聚合开关"
                @click="toggleClusterEnabled"
            >
                <span class="quick-panel-button__icon">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path
                            d="M7 4a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm10 0a3 3 0 1 1 0 6 3 3 0 0 1 0-6zM7 14a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm10 1a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM9.5 7h5M7 10.5v3M14.5 17H10"
                        />
                    </svg>
                </span>
                <span class="quick-panel-button__label">点聚合</span>
            </button>

            <button
                type="button"
                class="quick-panel-button custom-timeline-button"
                :class="{ 'is-active': showTimeline }"
                title="显示或隐藏时间轴"
                @click="emit('toggle-timeline')"
            >
                <span class="quick-panel-button__icon">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path
                            d="M7 2h2v2h6V2h2v2h3v17H4V4h3V2zm11 8H6v9h12v-9zm-1-4H7v2h10V6zm-5 5h2v4h-2v-4zm-3 0h2v6H9v-6z"
                        />
                    </svg>
                </span>
                <span class="quick-panel-button__label">时间轴</span>
            </button>
        </div>
    </section>
</template>

<script setup>
import * as Cesium from "cesium";
import { computed, onMounted, onUnmounted, ref } from "vue";
import { Operation } from "@element-plus/icons-vue";
import arcgisImage from "../assets/images/arcgis.jpg";
import sentinelImage from "../assets/images/sentinel.jpg";
import usgsImage from "../assets/images/usgs.jpg";
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

const emit = defineEmits(["toggle-timeline"]);

const { dataType, setDataType } = useDashboard();

const dataTypeOptions = [
    { label: "大坝", value: "barrier" },
    { label: "水库", value: "reservoir" },
];

const visible = ref(true);
const visibilityOptionsOpen = ref(false);
const visibilityControlRef = ref(null);
const clusterEnabled = ref(true);
const baseMapControl = ref(null);
const baseMapBoxShow = ref(false);
const baseMapOptions = ref([]);
const currentBaseMapType = ref(DEFAULT_BASE_MAP_TYPE);
const BASE_MAP_BG_BY_TYPE = {
    "arcgis-world-imagery": arcgisImage,
    "usgs-imagery-only": usgsImage,
    "sentinel-2-cloudless": sentinelImage,
};

const currentBaseMapLabel = computed(() => {
    const option = baseMapOptions.value.find(
        (item) => item.type === currentBaseMapType.value,
    );
    return option ? option.label : "未设置";
});

function getBaseMapOptionStyle(type) {
    const image = BASE_MAP_BG_BY_TYPE[type];
    if (!image) {
        return null;
    }

    return {
        backgroundImage: `linear-gradient(90deg, rgba(8, 16, 30, 0.86), rgba(8, 16, 30, 0.58)), url(${image})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
    };
}

function getEntityDataType(entity) {
    if (!entity || !entity.properties || !entity.properties.dataType) {
        return "";
    }

    return entity.properties.dataType.getValue();
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

function toggleBaseMapPanel() {
    baseMapBoxShow.value = !baseMapBoxShow.value;
    if (baseMapBoxShow.value) {
        visibilityOptionsOpen.value = false;
    }
}

function toggleVisibilityPanel() {
    visibilityOptionsOpen.value = !visibilityOptionsOpen.value;
    if (visibilityOptionsOpen.value) {
        baseMapBoxShow.value = false;
    }
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
