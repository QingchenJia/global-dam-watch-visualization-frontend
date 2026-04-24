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
                    <el-icon class="status-panel__icon" aria-hidden="true">
                        <Clock />
                    </el-icon>
                    <strong class="status-panel__time">{{ timeText }}</strong>
                </div>

                <div class="status-panel__item">
                    <el-icon class="status-panel__icon" aria-hidden="true">
                        <Calendar />
                    </el-icon>
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
            <el-button
                type="primary"
                plain
                class="header-action-btn"
                :disabled="isLoading || isSyncing"
                @click="fetchStats"
            >
                <el-icon><Histogram /></el-icon>
                <span>查询统计</span>
            </el-button>
            <el-button
                type="primary"
                plain
                class="header-action-btn"
                :disabled="isLoading || isSyncing"
                @click="syncMap(viewer)"
            >
                <el-icon><Location /></el-icon>
                <span>地图同步</span>
            </el-button>
            <el-button
                type="primary"
                plain
                class="header-action-btn"
                :disabled="
                    isLoading || isSyncing || syncedEntities.length === 0
                "
                @click="exportSyncCsv"
            >
                <el-icon><Download /></el-icon>
                <span>导出 CSV</span>
            </el-button>
            <el-button
                type="primary"
                plain
                class="header-action-btn"
                :disabled="isLoading || isSyncing"
                @click="exportChartsPng"
            >
                <el-icon><Picture /></el-icon>
                <span>导出 PNG</span>
            </el-button>
        </div>
    </header>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import {
    Calendar,
    Clock,
    Download,
    Histogram,
    Location,
    Picture,
} from "@element-plus/icons-vue";
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
