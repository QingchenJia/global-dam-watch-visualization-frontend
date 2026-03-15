<template>
    <!-- 重新加载实体按钮 -->
    <div
        class="custom-reload-button"
        title="重新加载所有实体"
        @click="reloadAll"
    >
        <svg viewBox="0 0 24 24">
            <path
                d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"
            />
        </svg>
    </div>

    <!-- 重置视角按钮 -->
    <div class="custom-reset-button" title="重置视角到中国" @click="resetView">
        <svg viewBox="0 0 24 24">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
        </svg>
    </div>

    <!-- 实体跳转按钮 -->
    <div
        id="jump-button"
        class="custom-jump-button"
        title="跳转到下一个实体"
        @click="jumpNext"
    >
        <svg viewBox="0 0 24 24">
            <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
        </svg>
    </div>

    <!-- 实体显示或隐藏按钮 -->
    <div ref="visibilityControlRef" class="custom-visibility-controls">
        <div
            class="custom-visibility-button"
            :class="{ 'is-hidden': !visible }"
            :title="visible ? '隐藏所有实体' : '显示所有实体'"
            @click="toggleVisibilityOptions"
        >
            <svg viewBox="0 0 24 24">
                <path
                    v-if="visible"
                    d="M12 6c-4.8 0-8.87 2.98-10.52 7.2a.8.8 0 0 0 0 .6C3.13 18.02 7.2 21 12 21s8.87-2.98 10.52-7.2a.8.8 0 0 0 0-.6C20.87 8.98 16.8 6 12 6zm0 12c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"
                />
                <path
                    v-else
                    d="M3.27 2 2 3.27l2.45 2.45C3.13 6.92 2.09 8.42 1.48 10a.8.8 0 0 0 0 .6C3.13 14.82 7.2 17.8 12 17.8c1.92 0 3.7-.47 5.24-1.29L20.73 20 22 18.73 3.27 2zM12 15.8c-2.76 0-5-2.24-5-5 0-.84.21-1.63.57-2.33l1.56 1.56a3 3 0 0 0 3.2 3.2l1.56 1.56c-.7.36-1.49.57-2.33.57zm0-10.8c4.8 0 8.87 2.98 10.52 7.2a.8.8 0 0 1 0 .6c-.38.96-.9 1.86-1.55 2.66l-1.43-1.43c.31-.43.58-.9.78-1.4C18.97 9.58 15.68 7 12 7c-1.25 0-2.45.3-3.51.83L6.94 6.28A11.2 11.2 0 0 1 12 5z"
                />
            </svg>
        </div>

        <div v-if="visibilityOptionsOpen" class="visibility-options-panel">
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

    <!-- 统计面板触发按钮 -->
    <div
        class="stats-toggle-btn"
        :class="{ active: showStats }"
        @click="$emit('toggle-stats')"
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

    <!-- 时间轴触发按钮 -->
    <div
        class="timeline-toggle-btn"
        :class="{ active: showTimeline }"
        @click="$emit('toggle-timeline')"
        title="建设历程时间轴"
    >
        <svg viewBox="0 0 24 24" class="timeline-toggle-icon">
            <path
                d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm4.24 16L11 13V7h1.5v5.25l4.5 2.67-1.26 2.08z"
            />
        </svg>
        <span class="timeline-toggle-text">历程</span>
    </div>

    <!-- 数量聚合开关按钮 -->
    <div
        class="custom-cluster-button"
        :class="{ 'is-disabled': !clusterEnabled }"
        :title="clusterEnabled ? '关闭数量聚合' : '开启数量聚合'"
        @click="toggleClusterEnabled"
    >
        <svg viewBox="0 0 24 24">
            <!-- 当开启聚合时显示表示聚合的图标 -->
            <path
                v-if="clusterEnabled"
                d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm-7.5 4c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5zm15 0c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5zm-7.5-6.5c-.83 0-1.5-.67-1.5-1.5S11.17 4 12 4s1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm0 15c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"
            />
            <!-- 当关闭聚合时显示散落的点图标 -->
            <path
                v-else
                d="M8 8c-.83 0-1.5-.67-1.5-1.5S7.17 5 8 5s1.5.67 1.5 1.5S8.83 8 8 8zm8 0c-.83 0-1.5-.67-1.5-1.5S15.17 5 16 5s1.5.67 1.5 1.5S16.83 8 16 8zm-4 8c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm-4 3c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm8 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"
            />
        </svg>
    </div>

    <!-- 收藏视角与筛选按钮 -->
    <div
        class="bookmark-button"
        title="收藏当前视角与筛选"
        @click="$emit('open-bookmark')"
    >
        <svg viewBox="0 0 24 24">
            <path
                d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.62L12 2 9.19 8.62 2 9.24l5.46 4.73L5.82 21z"
            />
        </svg>
    </div>
</template>

<script setup>
import * as Cesium from "cesium";
import { ref, toRaw, onMounted, onUnmounted } from "vue";
import {
    showLightBarrier,
    showLightReservoir,
    clearAllEntities,
    setBarrierDataSourceVisible,
    getBarrierDataSource,
} from "../hooks/earth.js";
import { setAutoClusterEnabled } from "../utils/cluster.js";

const globalVar = defineProps({
    viewer: {
        type: Object,
        required: true,
    },
    showStats: {
        type: Boolean,
        default: false,
    },
    showTimeline: {
        type: Boolean,
        default: false,
    },
});

defineEmits(["toggle-stats", "toggle-timeline", "open-bookmark"]);

let entityIndex = 0;
const visible = ref(true);
const barrierVisible = ref(true);
const reservoirVisible = ref(true);
const visibilityOptionsOpen = ref(false);
const visibilityControlRef = ref(null);
const clusterEnabled = ref(true);

const getEntityDataType = (entity) => {
    if (!entity || !entity.properties || !entity.properties.dataType) {
        return "";
    }

    const dataType = entity.properties.dataType;
    if (typeof dataType.getValue === "function") {
        return dataType.getValue();
    }
    return dataType;
};

const updateGlobalVisibleState = () => {
    visible.value = barrierVisible.value && reservoirVisible.value;
};

const applyBarrierVisible = (nextVisible) => {
    setBarrierDataSourceVisible(nextVisible);

    if (!nextVisible) {
        const selectedEntity = globalVar.viewer.selectedEntity;
        if (getEntityDataType(selectedEntity) === "barrier") {
            globalVar.viewer.selectedEntity = null;
        }
    }
};

const applyReservoirVisible = (nextVisible) => {
    const entities = globalVar.viewer.entities.values;
    entities.forEach((entity) => {
        if (getEntityDataType(entity) === "reservoir") {
            entity.show = nextVisible;
        }
    });

    if (!nextVisible) {
        const selectedEntity = globalVar.viewer.selectedEntity;
        if (getEntityDataType(selectedEntity) === "reservoir") {
            globalVar.viewer.selectedEntity = null;
        }
    }
};

const reloadAll = () => {
    // 移除当前地图上的所有实体
    clearAllEntities(globalVar.viewer);
    showLightBarrier(globalVar.viewer);
    showLightReservoir(globalVar.viewer);
    // 重新应用当前的可见性设置
    applyBarrierVisible(barrierVisible.value);
    applyReservoirVisible(reservoirVisible.value);
    // 更新全局可见性状态
    updateGlobalVisibleState();
};

const resetView = () => {
    // 取消当前的实体选中状态
    globalVar.viewer.selectedEntity = null;

    // 调整视角至自定义初始位置
    globalVar.viewer.camera.flyTo({
        // 设置初始视角位置为中国上空
        destination: Cesium.Cartesian3.fromDegrees(105.0, 35.0, 23750000),
        duration: 1.5,
    });
};

const jumpNext = () => {
    const entities = globalVar.viewer.entities.values;
    const visibleEntities = entities.filter((entity) => entity.show !== false);

    if (visibleEntities.length === 0) {
        alert("当前地图上没有可跳转的实体");
        return;
    }

    // 循环跳转至当前实体列表中的下一个实体
    entityIndex = entityIndex % visibleEntities.length;
    globalVar.viewer.selectedEntity = visibleEntities[entityIndex++];
    globalVar.viewer.flyTo(toRaw(globalVar.viewer.selectedEntity), {
        duration: 1.5,
    });
};

const toggleVisibilityOptions = () => {
    visibilityOptionsOpen.value = !visibilityOptionsOpen.value;
};

const toggleBarrierVisible = () => {
    barrierVisible.value = !barrierVisible.value;
    applyBarrierVisible(barrierVisible.value);
    updateGlobalVisibleState();
};

const toggleReservoirVisible = () => {
    reservoirVisible.value = !reservoirVisible.value;
    applyReservoirVisible(reservoirVisible.value);
    updateGlobalVisibleState();
};

const handleOutsideClick = (event) => {
    if (
        visibilityOptionsOpen.value &&
        visibilityControlRef.value &&
        !visibilityControlRef.value.contains(event.target)
    ) {
        visibilityOptionsOpen.value = false;
    }
};

const toggleClusterEnabled = () => {
    clusterEnabled.value = !clusterEnabled.value;
    setAutoClusterEnabled(clusterEnabled.value);
    const bds = getBarrierDataSource(globalVar.viewer);
    if (bds) {
        bds.clustering.enabled = clusterEnabled.value;
        // Cesium重绘hack
        const prevRange = bds.clustering.pixelRange;
        bds.clustering.pixelRange = prevRange + 0.1;
        setTimeout(() => {
            bds.clustering.pixelRange = prevRange;
            if (globalVar.viewer.scene) {
                globalVar.viewer.scene.requestRender();
            }
        }, 0);
    }
};

const handleSyncCompleted = () => {
    // 地图同步后重置可见性为显示
    barrierVisible.value = true;
    reservoirVisible.value = true;
    applyBarrierVisible(true);
    applyReservoirVisible(true);
    updateGlobalVisibleState();
};

onMounted(() => {
    window.addEventListener("map-sync-completed", handleSyncCompleted);
    window.addEventListener("click", handleOutsideClick);
});

onUnmounted(() => {
    window.removeEventListener("map-sync-completed", handleSyncCompleted);
    window.removeEventListener("click", handleOutsideClick);
});
</script>
