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

                <template v-for="field in activeFilterFields" :key="field.key">
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
                                            v-model="filters[field.key]"
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
                                            selected: filters[field.key] === '',
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
                                                filters[field.key] === r.value,
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
                                :value="filters.yearFrom"
                                @input="onYearInput('yearFrom', $event)"
                                class="filter-input range-input"
                                type="text"
                                inputmode="numeric"
                                placeholder="起始年份"
                                maxlength="4"
                            />
                            <span class="range-sep">—</span>
                            <input
                                :value="filters.yearTo"
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

                <button class="reset-btn" @click="resetFilters">
                    重置条件
                </button>
            </div>

            <!-- ECharts统计饼图区域 -->
            <div class="stats-charts">
                <div class="chart-grid">
                    <div
                        class="chart-item"
                        v-for="(chart, index) in chartConfigs"
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

// 面板状态
const isLoading = ref(false);
const dataType = ref("barrier");
const totalCount = ref(0);

// 筛选条件
const filters = reactive({
    damType: [],
    mainBasin: [],
    country: [],
    mainUse: [],
    quality: [],
    yearFrom: null,
    yearTo: null,
    powerMw: "",
    damHgtM: "",
    capMcm: "",
    areaSkm: "",
    depthM: "",
});

const damTypeOptions = [
    { label: "Dam", value: "Dam" },
    { label: "Low Permeable Dam", value: "Low Permeable Dam" },
    { label: "Lock", value: "Lock" },
    { label: "Lake Control Dam", value: "Lake Control Dam" },
];

const mainBasinOptions = [
    { label: "Yangtze (长江)", value: "Yangtze" },
    { label: "Yellow (黄河)", value: "Yellow" },
    { label: "Pearl (珠江)", value: "Pearl" },
    { label: "Hai He (海河)", value: "Hai He" },
    { label: "Huai He (淮河)", value: "Huai He" },
    { label: "Amazon", value: "Amazon" },
    { label: "Mississippi", value: "Mississippi" },
    { label: "Nile", value: "Nile" },
    { label: "Ganges", value: "Ganges" },
    { label: "Danube", value: "Danube" },
    { label: "Mekong", value: "Mekong" },
    { label: "Congo", value: "Congo" },
    { label: "Volga", value: "Volga" },
    { label: "Indus", value: "Indus" },
    { label: "Niger", value: "Niger" },
];

const countryOptions = [
    { label: "China", value: "China" },
    { label: "United States", value: "United States" },
    { label: "India", value: "India" },
    { label: "Brazil", value: "Brazil" },
    { label: "Japan", value: "Japan" },
    { label: "Canada", value: "Canada" },
    { label: "Russia", value: "Russia" },
    { label: "Turkey", value: "Turkey" },
    { label: "South Africa", value: "South Africa" },
    { label: "Indonesia", value: "Indonesia" },
    { label: "Mexico", value: "Mexico" },
    { label: "Australia", value: "Australia" },
    { label: "France", value: "France" },
    { label: "Spain", value: "Spain" },
    { label: "South Korea", value: "South Korea" },
];

const mainUseOptions = [
    { label: "Irrigation", value: "Irrigation" },
    { label: "Hydroelectricity", value: "Hydroelectricity" },
    { label: "Water supply", value: "Water supply" },
    { label: "Flood control", value: "Flood control" },
    { label: "Recreation", value: "Recreation" },
    { label: "Navigation", value: "Navigation" },
    { label: "Fisheries", value: "Fisheries" },
    { label: "Pollution control", value: "Pollution control" },
    { label: "Multipurpose", value: "Multipurpose" },
];

const qualityOptions = [
    { label: "1: Verified", value: "1: Verified" },
    { label: "2: Good", value: "2: Good" },
    { label: "3: Fair", value: "3: Fair" },
    { label: "4: Poor", value: "4: Poor" },
    { label: "5: Unreliable", value: "5: Unreliable" },
];

const powerMwRanges = [
    { label: "无发电 (0 MW)", value: "eq:0" },
    { label: "0-10 MW", value: "gt:0,lte:10" },
    { label: "10-100 MW", value: "gt:10,lte:100" },
    { label: "100-500 MW", value: "gt:100,lte:500" },
    { label: ">500 MW", value: "gt:500" },
];

const damHgtRanges = [
    { label: "<20 m", value: "lt:20" },
    { label: "20-50 m", value: "gte:20,lte:50" },
    { label: "50-100 m", value: "gte:50,lte:100" },
    { label: ">100 m", value: "gt:100" },
];

const capMcmRanges = [
    { label: "<1 百万m³", value: "lt:1" },
    { label: "1-10 百万m³", value: "gte:1,lte:10" },
    { label: "10-100 百万m³", value: "gte:10,lte:100" },
    { label: "100-1000 百万m³", value: "gte:100,lte:1000" },
    { label: ">1000 百万m³", value: "gt:1000" },
];

const areaSkmRanges = [
    { label: "<1 km²", value: "lt:1" },
    { label: "1-10 km²", value: "gte:1,lte:10" },
    { label: "10-100 km²", value: "gte:10,lte:100" },
    { label: ">100 km²", value: "gt:100" },
];

const depthRanges = [
    { label: "<10 m", value: "lt:10" },
    { label: "10-50 m", value: "gte:10,lte:50" },
    { label: "50-100 m", value: "gte:50,lte:100" },
    { label: ">100 m", value: "gt:100" },
];

const barrierFilterFields = [
    {
        key: "damType",
        label: "大坝类型",
        type: "multiSelect",
        options: damTypeOptions,
    },
    {
        key: "powerMw",
        label: "发电功率(MW)",
        type: "rangeSelect",
        ranges: powerMwRanges,
    },
    {
        key: "mainBasin",
        label: "主要流域",
        type: "multiSelect",
        options: mainBasinOptions,
    },
    {
        key: "mainUse",
        label: "主要用途",
        type: "multiSelect",
        options: mainUseOptions,
    },
    {
        key: "quality",
        label: "数据质量",
        type: "multiSelect",
        options: qualityOptions,
    },
    {
        key: "yearDam",
        label: "建成年份",
        type: "yearRange",
    },
    {
        key: "country",
        label: "国家/地区",
        type: "multiSelect",
        options: countryOptions,
    },
    {
        key: "damHgtM",
        label: "大坝高度(m)",
        type: "rangeSelect",
        ranges: damHgtRanges,
    },
];

const reservoirFilterFields = [
    {
        key: "capMcm",
        label: "库容(百万m³)",
        type: "rangeSelect",
        ranges: capMcmRanges,
    },
    {
        key: "areaSkm",
        label: "表面积(km²)",
        type: "rangeSelect",
        ranges: areaSkmRanges,
    },
    {
        key: "mainBasin",
        label: "主要流域",
        type: "multiSelect",
        options: mainBasinOptions,
    },
    {
        key: "mainUse",
        label: "主要用途",
        type: "multiSelect",
        options: mainUseOptions,
    },
    {
        key: "quality",
        label: "数据质量",
        type: "multiSelect",
        options: qualityOptions,
    },
    {
        key: "yearDam",
        label: "建成年份",
        type: "yearRange",
    },
    {
        key: "country",
        label: "国家/地区",
        type: "multiSelect",
        options: countryOptions,
    },
    {
        key: "depthM",
        label: "水库深度(m)",
        type: "rangeSelect",
        ranges: depthRanges,
    },
];

const activeFilterFields = computed(() =>
    dataType.value === "barrier" ? barrierFilterFields : reservoirFilterFields,
);

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
    const selected = filters[key];
    if (!selected || selected.length === 0) return "全部";
    if (selected.length === 1) return selected[0];
    return `已选 ${selected.length} 项`;
};

// 单选区间下拉辅助
const getRangeSelectText = (key, ranges) => {
    const val = filters[key];
    if (!val) return "全部";
    const found = ranges.find((r) => r.value === val);
    return found ? found.label : "全部";
};

const selectRange = (key, value) => {
    filters[key] = value;
    openDropdown.value = "";
};

const onYearInput = (field, event) => {
    const raw = event.target.value.replace(/\D/g, "").slice(0, 4);
    event.target.value = raw;
    filters[field] = raw ? parseInt(raw) : null;
};

const barrierChartConfigs = [
    { title: "大坝类型占比", field: "dam_type" },
    { title: "发电功率等级占比", field: "power_mw", isNumericRange: true },
    { title: "主要用途占比", field: "main_use" },
    { title: "数据质量评级占比", field: "quality" },
    { title: "建成年代区间占比", field: "year_dam", isYearRange: true },
    { title: "所在国家/地区占比", field: "country" },
];

const reservoirChartConfigs = [
    { title: "库容等级占比", field: "cap_mcm", isNumericRange: true },
    { title: "表面积等级占比", field: "area_skm", isNumericRange: true },
    { title: "主要用途占比", field: "main_use" },
    { title: "数据质量评级占比", field: "quality" },
    { title: "建成年代区间占比", field: "year_dam", isYearRange: true },
    { title: "所在国家/地区占比", field: "country" },
];

const chartConfigs = ref([...barrierChartConfigs]);
const chartInstances = [];
const chartRefs = [];

const setChartRef = (el, index) => {
    if (el) {
        chartRefs[index] = el;
    }
};

// 切换大坝/水库数据类型
const toggleDataType = () => {
    dataType.value = dataType.value === "barrier" ? "reservoir" : "barrier";
};

// 监听数据类型变化时切换图表配置并重置筛选
watch(dataType, (newType) => {
    chartConfigs.value =
        newType === "barrier"
            ? [...barrierChartConfigs]
            : [...reservoirChartConfigs];
    resetFilters();
    nextTick(() => {
        chartConfigs.value.forEach((config, index) => {
            // 更新图表为无数据状态
            renderPieChart(index, [], config.title);
        });
    });
});

const resetFilters = () => {
    filters.damType = [];
    filters.mainBasin = [];
    filters.country = [];
    filters.mainUse = [];
    filters.quality = [];
    filters.yearFrom = null;
    filters.yearTo = null;
    filters.powerMw = "";
    filters.damHgtM = "";
    filters.capMcm = "";
    filters.areaSkm = "";
    filters.depthM = "";
    openDropdown.value = "";
    totalCount.value = 0;
};

// 查询统计数据 - 仅UI模拟
const fetchStats = async () => {
    isLoading.value = true;
    console.log("执行查询，当前筛选条件：", filters);

    // 模拟异步请求
    setTimeout(() => {
        isLoading.value = false;
        totalCount.value = Math.floor(Math.random() * 5000) + 100;
        // 模拟图表刷新
        chartConfigs.value.forEach((config, index) => {
            renderPieChart(index, [], config.title);
        });
    }, 800);
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
        chartConfigs.value.forEach((config, index) => {
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
