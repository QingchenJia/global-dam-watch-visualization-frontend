<template>
    <div id="cesiumContainer" ref="cesiumContainer"></div>
</template>

<script setup>
import { onMounted, ref } from "vue";
import * as Cesium from "cesium";
import { showLightBarrier, showLightReservoir } from "../hooks/earth.js";

const cesiumContainer = ref(null);
const emit = defineEmits(["viewer-ready"]);

onMounted(() => {
    const viewer = new Cesium.Viewer(cesiumContainer.value, {
        animation: false,
        baseLayerPicker: false,
        fullscreenButton: false,
        homeButton: false,
        navigationHelpButton: false,
        geocoder: false,
        timeline: false,
        infoBox: false,
        sceneModePicker: false,
    });

    // 隐藏开源三维地球版权信息
    viewer._cesiumWidget._creditContainer.style.display = "none";

    // 添加全球影像图层WMTS服务
    viewer.imageryLayers.addImageryProvider(
        new Cesium.WebMapTileServiceImageryProvider({
            url: "https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/WMTS/tile/1.0.0/World_Imagery/{Style}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.jpg",
            layer: "World_Imagery",
            style: "default",
            tileMatrixSetID: "GoogleMapsCompatible",
            format: "image/jpeg",
            tileWidth: 256,
            tileHeight: 256,
            tilingScheme: new Cesium.WebMercatorTilingScheme(),
        }),
    );

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

    // 完成viewer初始化后触发事件
    emit("viewer-ready", viewer);
});
</script>
