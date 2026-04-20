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

<style scoped>
.top-header-bar {
    display: grid;
    grid-template-columns: minmax(290px, 1fr) minmax(420px, 620px) minmax(
            540px,
            1fr
        );
    align-items: center;
    gap: 12px;
    min-height: 38px;
    width: calc(100% + 36px);
    margin-top: -12px;
    margin-left: -18px;
    margin-right: -18px;
    padding: 6px 18px 6px;
    border: none;
    box-shadow: none;
    background: transparent;
    border-radius: 0;
    pointer-events: auto;
}

.top-header-bar__left,
.top-header-bar__right {
    display: flex;
    align-items: center;
    min-width: 0;
}

.top-header-bar__center {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 0;
}

.top-header-bar__right {
    justify-content: flex-end;
    gap: 8px;
    flex-wrap: wrap;
}

.status-panel {
    display: flex;
    align-items: center;
    gap: 18px;
    width: 100%;
    min-width: 0;
}

.status-panel__item {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
}

.status-panel__item--system {
    gap: 10px;
}

.status-panel__label {
    font-size: 12px;
    font-weight: 600;
    color: var(--hud-text-dim);
    letter-spacing: 0.04em;
    white-space: nowrap;
}

.status-panel__value,
.status-panel__date {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
}

.status-panel strong {
    font-size: 13px;
    font-weight: 700;
    color: #f2fbff;
    letter-spacing: 0.03em;
    white-space: nowrap;
}

.status-panel__time {
    font-size: 14px;
}

.status-panel__date em {
    font-style: normal;
    font-size: 12px;
    font-weight: 600;
    color: var(--hud-accent-soft);
    letter-spacing: 0.03em;
    white-space: nowrap;
}

.status-panel__icon {
    width: 18px;
    height: 18px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #68dfff;
    flex-shrink: 0;
}

.status-panel__icon svg {
    width: 16px;
    height: 16px;
    fill: currentColor;
    filter: drop-shadow(0 0 6px rgba(70, 205, 255, 0.22));
}

.status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: rgba(108, 135, 160, 0.42);
    box-shadow: 0 0 0 3px rgba(108, 135, 160, 0.08);
    flex-shrink: 0;
}

.status-dot.active {
    background: #13f3a6;
    box-shadow:
        0 0 10px rgba(19, 243, 166, 0.76),
        0 0 0 3px rgba(19, 243, 166, 0.12);
}

.title-shell {
    width: 100%;
    display: grid;
    grid-template-columns: minmax(56px, 1fr) auto minmax(56px, 1fr);
    align-items: center;
    gap: 10px;
}

.title-shell__main {
    position: relative;
    min-width: 0;
    padding: 4px 18px 5px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1px;
    border-radius: 12px 12px 16px 16px;
    background:
        linear-gradient(180deg, rgba(11, 41, 82, 0.78), rgba(4, 18, 42, 0.28)),
        rgba(8, 20, 40, 0.7);
    border: 1px solid rgba(93, 214, 255, 0.22);
    box-shadow:
        inset 0 0 20px rgba(37, 132, 255, 0.1),
        0 0 16px rgba(37, 132, 255, 0.08);
}

.title-shell__main::before,
.title-shell__main::after {
    content: "";
    position: absolute;
    top: -1px;
    width: 42px;
    height: 8px;
    border-top: 1px solid rgba(96, 214, 255, 0.65);
}

.title-shell__main::before {
    left: -34px;
    border-left: 1px solid rgba(96, 214, 255, 0.34);
    transform: skewX(-38deg);
}

.title-shell__main::after {
    right: -34px;
    border-right: 1px solid rgba(96, 214, 255, 0.34);
    transform: skewX(38deg);
}

.title-shell__main :deep(.hud-kicker) {
    transform: scale(0.92);
    transform-origin: center;
}

.title-shell__main h1 {
    margin: 0;
    font-size: clamp(16px, 1.15vw, 22px);
    letter-spacing: 0.08em;
    color: var(--hud-title);
    text-shadow:
        0 0 8px rgba(96, 210, 255, 0.65),
        0 0 18px rgba(24, 132, 255, 0.2);
    white-space: nowrap;
}

.title-shell__wing {
    position: relative;
    height: 12px;
}

.title-shell__wing::before,
.title-shell__wing::after {
    content: "";
    position: absolute;
    inset: 0;
}

.title-shell__wing::before {
    border-top: 1px solid rgba(91, 212, 255, 0.64);
    opacity: 0.88;
}

.title-shell__wing::after {
    top: 4px;
    height: 1px;
    background: linear-gradient(
        90deg,
        transparent 0%,
        rgba(62, 201, 255, 0.88) 24%,
        rgba(62, 201, 255, 0.08) 100%
    );
}

.title-shell__wing--left::before {
    clip-path: polygon(0 0, 100% 0, 92% 100%, 0 100%);
}

.title-shell__wing--right::before {
    clip-path: polygon(8% 0, 100% 0, 100% 100%, 0 100%);
}

.title-shell__wing--right::after {
    background: linear-gradient(
        270deg,
        transparent 0%,
        rgba(62, 201, 255, 0.88) 24%,
        rgba(62, 201, 255, 0.08) 100%
    );
}

.header-action-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    min-width: 124px;
    min-height: 36px;
    padding: 0 15px;
    border-radius: 10px;
    border: 1px solid rgba(76, 181, 255, 0.24);
    background:
        linear-gradient(180deg, rgba(7, 23, 46, 0.94), rgba(4, 14, 30, 0.9)),
        rgba(6, 23, 46, 0.92);
    color: var(--hud-text);
    font-size: 13px;
    font-weight: 600;
    white-space: nowrap;
    line-height: 1;
    cursor: pointer;
    transition:
        border-color 0.2s ease,
        box-shadow 0.2s ease,
        transform 0.2s ease,
        color 0.2s ease,
        background 0.2s ease;
}

.header-action-btn:hover:not(:disabled) {
    color: #ffffff;
    border-color: rgba(86, 208, 255, 0.7);
    background:
        linear-gradient(180deg, rgba(11, 41, 78, 0.94), rgba(6, 25, 53, 0.92)),
        rgba(7, 22, 43, 0.92);
    box-shadow:
        inset 0 0 16px rgba(55, 146, 255, 0.16),
        0 0 12px rgba(44, 132, 255, 0.16);
    transform: translateY(-1px);
}

.header-action-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
}

.header-action-btn__icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: 6px;
    background: linear-gradient(
        180deg,
        rgba(18, 87, 158, 0.58),
        rgba(10, 49, 93, 0.46)
    );
    color: #69dfff;
    box-shadow: inset 0 0 10px rgba(127, 226, 255, 0.12);
    flex-shrink: 0;
}

.header-action-btn__icon svg {
    width: 13px;
    height: 13px;
    fill: currentColor;
}

.header-action-btn span:last-child {
    white-space: nowrap;
}

@media (max-width: 1460px) {
    .top-header-bar {
        width: calc(100% + 36px);
        margin-top: -12px;
        margin-left: -18px;
        margin-right: -18px;
        grid-template-columns: 1fr;
        justify-items: center;
    }

    .top-header-bar__left,
    .top-header-bar__right {
        justify-content: center;
        width: 100%;
        flex-wrap: wrap;
    }

    .top-header-bar__center {
        order: -1;
        width: 100%;
    }

    .status-panel {
        justify-content: center;
        flex-wrap: wrap;
    }
}

@media (max-width: 960px) {
    .status-panel {
        gap: 10px 14px;
    }
}
</style>
