<template>
    <div id="cesiumContainer" ref="cesiumContainer"></div>
</template>

<script setup>
import { onMounted, ref } from "vue";
import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
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
        timeline: false,
        infoBox: true,
        selectionIndicator: true,
        baseLayerPicker: true,
        selectedImageryProviderViewModel:
            Cesium.createDefaultImageryProviderViewModels().find(
                (viewModel) => viewModel.name === "ArcGIS World Imagery",
            ),
        navigationHelpButton: false,
        homeButton: true,
        geocoder: true,
        sceneModePicker: true,
    });

    // 隐藏开源三维地球版权信息
    viewer._cesiumWidget._creditContainer.style.display = "none";

    // 加载并显示大坝和水库实体
    showLightBarrier(viewer);
    showLightReservoir(viewer);
    // 绑定详情事件
    entitySelectedEvent(viewer);

    // 完成viewer初始化后触发事件
    emit("viewer-ready", viewer);
});
</script>
