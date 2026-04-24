import axios from "axios";
import { reactive, computed } from "vue";
import { API_ENDPOINT } from "../configs/api.js";
import { CHART_CONFIG } from "../configs/chart.js";
import {
    loadBarrierEntity,
    loadReservoirEntity,
    clearAllEntities,
    getAllEntities,
} from "./earth.js";
import { rotateEarth, computeCenter } from "../utils/camera.js";

const FILTER_VALUE_KEY = "__filterValueKey";

function stripFilterValueKey(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return value;
    }

    const { [FILTER_VALUE_KEY]: _filterValueKey, ...rest } = value;
    return rest;
}

function commonParamsCheck(params, form) {
    if (form.mainBasin && form.mainBasin.length > 0) {
        params.mainBasin = form.mainBasin;
    }
    if (form.mainUse && form.mainUse.length > 0) {
        params.mainUse = form.mainUse;
    }
    if (form.quality && form.quality.length > 0) {
        params.quality = form.quality;
    }
    if (form.country && form.country.length > 0) {
        params.country = form.country;
    }
    if (form.year && form.year[0] != null && form.year[1] != null) {
        params.year = form.year;
    }
}

function buildBarrierForm(form) {
    const params = {};
    commonParamsCheck(params, form);

    if (form.damType && form.damType.length > 0) {
        params.damType = form.damType;
    }
    if (
        form.damLenM !== "" &&
        form.damLenM !== null &&
        form.damLenM !== undefined
    ) {
        params.damLenM = stripFilterValueKey(form.damLenM);
    }
    if (
        form.damHgtM !== "" &&
        form.damHgtM !== null &&
        form.damHgtM !== undefined
    ) {
        params.damHgtM = stripFilterValueKey(form.damHgtM);
    }

    return params;
}

function buildReservoirForm(form) {
    const params = {};
    commonParamsCheck(params, form);

    if (
        form.capMcm !== "" &&
        form.capMcm !== null &&
        form.capMcm !== undefined
    ) {
        params.capMcm = stripFilterValueKey(form.capMcm);
    }
    if (
        form.areaSkm !== "" &&
        form.areaSkm !== null &&
        form.areaSkm !== undefined
    ) {
        params.areaSkm = stripFilterValueKey(form.areaSkm);
    }
    if (
        form.depthM !== "" &&
        form.depthM !== null &&
        form.depthM !== undefined
    ) {
        params.depthM = stripFilterValueKey(form.depthM);
    }

    return params;
}

// 解析统计数据以适配图表组件
export function parseStatsChartData(statsData, type) {
    const config = CHART_CONFIG[type];
    // 适配后端返回的统计数据格式
    // 提取图表需要的name和value字段
    return config.map((chartItem) => {
        const raw = statsData[chartItem.field];
        // 如果数据格式不正确则返回空数组避免图表组件报错
        if (!raw || !Array.isArray(raw) || raw.length === 0) {
            return [];
        }

        return raw.map((dataItem) => ({
            name: dataItem.name ?? dataItem.label ?? String(dataItem.key),
            value: dataItem.value ?? dataItem.count ?? 0,
        }));
    });
}

// 提交数据统计条件筛选表单和数据类型
// 统计符合条件的数据总数和各统计维度的分布数据
export async function dataStats(form, type) {
    switch (type) {
        case "barrier":
            form = buildBarrierForm(form);
            break;
        case "reservoir":
            form = buildReservoirForm(form);
            break;
        default:
            throw new Error(`未知统计类型: ${type}`);
    }
    const url = API_ENDPOINT.stats[type];
    const res = await axios.post(url, form);

    if (res.data.code !== 1) {
        throw new Error(res.data.message || "统计请求失败");
    }

    const statsData = res.data.data;
    const total = statsData.total ?? 0;
    const chartDataList = parseStatsChartData(statsData, type);

    return { total, chartDataList };
}

export async function dataSync(form, type) {
    switch (type) {
        case "barrier":
            form = buildBarrierForm(form);
            break;
        case "reservoir":
            form = buildReservoirForm(form);
            break;
        default:
            throw new Error(`未知统计类型:${type}`);
    }

    const url = API_ENDPOINT.sync[type];
    const res = await axios.post(url, form);

    if (res.data.code !== 1) {
        throw new Error(res.data.message || "地图同步请求失败");
    }

    return Array.isArray(res.data.data?.entities)
        ? res.data.data.entities
        : Array.isArray(res.data.data)
          ? res.data.data
          : [];
}

export async function mapUpdate(form, type, viewer, emit) {
    // 根据表单条件请求符合条件的实体数据
    const entities = await dataSync(form, type);

    clearAllEntities(viewer);

    switch (type) {
        case "barrier":
            entities.forEach((entity) => loadBarrierEntity(viewer, entity));
            break;
        case "reservoir":
            entities.forEach((entity) => loadReservoirEntity(viewer, entity));
            break;
        default:
            throw new Error(`未知统计类型:${type}`);
    }

    // 等待实体同步完成后再收起面板切回三维地球视图
    emit("request-close");

    await rotateEarth(viewer, computeCenter(getAllEntities()));

    return entities;
}

export const createBarrierFormState = () => ({
    damType: [],
    damLenM: "",
    mainBasin: [],
    mainUse: [],
    quality: [],
    year: [],
    country: [],
    damHgtM: "",
});

export const createReservoirFormState = () => ({
    capMcm: "",
    areaSkm: "",
    mainBasin: [],
    mainUse: [],
    quality: [],
    year: [],
    country: [],
    depthM: "",
});

// 使用单例模式保存状态确保多组件共享同一份数据
const state = reactive({
    dataType: "barrier",
    barrier: createBarrierFormState(),
    reservoir: createReservoirFormState(),
});

export function filterManager() {
    // 切换数据类型
    const setDataType = (type) => {
        if (type !== "barrier" && type !== "reservoir") return;
        state.dataType = type;
    };

    // 获取当前激活的表单
    const activeForm = computed(() => state[state.dataType]);

    // 重置当前类型的表单
    const resetForm = () => {
        let defaults;
        switch (state.dataType) {
            case "barrier":
                defaults = createBarrierFormState();
                break;
            case "reservoir":
                defaults = createReservoirFormState();
                break;
            default:
                return;
        }
        Object.assign(state[state.dataType], defaults);
    };

    return {
        dataType: computed({
            get: () => state.dataType,
            set: setDataType,
        }),
        activeForm,
        form: state,
        setDataType,
        resetForm,
    };
}
