import { computed, ref, watch } from "vue";
import { CHART_CONFIG } from "../configs/chart.js";
import { EXPORT_CSV_FIELDS } from "../configs/field.js";
import { dataStats, filterManager, mapUpdate } from "./stats.js";

const { dataType, activeForm, setDataType: setSharedDataType, resetForm } =
    filterManager();

const isLoading = ref(false);
const isSyncing = ref(false);
const totalCount = ref(0);
const syncedEntities = ref([]);
const chartDataList = ref(createEmptyChartData(dataType.value));
const lastQueryAt = ref(null);
const lastSyncAt = ref(null);
const pngExporter = ref(null);

function createEmptyChartData(type) {
    return (CHART_CONFIG[type] || []).map(() => []);
}

function resetStatsState() {
    totalCount.value = 0;
    chartDataList.value = createEmptyChartData(dataType.value);
}

watch(dataType, (nextType) => {
    chartDataList.value = createEmptyChartData(nextType);
    totalCount.value = 0;
});

function formatStamp(value) {
    if (!(value instanceof Date)) {
        return "--";
    }

    return value.toLocaleString("zh-CN", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    });
}

function buildChartData(type, list) {
    const template = createEmptyChartData(type);

    return template.map((_, index) => {
        const current = list[index];
        return Array.isArray(current) ? current : [];
    });
}

async function fetchStats() {
    isLoading.value = true;

    try {
        const result = await dataStats(activeForm.value, dataType.value);

        totalCount.value = result.total ?? 0;
        chartDataList.value = buildChartData(
            dataType.value,
            result.chartDataList || [],
        );
        lastQueryAt.value = new Date();

        return result;
    } finally {
        isLoading.value = false;
    }
}

async function syncMap(viewer) {
    if (!viewer) {
        return [];
    }

    isSyncing.value = true;

    try {
        const entities = await mapUpdate(
            activeForm.value,
            dataType.value,
            viewer,
            () => {},
        );

        syncedEntities.value = Array.isArray(entities) ? entities : [];
        lastSyncAt.value = new Date();
        window.dispatchEvent(new CustomEvent("map-sync-completed"));

        return syncedEntities.value;
    } finally {
        isSyncing.value = false;
    }
}

function setDataType(type) {
    if (type !== "barrier" && type !== "reservoir") {
        return;
    }

    setSharedDataType(type);
}

function resetDashboardFilters() {
    resetForm();
    resetStatsState();
}

function toCsvCell(value) {
    if (value === null || value === undefined) {
        return "";
    }

    const normalized =
        typeof value === "object" ? JSON.stringify(value) : String(value);

    return `"${normalized.replace(/"/g, '""')}"`;
}

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
        if (!row || typeof row !== "object") {
            return;
        }

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
        lines.push(
            headers.map((header) => toCsvCell(row?.[header] ?? "")).join(","),
        );
    });

    return lines.join("\n");
}

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
    const csvContent = buildCsvContent(syncedEntities.value);

    if (!csvContent) {
        return;
    }

    const timestamp = new Date().toISOString().replace(/[.:]/g, "-");
    const fileName = `${dataType.value}-sync-entities-${timestamp}.csv`;

    triggerDownload(`\uFEFF${csvContent}`, fileName, "text/csv;charset=utf-8;");
}

function registerPngExporter(exporter) {
    pngExporter.value = exporter;

    return () => {
        if (pngExporter.value === exporter) {
            pngExporter.value = null;
        }
    };
}

async function exportChartsPng() {
    if (typeof pngExporter.value === "function") {
        await pngExporter.value();
    }
}

export function useDashboard() {
    return {
        dataType,
        activeForm,
        isLoading,
        isSyncing,
        totalCount,
        syncedEntities,
        chartDataList,
        chartConfig: computed(() => CHART_CONFIG[dataType.value] || []),
        lastQueryLabel: computed(() => formatStamp(lastQueryAt.value)),
        lastSyncLabel: computed(() => formatStamp(lastSyncAt.value)),
        setDataType,
        fetchStats,
        syncMap,
        resetDashboardFilters,
        exportSyncCsv,
        exportChartsPng,
        registerPngExporter,
        resetStatsState,
    };
}
