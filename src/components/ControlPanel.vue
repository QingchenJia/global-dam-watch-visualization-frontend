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
    <div
        class="custom-visibility-button"
        :class="{ 'is-hidden': !visible }"
        :title="visible ? '隐藏所有实体' : '显示所有实体'"
        @click="toggleEntitiesVisible"
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
</template>

<script setup>
import * as Cesium from "cesium";
import { ref, toRaw, onMounted, onUnmounted } from "vue";
import { showLightBarrier, showLightReservoir } from "../utils/earth.js";

const globalVar = defineProps({
    viewer: {
        type: Object,
        required: true,
    },
});

let entityIndex = 0;
const visible = ref(true);

// 切换所有实体的可见性
const switchVisbility = (visible) => {
    const entities = globalVar.viewer.entities.values;
    entities.forEach((entity) => {
        entity.show = visible;
    });

    // 如果实体被隐藏则取消当前的实体选中状态
    if (!visible) {
        globalVar.viewer.selectedEntity = null;
    }
};

const reloadAll = () => {
    // 移除当前地图上的所有实体
    globalVar.viewer.entities.removeAll();
    showLightBarrier(globalVar.viewer);
    showLightReservoir(globalVar.viewer);

    // 重新加载后保持当前的可见性状态
    switchVisbility(visible.value);
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

const toggleEntitiesVisible = () => {
    visible.value = !visible.value;
    switchVisbility(visible.value);
};

const handleSyncCompleted = () => {
    // 地图同步后重置可见性为显示
    visible.value = true;
    switchVisbility(true);
};

onMounted(() => {
    window.addEventListener("map-sync-completed", handleSyncCompleted);
});

onUnmounted(() => {
    window.removeEventListener("map-sync-completed", handleSyncCompleted);
});
</script>
