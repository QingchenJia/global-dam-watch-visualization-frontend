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
    loadBarrierEntity,
    loadReservoirEntity,
    entitySelectedEvent,
} from "../utils/app.js";

const emit = defineEmits(["viewer-ready"]);
const cesiumContainer = ref(null);

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

    window.loadBarrierEntity = loadBarrierEntity;
    window.loadReservoirEntity = loadReservoirEntity;
    window.showLightBarrier = showLightBarrier;
    window.showLightReservoir = showLightReservoir;

    // 加载并显示大坝和水库实体
    showLightBarrier(viewer);
    showLightReservoir(viewer);

    // 绑定详情事件
    entitySelectedEvent(viewer);

    emit("viewer-ready", viewer);
});
</script>
