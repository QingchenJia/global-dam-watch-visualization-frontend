<template>
    <div id="cesiumContainer" ref="cesiumContainer"></div>
</template>

<script setup>
import { onMounted, ref } from "vue";
import * as Cesium from "cesium";
import {
    showLightBarrier,
    showLightReservoir,
    entitySelectedEvent,
} from "../hooks/earth.js";

const cesiumContainer = ref(null);
const emit = defineEmits(["viewer-ready"]);

onMounted(() => {
    const viewer = new Cesium.Viewer(cesiumContainer.value, {
        animation: false,
        selectedImageryProviderViewModel:
            Cesium.createDefaultImageryProviderViewModels().find(
                (viewModel) => viewModel.name === "ArcGIS World Imagery",
            ),
        fullscreenButton: false,
        homeButton: false,
        navigationHelpButton: false,
        geocoder: false,
        timeline: false,
    });

    // 隐藏开源三维地球版权信息
    viewer._cesiumWidget._creditContainer.style.display = "none";

    // 设置初始视图位于中国大陆上空
    viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(105.0, 35.0, 23750000),
        orientation: {
            heading: Cesium.Math.toRadians(0.0),
            pitch: Cesium.Math.toRadians(-90.0),
            roll: Cesium.Math.toRadians(0.0),
        },
    });

    // 加载并显示大坝和水库实体
    showLightBarrier(viewer);
    showLightReservoir(viewer);
    // 绑定详情事件
    entitySelectedEvent(viewer);

    // 完成viewer初始化后触发事件
    emit("viewer-ready", viewer);
});
</script>
