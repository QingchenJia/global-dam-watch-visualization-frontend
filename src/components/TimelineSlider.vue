<template>
    <transition name="timeline-slide">
        <div v-if="show" class="timeline-slider">
            <div class="timeline-header">
                <div class="timeline-header__title">
                    <span class="timeline-title">
                        <svg viewBox="0 0 24 24">
                            <path
                                d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm4.24 16L11 13V7h1.5v5.25l4.5 2.67-1.26 2.08z"
                            />
                        </svg>
                        建设历程回放
                    </span>
                </div>

                <div class="timeline-header__tools">
                    <button
                        class="timeline-close-btn"
                        title="关闭时间轴"
                        @click="handleClose"
                    >
                        <svg viewBox="0 0 24 24">
                            <path
                                d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                            />
                        </svg>
                    </button>
                </div>
            </div>

            <div class="timeline-track-wrap">
                <div class="timeline-range-wrap">
                    <input
                        class="timeline-range"
                        type="range"
                        :min="MIN_YEAR"
                        :max="MAX_YEAR"
                        :value="currentYear"
                        :style="{ '--slider-pct': progressPct + '%' }"
                        @input="onSliderInput"
                    />
                </div>

                <div class="timeline-axis">
                    <span v-for="tick in axisTicks" :key="tick">{{
                        tick
                    }}</span>
                </div>
            </div>

            <div class="timeline-controls">
                <div class="timeline-controls__left">
                    <button
                        class="timeline-play-btn"
                        :title="isPlaying ? '暂停' : '播放'"
                        @click="togglePlay"
                    >
                        <svg v-if="!isPlaying" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                        </svg>
                        <svg v-else viewBox="0 0 24 24">
                            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                        </svg>
                    </button>

                    <button
                        class="timeline-restart-btn"
                        title="重置到起始年份"
                        @click="restart"
                    >
                        <svg viewBox="0 0 24 24">
                            <path
                                d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"
                            />
                        </svg>
                    </button>

                    <div class="timeline-speed-group">
                        <button
                            v-for="item in SPEEDS"
                            :key="item.value"
                            class="timeline-speed-btn"
                            :class="{ active: speed === item.value }"
                            @click="speed = item.value"
                        >
                            {{ item.label }}
                        </button>
                    </div>
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
    </transition>
</template>

<script setup>
import { computed, onUnmounted, ref, watch } from "vue";
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

const progressPct = computed(
    () => ((currentYear.value - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100,
);

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

function onSliderInput(event) {
    stopPlay();
    applyYear(Number(event.target.value));
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
