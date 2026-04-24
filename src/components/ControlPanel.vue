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

        <div class="quick-panel__grid">
            <el-button
                type="button"
                class="quick-action"
                text
                title="重新加载实体"
                @click="reloadAll"
            >
                <span class="quick-action__icon">
                    <el-icon><Refresh /></el-icon>
                </span>
                <span class="quick-action__label">重载实体</span>
            </el-button>

            <el-button
                type="button"
                class="quick-action"
                text
                title="重置视角"
                @click="resetView"
            >
                <span class="quick-action__icon">
                    <el-icon><House /></el-icon>
                </span>
                <span class="quick-action__label">主页视角</span>
            </el-button>

            <div ref="baseMapControl" class="quick-action-wrap">
                <el-popover
                    v-model:visible="baseMapBoxShow"
                    popper-class="quick-popover quick-popover--basemap"
                    placement="bottom"
                    trigger="click"
                    :width="152"
                >
                    <template #reference>
                        <el-button
                            type="button"
                            class="quick-action"
                            text
                            :title="`切换底图（当前：${currentBaseMapLabel}）`"
                        >
                            <span class="quick-action__icon">
                                <el-icon><MapLocation /></el-icon>
                            </span>
                            <span class="quick-action__label">底图切换</span>
                        </el-button>
                    </template>
                    <el-button
                        v-for="item in baseMapOptions"
                        :key="item.type"
                        class="quick-popover__option"
                        :class="[
                            { active: currentBaseMapType === item.type },
                            getBaseMapOptionClass(item.type),
                        ]"
                        text
                        @click="switchBaseMap(item.type)"
                    >
                        {{ item.label }}
                    </el-button>
                </el-popover>
            </div>

            <div ref="visibilityControlRef" class="quick-action-wrap">
                <el-popover
                    v-model:visible="visibilityOptionsOpen"
                    popper-class="quick-popover quick-popover--visibility"
                    placement="bottom"
                    trigger="click"
                    :width="132"
                >
                    <template #reference>
                        <el-button
                            type="button"
                            class="quick-action"
                            :class="{ active: visible }"
                            text
                            title="控制图层显隐"
                        >
                            <span class="quick-action__icon">
                                <el-icon><View /></el-icon>
                            </span>
                            <span class="quick-action__label">图层显隐</span>
                        </el-button>
                    </template>
                    <div class="quick-switch">
                        <span>大坝</span>
                        <el-switch
                            :model-value="barrierVisible"
                            size="small"
                            @change="toggleBarrierVisible"
                        />
                    </div>
                    <div class="quick-switch">
                        <span>水库</span>
                        <el-switch
                            :model-value="reservoirVisible"
                            size="small"
                            @change="toggleReservoirVisible"
                        />
                    </div>
                </el-popover>
            </div>

            <el-button
                type="button"
                class="quick-action"
                :class="{ active: clusterEnabled }"
                text
                title="点聚合开关"
                @click="toggleClusterEnabled"
            >
                <span class="quick-action__icon">
                    <el-icon><Grid /></el-icon>
                </span>
                <span class="quick-action__label">点聚合</span>
            </el-button>

            <el-button
                type="button"
                class="quick-action"
                :class="{ active: showTimeline }"
                text
                title="显示或隐藏时间轴"
                @click="$emit('toggle-timeline')"
            >
                <span class="quick-action__icon">
                    <el-icon><Clock /></el-icon>
                </span>
                <span class="quick-action__label">时间轴</span>
            </el-button>
        </div>
    </section>
</template>

<script setup>
import * as Cesium from "cesium";
import { computed, onMounted, onUnmounted, ref } from "vue";
import {
    Clock,
    Grid,
    House,
    MapLocation,
    Operation,
    Refresh,
    View,
} from "@element-plus/icons-vue";
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
