<template>
    <div class="stats-panel">
        <div class="stats-header">
            <div class="stats-header-left">
                <h2 class="stats-title">统计面板</h2>
                <div class="toggle-switch">
                    <span
                        class="toggle-label"
                        :class="{ active: dataType === 'barrier' }"
                        >大坝</span
                    >
                    <div class="switch-track" @click="toggleDataType">
                        <div
                            class="switch-thumb"
                            :class="{ right: dataType === 'reservoir' }"
                        ></div>
                    </div>
                    <span
                        class="toggle-label"
                        :class="{ active: dataType === 'reservoir' }"
                        >水库</span
                    >
                </div>
            </div>
            <div class="stats-header-right">
                <button
                    class="query-btn"
                    @click="fetchStats"
                    :disabled="isLoading"
                >
                    <span v-if="isLoading" class="btn-loading"></span>
                    <span v-else>查询统计</span>
                </button>
            </div>
        </div>

        <div class="stats-body">
            <!-- 条件筛选表单 -->
            <div class="stats-filter">
                <h3 class="filter-title">筛选条件</h3>

                <template v-for="field in activeFormField" :key="field.key">
                    <div
                        class="filter-group"
                        v-if="field.type === 'multiSelect'"
                    >
                        <label class="filter-label">{{ field.label }}</label>
                        <div
                            class="multi-select"
                            :class="{
                                open: openDropdown === field.key,
                            }"
                        >
                            <div
                                class="multi-select-trigger"
                                :ref="(el) => setTriggerRef(el, field.key)"
                                @click.stop="toggleDropdown(field.key)"
                            >
                                <span class="multi-select-text">{{
                                    getMultiSelectText(field.key)
                                }}</span>
                                <svg
                                    class="multi-select-arrow"
                                    viewBox="0 0 10 6"
                                >
                                    <path d="M0 0l5 6 5-6z" />
                                </svg>
                            </div>
                            <Teleport to="body">
                                <div
                                    class="multi-select-panel"
                                    v-show="openDropdown === field.key"
                                    :style="dropdownStyle"
                                    @click.stop
                                >
                                    <label
                                        v-for="opt in field.options"
                                        :key="opt.value"
                                        class="multi-select-option"
                                    >
                                        <input
                                            type="checkbox"
                                            :value="opt.value"
                                            v-model="activeForm[field.key]"
                                        />
                                        <span>{{ opt.label }}</span>
                                    </label>
                                </div>
                            </Teleport>
                        </div>
                    </div>

                    <!-- 数值区间选择 -->
                    <div
                        class="filter-group"
                        v-else-if="field.type === 'rangeSelect'"
                    >
                        <label class="filter-label">{{ field.label }}</label>
                        <div
                            class="multi-select"
                            :class="{
                                open: openDropdown === field.key,
                            }"
                        >
                            <div
                                class="multi-select-trigger"
                                :ref="(el) => setTriggerRef(el, field.key)"
                                @click.stop="toggleDropdown(field.key)"
                            >
                                <span class="multi-select-text">{{
                                    getRangeSelectText(field.key, field.ranges)
                                }}</span>
                                <svg
                                    class="multi-select-arrow"
                                    viewBox="0 0 10 6"
                                >
                                    <path d="M0 0l5 6 5-6z" />
                                </svg>
                            </div>
                            <Teleport to="body">
                                <div
                                    class="multi-select-panel"
                                    v-show="openDropdown === field.key"
                                    :style="dropdownStyle"
                                    @click.stop
                                >
                                    <div
                                        class="range-select-option"
                                        :class="{
                                            selected:
                                                activeForm[field.key] === '',
                                        }"
                                        @click="selectRange(field.key, '')"
                                    >
                                        全部
                                    </div>
                                    <div
                                        v-for="r in field.ranges"
                                        :key="r.value"
                                        class="range-select-option"
                                        :class="{
                                            selected:
                                                activeForm[field.key] ===
                                                r.value,
                                        }"
                                        @click="selectRange(field.key, r.value)"
                                    >
                                        {{ r.label }}
                                    </div>
                                </div>
                            </Teleport>
                        </div>
                    </div>

                    <!-- 年份区间选择 -->
                    <div
                        class="filter-group"
                        v-else-if="field.type === 'yearRange'"
                    >
                        <label class="filter-label">{{ field.label }}</label>
                        <div class="filter-range">
                            <input
                                :value="activeForm.year[0]"
                                @input="onYearInput('yearFrom', $event)"
                                class="filter-input range-input"
                                type="text"
                                inputmode="numeric"
                                placeholder="起始年份"
                                maxlength="4"
                            />
                            <span class="range-sep">—</span>
                            <input
                                :value="activeForm.year[1]"
                                @input="onYearInput('yearTo', $event)"
                                class="filter-input range-input"
                                type="text"
                                inputmode="numeric"
                                placeholder="结束年份"
                                maxlength="4"
                            />
                        </div>
                    </div>
                </template>

                <button class="reset-btn" @click="resetForm">重置条件</button>
            </div>

            <!-- ECharts统计饼图区域 -->
            <div class="stats-charts">
                <div class="chart-grid">
                    <div
                        class="chart-item"
                        v-for="(chart, index) in chartConfig"
                        :key="index"
                    >
                        <div class="chart-title">{{ chart.title }}</div>
                        <div
                            class="chart-container"
                            :ref="(el) => setChartRef(el, index)"
                        ></div>
                    </div>
                </div>
                <!-- 数据总数提示 -->
                <div class="stats-summary" v-if="totalCount > 0">
                    <span
                        >共筛选出 <strong>{{ totalCount }}</strong> 条{{
                            dataType === "barrier" ? "大坝" : "水库"
                        }}记录</span
                    >
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import {
    ref,
    reactive,
    computed,
    onMounted,
    onUnmounted,
    nextTick,
    watch,
} from "vue";
import * as echarts from "echarts";
import { FORM_FIELD, CHART_CONFIG } from "../configs/chart.js";
import { dataStats } from "../utils/stats.js";

// 面板状态
const isLoading = ref(false);
const dataType = ref("barrier");
const totalCount = ref(0);

let form = {
    barrier: reactive({
        damType: [],
        powerMw: "",
        mainBasin: [],
        mainUse: [],
        quality: [],
        year: [],
        country: [],
        damHgtM: "",
    }),
    reservoir: reactive({
        capMcm: "",
        areaSkm: "",
        mainBasin: [],
        mainUse: [],
        quality: [],
        year: [],
        country: [],
        depthM: "",
    }),
};

const activeForm = computed(() => form[dataType.value]);
const activeFormField = computed(() => FORM_FIELD[dataType.value]);

const openDropdown = ref("");
const dropdownStyle = ref({});
const triggerRefs = {};

const setTriggerRef = (el, key) => {
    if (el) triggerRefs[key] = el;
};

const toggleDropdown = (key) => {
    if (openDropdown.value === key) {
        openDropdown.value = "";
        return;
    }
    const triggerEl = triggerRefs[key];
    if (triggerEl) {
        const rect = triggerEl.getBoundingClientRect();
        dropdownStyle.value = {
            top: `${rect.bottom + 2}px`,
            left: `${rect.left}px`,
            width: `${rect.width}px`,
        };
    }
    openDropdown.value = key;
};

const closeAllDropdowns = () => {
    openDropdown.value = "";
};

const getMultiSelectText = (key) => {
    const selected = activeForm.value[key];
    if (!selected || selected.length === 0) return "全部";
    if (selected.length === 1) return selected[0];
    return `已选 ${selected.length} 项`;
};

// 单选区间下拉辅助
const getRangeSelectText = (key, ranges) => {
    const val = activeForm.value[key];
    if (!val) return "全部";
    const found = ranges.find((r) => r.value === val);
    return found ? found.label : "全部";
};

const selectRange = (key, value) => {
    activeForm.value[key] = value;
    openDropdown.value = "";
};

const onYearInput = (field, event) => {
    const raw = event.target.value.replace(/\D/g, "").slice(0, 4);
    event.target.value = raw;
    const val = raw ? parseInt(raw) : null;

    switch (field) {
        case "yearFrom":
            form[dataType.value].year[0] = val;
            break;
        case "yearTo":
            form[dataType.value].year[1] = val;
            break;
    }
};

const chartConfig = ref([...CHART_CONFIG.barrier]);
const chartInstances = [];
const chartRefs = [];

const setChartRef = (el, index) => {
    if (el) {
        chartRefs[index] = el;
    }
};

// 切换大坝或水库数据类型
const toggleDataType = () => {
    switch (dataType.value) {
        case "barrier":
            dataType.value = "reservoir";
            break;
        case "reservoir":
            dataType.value = "barrier";
            break;
    }
};

// 监听数据类型变化时切换图表配置并重置筛选
watch(dataType, (newType) => {
    chartConfig.value = [...CHART_CONFIG[newType]];
    resetForm();
    nextTick(() => {
        chartConfig.value.forEach((config, index) => {
            // 更新图表为无数据状态
            renderPieChart(index, [], config.title);
        });
    });
});

const resetForm = () => {
    form[dataType.value].mainBasin = [];
    form[dataType.value].country = [];
    form[dataType.value].mainUse = [];
    form[dataType.value].quality = [];
    form[dataType.value].year = [];

    switch (dataType.value) {
        case "barrier":
            form.barrier.damType = [];
            form.barrier.powerMw = "";
            form.barrier.damHgtM = "";
            break;
        case "reservoir":
            form.reservoir.capMcm = "";
            form.reservoir.areaSkm = "";
            form.reservoir.depthM = "";
            break;
    }

    openDropdown.value = "";
    totalCount.value = 0;
};

// 查询统计数据
const fetchStats = async () => {
    isLoading.value = true;
    try {
        const result = await dataStats({
            form: activeForm.value,
            type: dataType.value,
        });

        totalCount.value = result.total;

        // 将六个图表的数据分别渲染
        result.chartDataList.forEach((data, index) => {
            renderPieChart(index, data);
        });
    } catch (err) {
        console.error("统计查询失败：", err);
        totalCount.value = 0;
        // 请求失败时置为无数据状态
        chartConfig.value.forEach((config, index) => {
            renderPieChart(index, []);
        });
    } finally {
        isLoading.value = false;
    }
};

// 渲染饼图
const renderPieChart = (index, data) => {
    const dom = chartRefs[index];
    if (!dom) return;

    // 销毁旧实例避免重复
    if (chartInstances[index]) {
        chartInstances[index].dispose();
    }

    const chart = echarts.init(dom);
    chartInstances[index] = chart;

    const option = {
        backgroundColor: "transparent",
        tooltip: {
            trigger: "item",
            formatter: "{b}: {c} ({d}%)",
            backgroundColor: "rgba(30,30,30,0.9)",
            borderColor: "#555",
            textStyle: { color: "#eee", fontSize: 12 },
            appendToBody: true,
            z: 99999,
        },
        legend: {
            type: "scroll",
            orient: "horizontal",
            bottom: 0,
            textStyle: { color: "#bbb", fontSize: 10 },
            pageTextStyle: { color: "#bbb" },
            pageIconColor: "#aaa",
            pageIconInactiveColor: "#555",
        },
        series: [
            {
                type: "pie",
                radius: ["30%", "60%"],
                center: ["50%", "45%"],
                avoidLabelOverlap: true,
                itemStyle: {
                    borderRadius: 4,
                    borderColor: "rgba(30,30,30,0.95)",
                    borderWidth: 2,
                },
                label: {
                    show: false,
                },
                emphasis: {
                    label: {
                        show: true,
                        fontSize: 12,
                        fontWeight: "bold",
                        color: "#fff",
                    },
                    itemStyle: {
                        shadowBlur: 10,
                        shadowOffsetX: 0,
                        shadowColor: "rgba(0, 0, 0, 0.5)",
                    },
                },
                data:
                    data.length > 0
                        ? data
                        : [
                              {
                                  name: "暂无数据",
                                  value: 0,
                                  itemStyle: { color: "#444" },
                              },
                          ],
            },
        ],
        color: [
            "#5470c6",
            "#91cc75",
            "#fac858",
            "#ee6666",
            "#73c0de",
            "#3ba272",
            "#fc8452",
            "#9a60b4",
            "#ea7ccc",
            "#48b8d0",
        ],
    };

    chart.setOption(option);
};

const initCharts = () => {
    nextTick(() => {
        chartConfig.value.forEach((config, index) => {
            renderPieChart(index, [], config.title);
        });
    });
};

// 窗口大小变化时重绘图表
const handleResize = () => {
    chartInstances.forEach((chart) => {
        if (chart && !chart.isDisposed()) {
            chart.resize();
        }
    });
};

onMounted(() => {
    initCharts();
    window.addEventListener("resize", handleResize);
    document.addEventListener("click", closeAllDropdowns);
});

onUnmounted(() => {
    window.removeEventListener("resize", handleResize);
    document.removeEventListener("click", closeAllDropdowns);
    chartInstances.forEach((chart) => {
        if (chart && !chart.isDisposed()) {
            chart.dispose();
        }
    });
});
</script>
