<template>
    <section class="position-information hud-card">
        <div class="position-information__header">
            <div class="quick-panel__title">
                <span class="quick-panel__title-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                        <path
                            d="M4 12.5 12 4l8 8.5-8 7.5-8-7.5zm5.2 0L12 15.1l2.8-2.6L12 9.4z"
                        />
                    </svg>
                </span>
                <div class="quick-panel__title-text">
                    <h2 class="hud-card-title">当前位置</h2>
                </div>
            </div>
        </div>

        <div class="position-information__content">
            <div class="position-information__rows">
                <div class="position-information-row">
                    <span class="position-information-label">经度</span>
                    <div class="position-information-value">
                        <strong>{{ longitudeParts.value }}</strong>
                        <em>{{ longitudeParts.unit }}</em>
                    </div>
                </div>
                <div class="position-information-row">
                    <span class="position-information-label">纬度</span>
                    <div class="position-information-value">
                        <strong>{{ latitudeParts.value }}</strong>
                        <em>{{ latitudeParts.unit }}</em>
                    </div>
                </div>
                <div class="position-information-row">
                    <span class="position-information-label">高度</span>
                    <div class="position-information-value">
                        <strong>{{ heightParts.value }}</strong>
                        <em>{{ heightParts.unit }}</em>
                    </div>
                </div>
            </div>

            <div class="position-information__radar" aria-hidden="true">
                <div class="radar-ring radar-ring--outer"></div>
                <div class="radar-ring radar-ring--middle"></div>
                <div class="radar-ring radar-ring--inner"></div>
                <div class="radar-grid"></div>
                <div class="radar-scan"></div>
                <div class="radar-peak"></div>
            </div>
        </div>
    </section>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from "vue";
import * as Cesium from "cesium";

const props = defineProps({
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

const longitudeParts = computed(() => parseDisplay(longitudeDisplay.value));
const latitudeParts = computed(() => parseDisplay(latitudeDisplay.value));
const heightParts = computed(() => parseDisplay(heightDisplay.value));

function parseDisplay(text) {
    if (!text || text === EMPTY_DISPLAY) {
        return {
            value: EMPTY_DISPLAY,
            unit: "",
        };
    }

    const [value, unit] = text.split(" ");
    return {
        value,
        unit: unit || "",
    };
}

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
    const direction = longitude >= 0 ? "E" : "W";
    return `${Math.abs(longitude).toFixed(COORDINATE_DECIMALS)}° ${direction}`;
}

function formatLatitude(latitude) {
    const direction = latitude >= 0 ? "N" : "S";
    return `${Math.abs(latitude).toFixed(COORDINATE_DECIMALS)}° ${direction}`;
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
    const viewer = props.viewer;
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

    if (!viewer?.scene?.canvas) {
        return;
    }

    mouseMoveHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    mouseMoveHandler.setInputAction(
        handleMouseMove,
        Cesium.ScreenSpaceEventType.MOUSE_MOVE,
    );
}

watch(
    () => props.viewer,
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
