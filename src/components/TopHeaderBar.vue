<template>
    <header class="top-header-bar hud-card">
        <div class="top-header-bar__left">
            <div class="status-panel">
                <div class="status-panel__item status-panel__item--system">
                    <span class="status-panel__label">系统状态</span>
                    <div class="status-panel__value">
                        <span
                            class="status-dot"
                            :class="{ active: !!viewer }"
                        ></span>
                        <strong>{{ viewer ? "运行中" : "初始化中" }}</strong>
                    </div>
                </div>

                <div class="status-panel__item">
                    <span class="status-panel__icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24">
                            <path
                                d="M12 1.75a10.25 10.25 0 1 0 10.25 10.25A10.26 10.26 0 0 0 12 1.75zm0 18.5A8.25 8.25 0 1 1 20.25 12 8.26 8.26 0 0 1 12 20.25zm.75-13.5h-1.5v5.61l4.34 2.57.76-1.29-3.6-2.13z"
                            />
                        </svg>
                    </span>
                    <strong class="status-panel__time">{{ timeText }}</strong>
                </div>

                <div class="status-panel__item">
                    <span class="status-panel__icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24">
                            <path
                                d="M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 15H5V9h14zm-9-7H7v3h3zm4 0h-3v3h3zm4 0h-3v3h3z"
                            />
                        </svg>
                    </span>
                    <div class="status-panel__date">
                        <strong>{{ dateText }}</strong>
                        <em>{{ weekdayText }}</em>
                    </div>
                </div>
            </div>
        </div>

        <div class="top-header-bar__center">
            <div class="title-shell">
                <div class="title-shell__wing title-shell__wing--left"></div>
                <div class="title-shell__main">
                    <span class="hud-kicker"
                        >Global Water Infrastructure Search Platform</span
                    >
                    <h1>全球水利工程检索系统</h1>
                </div>
                <div class="title-shell__wing title-shell__wing--right"></div>
            </div>
        </div>

        <div class="top-header-bar__right">
            <button
                type="button"
                class="header-action-btn"
                :disabled="isLoading || isSyncing"
                @click="fetchStats"
            >
                <span class="header-action-btn__icon">
                    <svg viewBox="0 0 24 24">
                        <path
                            d="M4 19h16v2H4zm2-3h3V7H6zm5 0h3V4h-3zm5 0h3v-9h-3z"
                        />
                    </svg>
                </span>
                <span>查询统计</span>
            </button>
            <button
                type="button"
                class="header-action-btn"
                :disabled="isLoading || isSyncing"
                @click="syncMap(viewer)"
            >
                <span class="header-action-btn__icon">
                    <svg viewBox="0 0 24 24">
                        <path
                            d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z"
                        />
                    </svg>
                </span>
                <span>地图同步</span>
            </button>
            <button
                type="button"
                class="header-action-btn"
                :disabled="
                    isLoading || isSyncing || syncedEntities.length === 0
                "
                @click="exportSyncCsv"
            >
                <span class="header-action-btn__icon">
                    <svg viewBox="0 0 24 24">
                        <path
                            d="M5 20h14v-2H5zm7-18-5.5 5.5h3.5V16h4V7.5h3.5z"
                        />
                    </svg>
                </span>
                <span>导出CSV</span>
            </button>
            <button
                type="button"
                class="header-action-btn"
                :disabled="isLoading || isSyncing"
                @click="exportChartsPng"
            >
                <span class="header-action-btn__icon">
                    <svg viewBox="0 0 24 24">
                        <path
                            d="M19 5H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 12H5V7h14zm-8-1 3-4 2 3 2-2 3 4zM7 10.5A1.5 1.5 0 1 0 7 7.5a1.5 1.5 0 0 0 0 3z"
                        />
                    </svg>
                </span>
                <span>导出PNG</span>
            </button>
        </div>
    </header>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useDashboard } from "../hooks/dashboard.js";

defineProps({
    viewer: {
        type: Object,
        required: true,
    },
});

const {
    isLoading,
    isSyncing,
    syncedEntities,
    fetchStats,
    syncMap,
    exportSyncCsv,
    exportChartsPng,
} = useDashboard();

const now = ref(new Date());
let timer = null;

const weekdayText = computed(() => {
    const labels = [
        "星期日",
        "星期一",
        "星期二",
        "星期三",
        "星期四",
        "星期五",
        "星期六",
    ];

    return labels[now.value.getDay()];
});

const timeText = computed(() =>
    now.value.toLocaleTimeString("zh-CN", {
        hour12: false,
    }),
);

const dateText = computed(() =>
    now.value
        .toLocaleDateString("zh-CN", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        })
        .replaceAll("/", "-"),
);

onMounted(() => {
    timer = window.setInterval(() => {
        now.value = new Date();
    }, 1000);
});

onBeforeUnmount(() => {
    if (timer) {
        window.clearInterval(timer);
        timer = null;
    }
});
</script>
