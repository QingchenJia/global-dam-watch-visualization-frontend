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
</template>

<script setup>
import * as Cesium from "cesium";
import { toRaw } from "vue";
import { showLightBarrier, showLightReservoir } from "../utils/app.js";

const globalVar = defineProps({
    viewer: {
        type: Object,
        required: true,
    },
});

let entityIndex = 0;

const reloadAll = () => {
    // 移除当前地图上的所有实体
    globalVar.viewer.entities.removeAll();
    showLightBarrier(globalVar.viewer);
    showLightReservoir(globalVar.viewer);
};

const resetView = () => {
    // 取消当前的实体选中状态
    globalVar.viewer.selectedEntity = null;

    // 调整视角至自定义初始位置
    globalVar.viewer.camera.flyTo({
        // 设置初始视角位置为中国上空
        destination: Cesium.Cartesian3.fromDegrees(105.0, 35.0, 20000000),
        duration: 1.5,
    });
};

const jumpNext = () => {
    const entities = globalVar.viewer.entities.values;
    if (entities.length === 0) {
        alert("当前地图上没有可跳转的实体");
        return;
    }

    // 循环跳转至当前实体列表中的下一个实体
    entityIndex = entityIndex % entities.length;
    globalVar.viewer.selectedEntity = entities[entityIndex++];
    globalVar.viewer.flyTo(toRaw(globalVar.viewer.selectedEntity), {
        duration: 1.5,
    });
};
</script>
