import axios from "axios";
import * as Cesium from "cesium";
import { API_ENDPOINT } from "../configs/api.js";
import { enableEntityClustering } from "../utils/cluster.js";

let barrierDataSource, reservoirDataSource;

// 获取或创建大坝自定义数据源
export function getBarrierDataSource(viewer) {
    if (!barrierDataSource) {
        barrierDataSource = new Cesium.CustomDataSource("barrier");
        viewer.dataSources.add(barrierDataSource);
        enableEntityClustering(barrierDataSource, viewer);
    }
    return barrierDataSource;
}

// 获取或创建水库自定义数据源
export function getReservoirDataSource(viewer) {
    if (!reservoirDataSource) {
        reservoirDataSource = new Cesium.CustomDataSource("reservoir");
        viewer.dataSources.add(reservoirDataSource);
    }
    return reservoirDataSource;
}

export function getEntitiesFromDataSource(type) {
    switch (type) {
        case "barrier":
            return barrierDataSource ? barrierDataSource.entities.values : [];
        case "reservoir":
            return reservoirDataSource
                ? reservoirDataSource.entities.values
                : [];
        default:
            return [];
    }
}

export function clearAllEntities(viewer) {
    viewer.entities.removeAll();
    if (barrierDataSource) {
        barrierDataSource.entities.removeAll();
    }
    if (reservoirDataSource) {
        reservoirDataSource.entities.removeAll();
    }
}

// 获取所有实体
// 包括大坝和水库
export function getAllEntities() {
    const result = [];
    if (barrierDataSource) {
        result.push(...barrierDataSource.entities.values);
    }
    if (reservoirDataSource) {
        result.push(...reservoirDataSource.entities.values);
    }
    return result;
}

// 切换指定类型数据源的可见性
export function setDataSourceVisible(type, show) {
    switch (type) {
        case "barrier":
            if (barrierDataSource) {
                barrierDataSource.show = show;
            }
            break;
        case "reservoir":
            if (reservoirDataSource) {
                reservoirDataSource.show = show;
            }
            break;
        default:
            break;
    }
}

function applyYearFilter(entities, maxYear) {
    if (!entities) return;

    for (let i = 0; i < entities.length; i++) {
        const entity = entities[i];
        const yearProp = entity.properties && entity.properties.yearDam;
        const year = yearProp
            ? typeof yearProp.getValue === "function"
                ? yearProp.getValue()
                : yearProp
            : null;

        if (year !== null && year !== -99 && year !== "" && year !== " ") {
            entity.show = Number(year) <= maxYear;
        } else {
            // 无建成年份的实体始终显示
            entity.show = true;
        }
    }
}

// 按年份过滤指定类型实体
export function timeSliderShowEntities(viewer, type, maxYear) {
    switch (type) {
        case "barrier":
            applyYearFilter(getEntitiesFromDataSource(type), maxYear);
            break;
        case "reservoir":
            applyYearFilter(getEntitiesFromDataSource(type), maxYear);
            break;
        default:
            break;
    }

    if (viewer && viewer.scene) {
        viewer.scene.requestRender();
    }
}

// 关闭时间轴时恢复所有实体显示
export function resetEntitiesShow(entities) {
    for (let i = 0; i < entities.length; i++) {
        entities[i].show = true;
    }
}

// 关闭时间轴时按类型恢复显示
export function restoreAllEntitiesByType(type) {
    switch (type) {
        case "barrier":
            resetEntitiesShow(getEntitiesFromDataSource(type));
            break;
        case "reservoir":
            resetEntitiesShow(getEntitiesFromDataSource(type));
            break;
        default:
            break;
    }
}

export function loadBarrierEntity(viewer, item) {
    const gdwId = item.gdwId;
    const name = item.damName || "Barrier #" + gdwId;
    const type = item.damType || "Unknown";

    let position = null;
    const geoResult = parseGeometry(item.wkbGeometry);

    if (geoResult && geoResult.type === "Point") {
        position = geoResult.data;
        if (!position) {
            return;
        }
    }

    let pointColor = Cesium.Color.RED;
    // 根据大坝类型调整显示颜色
    if (type.includes("Lake Control Dam")) {
        pointColor = Cesium.Color.GOLD;
    } else if (type.includes("Low Permeable Dam")) {
        pointColor = Cesium.Color.CYAN;
    } else if (type.includes("Lock")) {
        pointColor = Cesium.Color.BLUE;
    }

    const bds = getBarrierDataSource(viewer);
    bds.entities.add({
        id: "b-" + gdwId,
        name,
        properties: {
            dataType: "barrier",
            gdwId,
            damType: type,
            yearDam: item.yearDam || null,
        },
        position,
        point: {
            pixelSize: 5,
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

    let hierarchy = null;
    const geoResult = parseGeometry(item.wkbGeometry);

    if (geoResult && geoResult.type === "MultiPolygon") {
        hierarchy = geoResult.data[0];
        if (!hierarchy) {
            return;
        }
    }

    const rds = getReservoirDataSource(viewer);
    rds.entities.add({
        // 显式定义水库id
        id: "r-" + gdwId,
        name,
        // 存储水库关键属性
        properties: {
            dataType: "reservoir",
            gdwId,
            yearDam: item.yearDam || null,
        },
        polygon: {
            hierarchy,
            material: Cesium.Color.CYAN.withAlpha(0.7),
            outline: true,
            outlineColor: Cesium.Color.LIGHTBLUE,
            // 多边形色块贴地显示
            height: 0,
        },
    });
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

// 解析数据的地理信息字段
// 分别处理大坝的点信息和水库的多边形信息
// 水库多边形选取第一个多边形环作为外环进行渲染
function parseGeometry(rawGeometry) {
    if (!rawGeometry) {
        return null;
    }

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
    } else {
        return null;
    }
}
