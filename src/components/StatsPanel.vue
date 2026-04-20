<template>
    <section class="stats-panel hud-card">
        <div class="stats-panel__header">
            <div class="quick-panel__title">
                <span class="quick-panel__title-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                        <path
                            d="M4 12.5 12 4l8 8.5-8 7.5-8-7.5zm5.2 0L12 15.1l2.8-2.6L12 9.4z"
                        />
                    </svg>
                </span>
                <div class="quick-panel__title-text">
                    <h2 class="hud-card-title">统计分析</h2>
                </div>
            </div>
        </div>

        <div class="stats-panel__grid">
            <ChartCard
                v-for="(chart, index) in chartConfig"
                :key="chart.field"
                :title="chart.title"
            >
                <div
                    class="stats-panel__chart"
                    :ref="(el) => setChartRef(el, index)"
                ></div>
            </ChartCard>
        </div>
    </section>
</template>

<script setup>
import { nextTick, onMounted, onUnmounted, watch } from "vue";
import * as echarts from "echarts";
import ChartCard from "./ChartCard.vue";
import { useDashboard } from "../hooks/dashboard.js";

const props = defineProps({
    show: {
        type: Boolean,
        default: true,
    },
});

const { chartConfig, chartDataList, dataType, registerPngExporter } =
    useDashboard();

const chartRefs = [];
const chartInstances = [];

function setChartRef(el, index) {
    if (el) {
        chartRefs[index] = el;
    }
}

function getChartData(index) {
    const source = chartDataList.value[index];
    return Array.isArray(source) ? source : [];
}

function buildLegendFormatter(data) {
    const total = data.reduce((sum, item) => sum + Number(item.value || 0), 0);

    return (name) => {
        const current = data.find((item) => item.name === name);
        const percent =
            total > 0
                ? `${((Number(current?.value || 0) / total) * 100).toFixed(1)}%`
                : "--";

        return `{name|${name}} {value|${percent}}`;
    };
}

function renderPieChart(index) {
    const dom = chartRefs[index];
    if (!dom) {
        return;
    }

    if (chartInstances[index]) {
        chartInstances[index].dispose();
    }

    const chart = echarts.init(dom);
    chartInstances[index] = chart;

    const data = getChartData(index);
    const chartData =
        data.length > 0
            ? data
            : [
                  {
                      name: "暂无数据",
                      value: 1,
                      itemStyle: {
                          color: "rgba(91, 126, 160, 0.45)",
                      },
                  },
              ];

    chart.setOption({
        backgroundColor: "transparent",
        color: [
            "#2f8fff",
            "#41d4b4",
            "#ffd166",
            "#ff8f5a",
            "#a66bff",
            "#5de2ff",
            "#ff5f6d",
        ],
        tooltip: {
            trigger: "item",
            formatter: "{b}<br/>{c} ({d}%)",
            backgroundColor: "rgba(3, 14, 28, 0.94)",
            borderColor: "rgba(95, 215, 255, 0.28)",
            textStyle: {
                color: "#eaf9ff",
            },
        },
        legend: {
            type: "scroll",
            orient: "horizontal",
            left: "center",
            top: "66%",
            itemWidth: 10,
            itemHeight: 10,
            itemGap: 12,
            formatter: buildLegendFormatter(data),
            textStyle: {
                color: "#bfdff8",
                fontSize: 10,
                lineHeight: 14,
                rich: {
                    name: {
                        width: 56,
                        color: "#bfdff8",
                        fontSize: 10,
                    },
                    value: {
                        width: 34,
                        align: "right",
                        color: "#f0fbff",
                        fontSize: 10,
                        fontWeight: 700,
                    },
                },
            },
        },
        series: [
            {
                type: "pie",
                center: ["50%", "35%"],
                radius: ["32%", "50%"],
                avoidLabelOverlap: true,
                label: {
                    show: false,
                },
                labelLine: {
                    show: false,
                },
                itemStyle: {
                    borderColor: "rgba(5, 14, 28, 0.96)",
                    borderWidth: 2,
                    borderRadius: 6,
                },
                emphasis: {
                    scale: true,
                    scaleSize: 4,
                    itemStyle: {
                        shadowBlur: 16,
                        shadowColor: "rgba(41, 143, 255, 0.34)",
                    },
                },
                data: chartData,
            },
        ],
    });
}

function renderAllCharts() {
    nextTick(() => {
        chartConfig.value.forEach((_, index) => {
            renderPieChart(index);
        });
    });
}

function handleResize() {
    chartInstances.forEach((chart) => {
        if (chart && !chart.isDisposed()) {
            chart.resize();
        }
    });
}

async function exportChartsPng() {
    const timestamp = new Date().toISOString().replace(/[.:]/g, "-");

    for (let index = 0; index < chartInstances.length; index += 1) {
        const chart = chartInstances[index];
        const title = chartConfig.value[index]?.title || `chart-${index + 1}`;

        if (!chart || chart.isDisposed()) {
            continue;
        }

        const dataUrl = chart.getDataURL({
            type: "png",
            pixelRatio: 2,
            backgroundColor: "#07172d",
        });

        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = `${dataType.value}-${title.replace(/[\\/:*?"<>|]/g, "-")}-${timestamp}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

let unregisterPngExporter = null;

watch(
    [chartConfig, chartDataList, () => props.show],
    ([, , visible]) => {
        if (visible) {
            renderAllCharts();
        }
    },
    { deep: true, immediate: true },
);

onMounted(() => {
    unregisterPngExporter = registerPngExporter(exportChartsPng);
    window.addEventListener("resize", handleResize);

    if (props.show) {
        renderAllCharts();
    }
});

onUnmounted(() => {
    if (typeof unregisterPngExporter === "function") {
        unregisterPngExporter();
    }

    window.removeEventListener("resize", handleResize);

    chartInstances.forEach((chart) => {
        if (chart && !chart.isDisposed()) {
            chart.dispose();
        }
    });
});
</script>
