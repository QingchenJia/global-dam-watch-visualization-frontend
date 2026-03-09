import axios from "axios";
import { API_ENDPOINT } from "../configs/api.js";
import { CHART_CONFIG } from "../configs/chart.js";
import {
    loadBarrierEntity,
    loadReservoirEntity,
    clearAllEntities,
    getAllEntities,
} from "./earth.js";
import { rotateEarth, computeCenter } from "../utils/camera.js";

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
        params.damLenM = form.damLenM;
    }
    if (
        form.damHgtM !== "" &&
        form.damHgtM !== null &&
        form.damHgtM !== undefined
    ) {
        params.damHgtM = form.damHgtM;
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
        params.capMcm = form.capMcm;
    }
    if (
        form.areaSkm !== "" &&
        form.areaSkm !== null &&
        form.areaSkm !== undefined
    ) {
        params.areaSkm = form.areaSkm;
    }
    if (
        form.depthM !== "" &&
        form.depthM !== null &&
        form.depthM !== undefined
    ) {
        params.depthM = form.depthM;
    }

    return params;
}

export function parseStatsChartData(statsData, type) {
    const config = CHART_CONFIG[type];
    return config.map((chartItem) => {
        const raw = statsData[chartItem.field];
        if (!raw || !Array.isArray(raw) || raw.length === 0) {
            return [];
        }

        return raw.map((dataItem) => ({
            name: dataItem.name ?? dataItem.label ?? String(dataItem.key),
            value: dataItem.value ?? dataItem.count ?? 0,
        }));
    });
}

/*
 * 提交数据统计条件筛选表单和数据类型
 * 统计符合条件的数据总数和各统计维度的分布数据
 * */
export async function dataStats({ form, type }) {
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

export async function dataSync(viewer, { form, type }, emit) {
    clearAllEntities(viewer);

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

    const entities = Array.isArray(res.data.data?.entities)
        ? res.data.data.entities
        : Array.isArray(res.data.data)
          ? res.data.data
          : [];

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

    await rotateEarth(viewer, computeCenter(getAllEntities(viewer)));
}
