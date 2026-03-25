<template>
    <transition name="timeline-slide">
        <div v-if="show" class="timeline-slider">
            <!-- 标题行 -->
            <div class="timeline-header">
                <span class="timeline-title">
                    <svg viewBox="0 0 24 24">
                        <path
                            d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm4.24 16L11 13V7h1.5v5.25l4.5 2.67-1.26 2.08z"
                        />
                    </svg>
                    建设历程回放
                </span>
                <div class="timeline-type-switch" title="切换时间轴对象">
                    <span
                        class="timeline-type-label"
                        :class="{ active: dataType === 'barrier' }"
                    >
                        大坝
                    </span>
                    <label class="timeline-switch">
                        <input
                            type="checkbox"
                            :checked="dataType === 'reservoir'"
                            @change="toggleDataType"
                        />
                        <span class="timeline-switch-track"></span>
                    </label>
                    <span
                        class="timeline-type-label"
                        :class="{ active: dataType === 'reservoir' }"
                    >
                        水库
                    </span>
                </div>
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

            <!-- 滑块 -->
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

            <!-- 年份刻度 -->
            <div class="timeline-axis">
                <span v-for="tick in axisTicks" :key="tick">{{ tick }}</span>
            </div>

            <!-- 控制行 -->
            <div class="timeline-controls">
                <!-- 播放或暂停 -->
                <button
                    class="timeline-play-btn"
                    :title="isPlaying ? '暂停' : '播放'"
                    @click="togglePlay"
                >
                    <!-- 播放图标 -->
                    <svg v-if="!isPlaying" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                    </svg>
                    <!-- 暂停图标 -->
                    <svg v-else viewBox="0 0 24 24">
                        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                    </svg>
                </button>

                <!-- 重置 -->
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

                <!-- 速度选择 -->
                <div class="timeline-speed-group">
                    <button
                        v-for="s in SPEEDS"
                        :key="s.value"
                        class="timeline-speed-btn"
                        :class="{ active: speed === s.value }"
                        @click="speed = s.value"
                    >
                        {{ s.label }}
                    </button>
                </div>

                <!-- 年份和计数 -->
                <div class="timeline-status">
                    <span class="timeline-year-label"
                        >当前 {{ currentYear }} 年</span
                    >
                    <span class="timeline-dam-count"
                        >已显示 {{ visibleCount }} 个{{ dataTypeLabel }}</span
                    >
                </div>
            </div>
        </div>
    </transition>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from "vue";
import {
    timeSliderShowEntities,
    restoreAllEntitiesByType,
    getBarrierDataSource,
    getReservoirDataSource,
} from "../hooks/earth.js";

const globalVar = defineProps({
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
    { label: "×1", value: 1 },
    { label: "×5", value: 5 },
    { label: "×10", value: 10 },
    { label: "×20", value: 20 },
];

const currentYear = ref(MIN_YEAR);
const isPlaying = ref(false);
const speed = ref(5);
let timer = null;

const progressPct = computed(
    () => ((currentYear.value - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100,
);

const axisTicks = computed(() => {
    const ticks = [];
    for (let y = MIN_YEAR; y <= MAX_YEAR; y += TICK_STEP) {
        ticks.push(y);
    }
    if (ticks[ticks.length - 1] !== MAX_YEAR) {
        ticks.push(MAX_YEAR);
    }
    return ticks;
});

const visibleCount = ref(0);
const dataType = ref("barrier");

const dataTypeLabel = computed(() => {
    switch (dataType.value) {
        case "barrier":
            return "大坝";
        case "reservoir":
            return "水库";
        default:
            return "";
    }
});

function toggleDataType(event) {
    stopPlay();
    restoreAllEntitiesByType(dataType.value);

    // 切换数据类型
    if (event.target.checked) {
        dataType.value = "reservoir";
    } else {
        dataType.value = "barrier";
    }

    applyYear(currentYear.value);
}

function updateVisibleCount() {
    if (!globalVar.viewer) {
        visibleCount.value = 0;
        return;
    }
    try {
        if (dataType.value === "barrier") {
            const barrierDataSource = getBarrierDataSource(globalVar.viewer);
            visibleCount.value = barrierDataSource
                ? barrierDataSource.entities.values.filter((e) => e.show).length
                : 0;
            return;
        }

        const reservoirDataSource = getReservoirDataSource(globalVar.viewer);
        visibleCount.value = reservoirDataSource
            ? reservoirDataSource.entities.values.filter((e) => e.show).length
            : 0;
    } catch {
        visibleCount.value = 0;
    }
}

function applyYear(year) {
    currentYear.value = year;
    timeSliderShowEntities(globalVar.viewer, dataType.value, year);
    updateVisibleCount();
}

function onSliderInput(e) {
    stopPlay();
    applyYear(Number(e.target.value));
}

function togglePlay() {
    isPlaying.value ? stopPlay() : startPlay();
}

function startPlay() {
    // 若已到终点则先重置
    if (currentYear.value >= MAX_YEAR) currentYear.value = MIN_YEAR;
    isPlaying.value = true;
    timer = setInterval(() => {
        const next = currentYear.value + speed.value;
        if (next >= MAX_YEAR) {
            applyYear(MAX_YEAR);
            stopPlay();
        } else {
            applyYear(next);
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

// 面板打开时立即按当前年份过滤
watch(
    () => globalVar.show,
    (val) => {
        if (val) {
            applyYear(currentYear.value);
        } else {
            stopPlay();
            restoreAllTimelineEntities();
        }
    },
);

// 组件卸载时清理
onUnmounted(() => {
    stopPlay();
    restoreAllTimelineEntities();
});
</script>
