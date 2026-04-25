<template>
    <div class="timeline-slider">
        <div class="timeline-header">
            <div class="timeline-header__title">
                <div class="quick-panel__title timeline-title-row">
                    <el-icon class="quick-panel__title-icon" aria-hidden="true">
                        <Clock />
                    </el-icon>
                    <div class="quick-panel__title-text">
                        <h2 class="hud-card-title">建设历程回放</h2>
                    </div>
                </div>
            </div>

            <div class="timeline-header__tools">
                <el-button
                    class="timeline-close-btn"
                    text
                    circle
                    title="关闭时间轴"
                    @click="handleClose"
                >
                    <el-icon><Close /></el-icon>
                </el-button>
            </div>
        </div>

        <div class="timeline-track-wrap">
            <div class="timeline-range-wrap">
                <el-slider
                    v-model="currentYear"
                    class="timeline-range"
                    :min="MIN_YEAR"
                    :max="MAX_YEAR"
                    :format-tooltip="(value) => `${value}`"
                    :show-tooltip="false"
                    @input="onSliderInput"
                />
            </div>

            <div class="timeline-axis">
                <span v-for="tick in axisTicks" :key="tick">{{ tick }}</span>
            </div>
        </div>

        <div class="timeline-controls">
            <div class="timeline-controls__left">
                <el-button
                    class="timeline-play-btn"
                    :title="isPlaying ? '暂停' : '播放'"
                    @click="togglePlay"
                >
                    <span
                        v-if="isPlaying"
                        class="timeline-play-icon timeline-play-icon--pause"
                        aria-hidden="true"
                    ></span>
                    <span
                        v-else
                        class="timeline-play-icon timeline-play-icon--triangle"
                        aria-hidden="true"
                    ></span>
                </el-button>

                <el-button
                    class="timeline-restart-btn"
                    title="重置到起始年份"
                    @click="restart"
                >
                    <el-icon><RefreshRight /></el-icon>
                </el-button>

                <el-segmented
                    v-model="speed"
                    class="timeline-speed-group"
                    :options="SPEEDS"
                    size="small"
                />
            </div>

            <div class="timeline-status">
                <div class="timeline-status__item">
                    <small>当前年份</small>
                    <strong>{{ currentYear }}</strong>
                </div>
                <div class="timeline-status__divider"></div>
                <div class="timeline-status__item">
                    <small>已显示</small>
                    <strong>{{ visibleCount }} 个</strong>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed, onUnmounted, ref, watch } from "vue";
import { Clock, Close, RefreshRight } from "@element-plus/icons-vue";
import { useDashboard } from "../hooks/dashboard.js";
import {
    getBarrierDataSource,
    getReservoirDataSource,
    restoreAllEntitiesByType,
    timeSliderShowEntities,
} from "../hooks/earth.js";

const props = defineProps({
    viewer: {
        type: Object,
        required: true,
    },
    show: {
        type: Boolean,
        required: true,
    },
});

const emit = defineEmits(["close"]);

const MIN_YEAR = 1900;
const MAX_YEAR = new Date().getFullYear();
const TICK_STEP = 20;
const INTERVAL_MS = 200;

const SPEEDS = [
    { label: "x1", value: 1 },
    { label: "x5", value: 5 },
    { label: "x10", value: 10 },
    { label: "x20", value: 20 },
];

const { dataType } = useDashboard();

const currentYear = ref(MIN_YEAR);
const isPlaying = ref(false);
const speed = ref(5);
const visibleCount = ref(0);

let timer = null;

const axisTicks = computed(() => {
    const ticks = [];

    for (let year = MIN_YEAR; year <= MAX_YEAR; year += TICK_STEP) {
        ticks.push(year);
    }

    if (ticks[ticks.length - 1] !== MAX_YEAR) {
        ticks.push(MAX_YEAR);
    }

    return ticks;
});

function updateVisibleCount() {
    if (!props.viewer) {
        visibleCount.value = 0;
        return;
    }

    try {
        if (dataType.value === "barrier") {
            const barrierDataSource = getBarrierDataSource(props.viewer);
            visibleCount.value = barrierDataSource
                ? barrierDataSource.entities.values.filter(
                      (entity) => entity.show,
                  ).length
                : 0;
            return;
        }

        const reservoirDataSource = getReservoirDataSource(props.viewer);
        visibleCount.value = reservoirDataSource
            ? reservoirDataSource.entities.values.filter(
                  (entity) => entity.show,
              ).length
            : 0;
    } catch {
        visibleCount.value = 0;
    }
}

function applyYear(year) {
    currentYear.value = year;
    timeSliderShowEntities(props.viewer, dataType.value, year);
    updateVisibleCount();
}

function onSliderInput(value) {
    stopPlay();
    applyYear(Number(value));
}

function togglePlay() {
    if (isPlaying.value) {
        stopPlay();
        return;
    }

    startPlay();
}

function startPlay() {
    if (currentYear.value >= MAX_YEAR) {
        currentYear.value = MIN_YEAR;
    }

    isPlaying.value = true;
    timer = setInterval(() => {
        const nextYear = currentYear.value + speed.value;

        if (nextYear >= MAX_YEAR) {
            applyYear(MAX_YEAR);
            stopPlay();
        } else {
            applyYear(nextYear);
        }
    }, INTERVAL_MS);
}

function stopPlay() {
    isPlaying.value = false;

    if (timer) {
        clearInterval(timer);
        timer = null;
    }
}

function restart() {
    stopPlay();
    applyYear(MIN_YEAR);
}

function restoreAllTimelineEntities() {
    restoreAllEntitiesByType("barrier");
    restoreAllEntitiesByType("reservoir");
}

function handleClose() {
    stopPlay();
    restoreAllTimelineEntities();
    visibleCount.value = 0;
    emit("close");
}

watch(
    () => props.show,
    (visible) => {
        if (visible) {
            applyYear(currentYear.value);
        } else {
            stopPlay();
            restoreAllTimelineEntities();
        }
    },
);

watch(dataType, (_, prevType) => {
    stopPlay();

    if (prevType === "barrier" || prevType === "reservoir") {
        restoreAllEntitiesByType(prevType);
    }

    if (props.show) {
        applyYear(currentYear.value);
    }
});

onUnmounted(() => {
    stopPlay();
    restoreAllTimelineEntities();
});
</script>
