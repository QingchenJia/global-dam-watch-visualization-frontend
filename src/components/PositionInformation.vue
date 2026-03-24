<template>
    <div class="position-information">
        <div class="position-information-row">
            <span class="position-information-label">经度</span>
            <span class="position-information-value">{{
                longitudeDisplay
            }}</span>
        </div>
        <div class="position-information-row">
            <span class="position-information-label">纬度</span>
            <span class="position-information-value">{{
                latitudeDisplay
            }}</span>
        </div>
        <div class="position-information-row">
            <span class="position-information-label">高度</span>
            <span class="position-information-value">{{ heightDisplay }}</span>
        </div>
    </div>
</template>

<script setup>
import { onBeforeUnmount, ref, watch } from "vue";
import * as Cesium from "cesium";

const globalVar = defineProps({
    viewer: {
        type: Object,
        required: true,
    },
});

const EMPTY_DISPLAY = "--";
const COORDINATE_DECIMALS = 6;
const HEIGHT_DECIMALS = 2;

const longitudeDisplay = ref(EMPTY_DISPLAY);
const latitudeDisplay = ref(EMPTY_DISPLAY);
const heightDisplay = ref(EMPTY_DISPLAY);

let mouseMoveHandler = null;

function setPositionDisplay({
    longitude = EMPTY_DISPLAY,
    latitude = EMPTY_DISPLAY,
    height = EMPTY_DISPLAY,
} = {}) {
    longitudeDisplay.value = longitude;
    latitudeDisplay.value = latitude;
    heightDisplay.value = height;
}

function resetPositionDisplay() {
    setPositionDisplay();
}

function formatLongitude(longitude) {
    return `${longitude.toFixed(COORDINATE_DECIMALS)} °`;
}

function formatLatitude(latitude) {
    return `${latitude.toFixed(COORDINATE_DECIMALS)} °`;
}

function formatHeight(height) {
    return `${height.toFixed(HEIGHT_DECIMALS)} m`;
}

function resolveCartographicFromScreen(viewer, screenPosition) {
    const scene = viewer.scene;

    if (scene.pickPositionSupported) {
        const pickedCartesian = scene.pickPosition(screenPosition);
        if (Cesium.defined(pickedCartesian)) {
            return Cesium.Cartographic.fromCartesian(pickedCartesian);
        }
    }

    const pickRay = viewer.camera.getPickRay(screenPosition);
    if (Cesium.defined(pickRay)) {
        const globeCartesian = scene.globe.pick(pickRay, scene);
        if (Cesium.defined(globeCartesian)) {
            const cartographic =
                Cesium.Cartographic.fromCartesian(globeCartesian);
            const sampledHeight = scene.globe.getHeight(cartographic);
            if (Cesium.defined(sampledHeight)) {
                cartographic.height = sampledHeight;
            }
            return cartographic;
        }
    }

    const ellipsoidCartesian = viewer.camera.pickEllipsoid(
        screenPosition,
        scene.globe.ellipsoid,
    );

    if (Cesium.defined(ellipsoidCartesian)) {
        return Cesium.Cartographic.fromCartesian(ellipsoidCartesian);
    }

    return null;
}

function updatePositionDisplay(screenPosition) {
    const viewer = globalVar.viewer;
    if (!viewer || !screenPosition) {
        resetPositionDisplay();
        return;
    }

    const cartographic = resolveCartographicFromScreen(viewer, screenPosition);
    if (!cartographic) {
        resetPositionDisplay();
        return;
    }

    const longitude = Cesium.Math.toDegrees(cartographic.longitude);
    const latitude = Cesium.Math.toDegrees(cartographic.latitude);
    // 获取相机高度而不是地形高度
    // 以避免地形起伏导致的高度显示不稳定
    const cameraHeight = viewer.camera?.positionCartographic?.height;
    const height = Number.isFinite(cameraHeight) ? cameraHeight : 0;

    setPositionDisplay({
        longitude: formatLongitude(longitude),
        latitude: formatLatitude(latitude),
        height: formatHeight(height),
    });
}

function handleMouseMove(movement) {
    updatePositionDisplay(movement?.endPosition);
}

function detachMouseMoveHandler() {
    if (mouseMoveHandler) {
        mouseMoveHandler.destroy();
        mouseMoveHandler = null;
    }
}

function attachMouseMoveHandler(viewer) {
    detachMouseMoveHandler();

    if (!viewer?.scene?.canvas) return;

    mouseMoveHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    mouseMoveHandler.setInputAction(
        handleMouseMove,
        Cesium.ScreenSpaceEventType.MOUSE_MOVE,
    );
}

watch(
    () => globalVar.viewer,
    (currentViewer) => {
        if (currentViewer) {
            attachMouseMoveHandler(currentViewer);
        } else {
            detachMouseMoveHandler();
            resetPositionDisplay();
        }
    },
    { immediate: true },
);

onBeforeUnmount(() => {
    detachMouseMoveHandler();
});
</script>
