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
                    :disabled="isLoading || isSyncing"
                >
                    <span v-if="isLoading" class="btn-loading"></span>
                    <span v-else>查询统计</span>
                </button>
                <button
                    class="map-sync-btn"
                    @click="fetchSync"
                    :disabled="isLoading || isSyncing"
                >
                    <span v-if="isSyncing" class="btn-loading"></span>
                    <span v-else>地图同步</span>
                </button>
                <div class="export-btn-group">
                    <button
                        class="export-btn"
                        @click="exportSyncCsv"
                        :disabled="
                            isLoading ||
                            isSyncing ||
                            syncedEntities.length === 0
                        "
                    >
                        导出CSV
                    </button>
                    <button
                        class="export-btn"
                        @click="exportChartsPng"
                        :disabled="isLoading || isSyncing"
                    >
                        导出PNG
                    </button>
                </div>
            </div>
        </div>

        <div class="stats-body">
            <!-- 条件筛选表单 -->
            <div class="stats-filter">
                <h3 class="filter-title">筛选条件</h3>

                <template v-for="field in activeFormField" :key="field.key">
                    <div
                        class="filter-group"
                        v-if="
                            field.type === 'multiSelect' ||
                            field.type === 'singleSelect'
                        "
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
                                    getSelectText(field)
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
                                    <!-- 多选复选框 -->
                                    <template
                                        v-if="field.type === 'multiSelect'"
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
                                    </template>

                                    <!-- 单选列表项 -->
                                    <template v-else>
                                        <div
                                            class="range-select-option"
                                            :class="{
                                                selected: isSingleSelected(
                                                    field.key,
                                                    '',
                                                ),
                                            }"
                                            @click="selectSingle(field.key, '')"
                                        >
                                            全部
                                        </div>
                                        <div
                                            v-for="opt in field.options"
                                            :key="opt.value"
                                            class="range-select-option"
                                            :class="{
                                                selected: isSingleSelected(
                                                    field.key,
                                                    opt.value,
                                                ),
                                            }"
                                            @click="
                                                selectSingle(
                                                    field.key,
                                                    opt.value,
                                                )
                                            "
                                        >
                                            {{ opt.label }}
                                        </div>
                                    </template>
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
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from "vue";
import * as echarts from "echarts";
import { FORM_FIELD, CHART_CONFIG } from "../configs/chart.js";
import { EXPORT_CSV_FIELDS } from "../configs/field.js";
import { dataStats, mapUpdate, filterManager } from "../hooks/stats.js";

const globalVar = defineProps({
    viewer: {
        type: Object,
        required: true,
    },
    show: {
        type: Boolean,
        default: false,
    },
});
const emit = defineEmits(["request-close"]);

// 引入共享状态和方法
const {
    dataType,
    activeForm,
    setDataType,
    resetForm: resetSharedForm,
} = filterManager();

// 统计面板状态参数
const isLoading = ref(false);
const isSyncing = ref(false);
const totalCount = ref(0);
const syncedEntities = ref([]);

// 读取当前数据类型对应的字段配置
const activeFormField = computed(() => FORM_FIELD[dataType.value]);

const openDropdown = ref("");
const dropdownStyle = ref({});
const triggerRefs = {};

function setTriggerRef(el, key) {
    if (el) {
        triggerRefs[key] = el;
    }
}

function toggleDropdown(key) {
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
}

function closeAllDropdowns() {
    openDropdown.value = "";
}

// 统一获取下拉选择的显示文本
function getSelectText(field) {
    const val = activeForm.value[field.key];
    if (field.type === "multiSelect") {
        if (!val || val.length === 0) return "全部";
        if (val.length === 1) {
            const found = field.options.find((o) => o.value === val[0]);
            return found ? found.label : val[0];
        }
        return `已选 ${val.length} 项`;
    }
    // singleSelect
    if (val === "" || val === undefined || val === null) return "全部";
    const found = field.options.find(
        (o) => JSON.stringify(o.value) === JSON.stringify(val),
    );
    return found ? found.label : "全部";
}

// 判断单选项是否选中
function isSingleSelected(key, value) {
    const val = activeForm.value[key];
    if (value === "") {
        return val === "";
    }
    return JSON.stringify(val) === JSON.stringify(value);
}

// 单选选中某项
function selectSingle(key, value) {
    activeForm.value[key] = value;
    openDropdown.value = "";
}

// 年份输入处理限制为4位数字
function onYearInput(field, event) {
    const raw = event.target.value.replace(/\D/g, "").slice(0, 4);
    event.target.value = raw;
    const val = raw ? parseInt(raw) : null;

    switch (field) {
        case "yearFrom":
            activeForm.value.year[0] = val;
            break;
        case "yearTo":
            activeForm.value.year[1] = val;
            break;
    }
}

const chartConfig = ref([...CHART_CONFIG.barrier]);
const chartInstances = [];
const chartRefs = [];

function setChartRef(el, index) {
    if (el) {
        chartRefs[index] = el;
    }
}

// 手动重置当前面板状态
function handleReset() {
    resetSharedForm();
    openDropdown.value = "";
    totalCount.value = 0;
    syncedEntities.value = [];
}

// 切换大坝或水库数据类型
function toggleDataType() {
    let nextType;
    switch (dataType.value) {
        case "barrier":
            nextType = "reservoir";
            break;
        case "reservoir":
            nextType = "barrier";
            break;
    }
    setDataType(nextType);
    handleReset();
}

// 监听数据类型变化时切换图表配置
watch(
    dataType,
    (newType) => {
        chartConfig.value = [...CHART_CONFIG[newType]];

        // 初始化空图表
        nextTick(() => {
            chartConfig.value.forEach((config, index) => {
                renderPieChart(index, [], config.title);
            });
        });
    },
    { immediate: true },
);

// 查询统计数据
async function fetchStats() {
    isLoading.value = true;
    try {
        const result = await dataStats(activeForm.value, dataType.value);

        totalCount.value = result.total;

        // 将六个图表的数据分别渲染
        result.chartDataList.forEach((data, index) => {
            renderPieChart(index, data);
        });
    } catch (err) {
        console.error("统计查询失败:", err);
        totalCount.value = 0;
        // 请求失败时置为无数据状态
        chartConfig.value.forEach((config, index) => {
            renderPieChart(index, []);
        });
    } finally {
        isLoading.value = false;
    }
}

// 同步地图数据
async function fetchSync() {
    isSyncing.value = true;
    try {
        syncedEntities.value = await mapUpdate(
            activeForm.value,
            dataType.value,
            globalVar.viewer,
            emit,
        );
        window.dispatchEvent(new CustomEvent("map-sync-completed"));
    } catch (err) {
        console.error("地图同步失败:", err);
        syncedEntities.value = [];
    } finally {
        isSyncing.value = false;
    }
}

// 将值转换为CSV单元格格式
function toCsvCell(value) {
    if (value === null || value === undefined) {
        return "";
    }

    // 如果是对象则转换为JSON字符串
    const normalized =
        typeof value === "object" ? JSON.stringify(value) : String(value);
    return `"${normalized.replace(/"/g, '""')}"`;
}

// 构建CSV内容
function buildCsvContent(rows) {
    if (!Array.isArray(rows) || rows.length === 0) {
        return "";
    }

    const isValidValue = (value) => {
        if (value === null || value === undefined) {
            return false;
        }
        if (typeof value === "string") {
            return value.trim() !== "" && value !== "-99";
        }
        if (Array.isArray(value)) {
            return value.length > 0;
        }
        if (typeof value === "object") {
            return Object.keys(value).length > 0;
        }
        return true;
    };

    const fieldLabelMap = EXPORT_CSV_FIELDS[dataType.value] || {};
    const headers = [];
    rows.forEach((row) => {
        if (!row || typeof row !== "object") return;
        Object.keys(row).forEach((key) => {
            if (
                !headers.includes(key) &&
                rows.some((item) => isValidValue(item?.[key]))
            ) {
                headers.push(key);
            }
        });
    });

    if (headers.length === 0) {
        return "";
    }

    const lines = [
        headers
            .map((header) => toCsvCell(fieldLabelMap[header] || header))
            .join(","),
    ];
    rows.forEach((row) => {
        const line = headers
            .map((header) => toCsvCell(row ? row[header] : ""))
            .join(",");
        lines.push(line);
    });

    return lines.join("\n");
}

// 触发浏览器下载
function triggerDownload(content, fileName, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function exportSyncCsv() {
    // 构建CSV内容
    const csvContent = buildCsvContent(syncedEntities.value);
    if (!csvContent) {
        return;
    }

    // 生成文件名
    // 替换冒号和点以避免文件系统问题
    const timestamp = new Date().toISOString().replace(/[.:]/g, "-");
    const fileName = `${dataType.value}-sync-entities-${timestamp}.csv`;

    // 添加BOM头以支持Excel正确识别UTF-8编码
    triggerDownload(`\uFEFF${csvContent}`, fileName, "text/csv;charset=utf-8;");
}

// 将图例文本进行换行以适应导出时的纵向布局
function wrapLegendText(text, maxLength = 12) {
    const source = String(text ?? "");
    if (source.length <= maxLength) {
        return source;
    }

    const wrapped = [];
    for (let i = 0; i < source.length; i += maxLength) {
        wrapped.push(source.slice(i, i + maxLength));
    }
    return wrapped.join("\n");
}

// 裁剪图表导出的DataURL图片
// 去除左右两侧的空白区域
function cropImageDataUrl(dataUrl, leftCropRatio = 0.1, rightCropRatio = 0.3) {
    return new Promise((resolve) => {
        const image = new Image();
        image.onload = () => {
            const width = image.width;
            const height = image.height;

            const sx = Math.max(0, Math.floor(width * leftCropRatio));
            const ex = Math.min(
                width,
                Math.floor(width * (1 - rightCropRatio)),
            );
            const cropWidth = Math.max(1, ex - sx);

            const canvas = document.createElement("canvas");
            canvas.width = cropWidth;
            canvas.height = height;
            const ctx = canvas.getContext("2d");

            if (!ctx) {
                resolve(dataUrl);
                return;
            }

            ctx.drawImage(
                image,
                sx,
                0,
                cropWidth,
                height,
                0,
                0,
                cropWidth,
                height,
            );
            resolve(canvas.toDataURL("image/png"));
        };

        image.onerror = () => resolve(dataUrl);
        image.src = dataUrl;
    });
}

// 导出单个图表为PNG图片
async function exportSingleChartPng(chart, index, timestamp) {
    const baseOption = chart.getOption();
    const legendBase = Array.isArray(baseOption.legend)
        ? baseOption.legend[0] || {}
        : baseOption.legend || {};
    const dataCount = Array.isArray(baseOption.series?.[0]?.data)
        ? baseOption.series[0].data.length
        : 0;
    const chartTitle = chartConfig.value[index]?.title || `chart-${index + 1}`;

    const legendData = Array.isArray(baseOption.series?.[0]?.data)
        ? baseOption.series[0].data
        : [];
    const legendLineCount = Math.max(
        1,
        legendData.reduce((sum, item) => {
            const name = String(item?.name ?? "");
            return sum + Math.max(1, Math.ceil(name.length / 12));
        }, 0),
    );

    // 导出时按图例内容自适应尺寸
    // 避免留白过多
    const exportWidth = 1500;
    const exportHeight = Math.max(
        620,
        190 + legendLineCount * 32 + dataCount * 6,
    );
    const exportDom = document.createElement("div");
    exportDom.style.position = "fixed";
    exportDom.style.left = "-10000px";
    exportDom.style.top = "-10000px";
    exportDom.style.width = `${exportWidth}px`;
    exportDom.style.height = `${exportHeight}px`;
    document.body.appendChild(exportDom);

    const exportChart = echarts.init(exportDom, null, { renderer: "canvas" });

    const exportOption = {
        ...baseOption,
        animation: false,
        tooltip: { show: false },
        title: {
            text: chartTitle,
            left: "center",
            top: 18,
            textStyle: {
                color: "#e8edf7",
                fontSize: 32,
                fontWeight: 600,
            },
        },
        legend: {
            ...legendBase,
            type: "plain",
            orient: "vertical",
            top: 88,
            right: 24,
            bottom: 24,
            width: 500,
            itemWidth: 22,
            itemHeight: 14,
            itemGap: 12,
            textStyle: {
                ...(legendBase.textStyle || {}),
                color: "#dce3f1",
                fontSize: 22,
                lineHeight: 28,
            },
            formatter: (name) => wrapLegendText(name, 12),
        },
        series: (baseOption.series || []).map((series, seriesIndex) => {
            if (seriesIndex !== 0) {
                return series;
            }
            return {
                ...series,
                center: ["32%", "56%"],
                radius: ["30%", "60%"],
            };
        }),
    };

    exportChart.setOption(exportOption, true);

    const dataUrl = exportChart.getDataURL({
        type: "png",
        pixelRatio: 2,
        backgroundColor: "#1f2229",
    });
    const croppedDataUrl = await cropImageDataUrl(dataUrl, 0.1, 0.3);

    const link = document.createElement("a");
    const safeTitle = String(chartTitle).replace(/[\\/:*?"<>|]/g, "-");
    link.href = croppedDataUrl;
    link.download = `${dataType.value}-${safeTitle}-${timestamp}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    exportChart.dispose();
    document.body.removeChild(exportDom);
}

// 导出图表为PNG图片
async function exportChartsPng() {
    const timestamp = new Date().toISOString().replace(/[.:]/g, "-");

    // 依次导出每个图表
    for (let index = 0; index < chartInstances.length; index += 1) {
        const chart = chartInstances[index];
        if (!chart || chart.isDisposed()) {
            continue;
        }

        await exportSingleChartPng(chart, index, timestamp);
    }
}

// 渲染饼图
function renderPieChart(index, data) {
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
}

function initCharts() {
    nextTick(() => {
        chartConfig.value.forEach((config, index) => {
            renderPieChart(index, [], config.title);
        });
    });
}

// 监听面板显示状态
// 首次显示时初始化图表
// 后续显示时调整图表大小
let hasInit = false;
watch(
    () => globalVar.show,
    (newVal) => {
        if (newVal) {
            if (!hasInit) {
                hasInit = true;
                initCharts();
            } else {
                nextTick(() => {
                    handleResize();
                });
            }
        }
    },
);

// 窗口大小变化时重绘图表
function handleResize() {
    chartInstances.forEach((chart) => {
        if (chart && !chart.isDisposed()) {
            chart.resize();
        }
    });
}

onMounted(() => {
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
