import axios from "axios";
import * as Cesium from "cesium";
import { API_ENDPOINT } from "../configs/api.js";
import { FIELD_MAP } from "../configs/field.js";
import { enableEntityClustering } from "../utils/cluster.js";

let barrierDataSource = null;

function getReservoirEntities(viewer) {
    if (!viewer) return [];
    return viewer.entities.values.filter((entity) => {
        const dataType = entity.properties?.dataType;
        if (!dataType) return false;
        return typeof dataType.getValue === "function"
            ? dataType.getValue() === "reservoir"
            : dataType === "reservoir";
    });
}

// 获取或创建大坝自定义数据源
export function getBarrierDataSource(viewer) {
    if (!barrierDataSource) {
        barrierDataSource = new Cesium.CustomDataSource("barriers");
        viewer.dataSources.add(barrierDataSource);
        enableEntityClustering(barrierDataSource, viewer);
    }
    return barrierDataSource;
}

export function clearAllEntities(viewer) {
    viewer.entities.removeAll();
    if (barrierDataSource) {
        barrierDataSource.entities.removeAll();
    }
}

// 获取所有实体
// 包括大坝和水库
export function getAllEntities(viewer) {
    const result = [...viewer.entities.values];
    if (barrierDataSource) {
        result.push(...barrierDataSource.entities.values);
    }
    return result;
}

// 切换大坝数据源的可见性
export function setBarrierDataSourceVisible(show) {
    if (barrierDataSource) {
        barrierDataSource.show = show;
    }
}

// 按年份过滤大坝实体
export function filterEntitiesByYear(maxYear) {
    if (!barrierDataSource) return;
    const entities = barrierDataSource.entities.values;
    for (let i = 0; i < entities.length; i++) {
        const entity = entities[i];
        const yearProp = entity.properties && entity.properties.yearDam;
        const year = yearProp ? yearProp.getValue() : null;
        if (year !== null && year !== -99 && year !== "" && year !== " ") {
            entity.show = Number(year) <= maxYear;
        } else {
            // 无建成年份的大坝始终显示
            entity.show = true;
        }
    }
}

// 按年份过滤指定类型实体
export function filterEntitiesByYearByType(maxYear, type, viewer) {
    if (type === "barrier") {
        filterEntitiesByYear(maxYear);
        return;
    }

    if (type !== "reservoir") return;
    const entities = getReservoirEntities(viewer);
    for (let i = 0; i < entities.length; i++) {
        const entity = entities[i];
        const yearProp = entity.properties && entity.properties.yearDam;
        const year = yearProp ? yearProp.getValue() : null;
        if (year !== null && year !== -99 && year !== "" && year !== " ") {
            entity.show = Number(year) <= maxYear;
        } else {
            entity.show = true;
        }
    }
}

// 关闭时间轴时恢复所有大坝显示
export function restoreAllEntities() {
    if (!barrierDataSource) return;
    const entities = barrierDataSource.entities.values;
    for (let i = 0; i < entities.length; i++) {
        entities[i].show = true;
    }
}

// 关闭时间轴时按类型恢复显示
export function restoreAllEntitiesByType(type, viewer) {
    if (type === "barrier") {
        restoreAllEntities();
        return;
    }

    if (type !== "reservoir") return;
    const entities = getReservoirEntities(viewer);
    for (let i = 0; i < entities.length; i++) {
        entities[i].show = true;
    }
}

export function loadBarrierEntity(viewer, item) {
    const gdwId = item.gdwId;
    const type = item.damType || "Unknown";
    const name = item.damName || "Barrier #" + gdwId;

    let position = null;
    const geoResult = parseGeometry(item.wkbGeometry);

    if (geoResult && geoResult.type === "Point") {
        position = geoResult.data;
    }

    if (!position) return;

    let pointColor = Cesium.Color.RED;
    let pointSize = 5;

    // 根据大坝类型调整显示颜色
    if (type.includes("Lake Control Dam")) {
        pointColor = Cesium.Color.GOLD;
    } else if (type.includes("Low Permeable Dam")) {
        pointColor = Cesium.Color.CYAN;
    } else if (type.includes("Lock")) {
        pointColor = Cesium.Color.BLUE;
    }

    const yearDam = item.yearDam || null;

    const bds = getBarrierDataSource(viewer);
    bds.entities.add({
        id: "b-" + gdwId,
        name: name,
        position: position,
        properties: {
            dataType: "barrier",
            gdwId: gdwId,
            damType: type,
            yearDam: yearDam,
        },
        point: {
            pixelSize: pointSize,
            color: pointColor,
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 1,
            scaleByDistance: new Cesium.NearFarScalar(1.0e4, 1.05, 2.0e7, 0.05),
            translucencyByDistance: new Cesium.NearFarScalar(
                1.0e4,
                1.0,
                2.0e7,
                0.75,
            ),
        },
    });
}

export function loadReservoirEntity(viewer, item) {
    const gdwId = item.gdwId;
    const name = item.resName || "Reservoir #" + gdwId;

    const geoResult = parseGeometry(item.wkbGeometry);

    if (geoResult && geoResult.type === "MultiPolygon") {
        const hierarchies = geoResult.data;
        const hierarchy = hierarchies[0];

        viewer.entities.add({
            // 显式定义水库id
            id: "r-" + gdwId,
            name: name,
            // 存储水库关键属性
            properties: {
                dataType: "reservoir",
                gdwId: gdwId,
                yearDam: item.yearDam || null,
            },
            polygon: {
                hierarchy: hierarchy,
                material: Cesium.Color.CYAN.withAlpha(0.7),
                outline: true,
                outlineColor: Cesium.Color.LIGHTBLUE,
                // 多边形色块贴地显示
                height: 0,
            },
        });
    }
}

export function showLightBarrier(viewer) {
    const url = API_ENDPOINT.location.barrier;

    axios
        .get(url)
        .then((res) => {
            if (res.data.code === 1 && Array.isArray(res.data.data)) {
                const data = res.data.data;
                // 流式遍历加载渲染大坝实体
                data.forEach((item) => {
                    loadBarrierEntity(viewer, item);
                });
            }
        })
        .catch((err) => console.error(err));
}

export function showLightReservoir(viewer) {
    const url = API_ENDPOINT.location.reservoir;

    axios
        .get(url)
        .then((res) => {
            if (res.data.code === 1 && Array.isArray(res.data.data)) {
                const data = res.data.data;
                // 流式遍历加载渲染水库实体
                data.forEach((item) => {
                    loadReservoirEntity(viewer, item);
                });
            }
        })
        .catch((err) => console.error(err));
}

export function entitySelectedEvent(viewer) {
    // 监听实体选中变化事件
    viewer.selectedEntityChanged.addEventListener(function (entity) {
        if (entity) {
            // 显示加载中提示
            entity.description =
                '<div style="padding:10px;">正在从服务器获取详细数据...</div>';

            if (
                entity.properties &&
                entity.properties.gdwId &&
                entity.properties.dataType
            ) {
                const id = entity.properties.gdwId.getValue();
                const type = entity.properties.dataType.getValue();
                queryDescription(entity, id, type);
            } else {
                // 无法获取实体详细数据时的提示
                entity.description =
                    '<div style="padding:10px;">暂无详细数据</div>';
            }
        }
    });
}

function queryDescription(entity, id, type) {
    let url = API_ENDPOINT.detail[type] + id;
    let mapping = FIELD_MAP[type];

    axios
        .get(url)
        .then((res) => {
            if (res.data.code === 1) {
                const entireInfo = res.data.data;

                // 侧边详情栏内容生成并赋值
                entity.description = generateDescriptionForm(
                    entireInfo,
                    mapping,
                );
            } else {
                entity.description = `<div style="color:red; padding:10px;">获取数据失败:${res.data.message}</div>`;
            }
        })
        .catch((err) => {
            console.error("详情请求失败", err);
            entity.description =
                '<div style="color:red; padding:10px;">网络请求错误</div>';
        });
}

function generateDescriptionForm(data, mapping) {
    let html =
        '<table class="cesium-infoBox-defaultTable" style="table-layout:fixed; width:100%;"><tbody>';
    for (const key in mapping) {
        const label = mapping && mapping[key] ? mapping[key] : key;
        // 针对无效数据进行统一处理
        if (
            data[key] === null ||
            data[key] === -99 ||
            data[key] === "" ||
            data[key] === " "
        ) {
            data[key] = "暂无数据";
        }
        html += `<tr><th style="text-align:left; vertical-align:middle; width:160px; min-width:160px; max-width:160px;">${label}</th><td style="width:240px; min-width:240px; max-width:240px; white-space:normal; overflow-wrap:anywhere; word-break:break-word; vertical-align:middle;">${data[key]}</td></tr>`;
    }

    html += "</tbody></table>";
    return html;
}

// 解析数据的地理信息字段
// 分别处理大坝的点信息和水库的多边形信息
// 水库多边形选取第一个多边形环作为外环进行渲染
function parseGeometry(rawGeometry) {
    if (!rawGeometry) return null;

    let geometry = rawGeometry;

    if (typeof geometry === "string") {
        try {
            if (geometry.trim().startsWith("{")) {
                // 地理位置信息字符串转换为json格式
                geometry = JSON.parse(geometry);
            } else {
                return null;
            }
        } catch (e) {
            return null;
        }
    }

    if (geometry.type === "Point" && Array.isArray(geometry.coordinates)) {
        const coords = geometry.coordinates;
        return {
            type: "Point",
            data: Cesium.Cartesian3.fromDegrees(coords[0], coords[1]),
        };
    } else if (geometry.type === "MultiPolygon") {
        const polygons = geometry.coordinates;
        if (polygons && polygons.length > 0) {
            // 取每个多边形的第一个环作为外环
            const hierarchies = polygons.map((polygonRings) => {
                return new Cesium.PolygonHierarchy(
                    Cesium.Cartesian3.fromDegreesArray(polygonRings[0].flat()),
                );
            });

            return {
                type: "MultiPolygon",
                data: hierarchies,
            };
        }
    }

    return null;
}
