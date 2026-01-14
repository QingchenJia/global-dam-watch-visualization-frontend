import axios from "axios";
import { FIELD_MAPPING, API_ENDPOINT } from "./config.js";

let viewer = null;

window.onload = function () {
    viewer = new Cesium.Viewer("cesiumContainer", {
        animation: false,
        timeline: false,
        infoBox: true,
        selectionIndicator: true,
        baseLayerPicker: true,
        navigationHelpButton: false,
        homeButton: true,
        geocoder: true,
        sceneModePicker: true,
    });

    viewer._cesiumWidget._creditContainer.style.display = "none";

    showLightBarrier(viewer);
    showLightReservoir(viewer);

    showDescription(viewer);

    initJumpButton(viewer);

    if (typeof initAgent === "function") {
        initAgent(viewer);
    }

    // 对外暴露实体加载和解析函数
    window.loadBarrierEntity = loadBarrierEntity;
    window.loadReservoirEntity = loadReservoirEntity;
    window.parseGeometry = parseGeometry;
    window.showLightBarrier = showLightBarrier;
    window.showLightReservoir = showLightReservoir;
};

let currentEntityIndex = -1;

function initJumpButton(viewer) {
    const nextIcon = document.getElementById("jump-button");

    if (!nextIcon) {
        console.warn("Jump button element (#jump-button) not found");
        return;
    }

    nextIcon.addEventListener("click", () => {
        const entities = viewer.entities.values;
        if (entities.length === 0) {
            alert("当前地图上没有可跳转的实体");
            return;
        }

        // 循环跳转至当前实体列表中的下一个实体
        currentEntityIndex = (currentEntityIndex + 1) % entities.length;
        const targetEntity = entities[currentEntityIndex];

        viewer.selectedEntity = targetEntity;
        viewer.flyTo(targetEntity, { duration: 1.5 });
    });
}

function showDescription(viewer) {
    viewer.selectedEntityChanged.addEventListener(function (entity) {
        if (entity) {
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
                entity.description =
                    '<div style="padding:10px;">暂无详细数据</div>';
            }
        }
    });
}

function queryDescription(entity, id, type) {
    let url = API_ENDPOINT.detail[type] + id;
    let mapping = FIELD_MAPPING[type];

    axios
        .get(url)
        .then((res) => {
            if (res.data.code === 1) {
                const entireInfo = res.data.data;
                const geoResult = parseGeometry(entireInfo.wkbGeometry);

                if (geoResult) {
                    if (geoResult.type === "Point" && entireInfo.damName) {
                        entity.name = entireInfo.damName;
                    } else if (
                        geoResult.type === "MultiPolygon" &&
                        entireInfo.resName
                    ) {
                        entity.name = entireInfo.resName;
                    }
                }

                entity.description = generateDescriptionForm(
                    entireInfo,
                    mapping
                );
            } else {
                entity.description = `<div style="color:red; padding:10px;">获取数据失败: ${res.data.message}</div>`;
            }
        })
        .catch((err) => {
            console.error("详情请求失败", err);
            entity.description =
                '<div style="color:red; padding:10px;">网络请求错误</div>';
        });
}

function showLightBarrier(viewer) {
    const url = API_ENDPOINT.location.barrier;

    axios
        .get(url)
        .then((res) => {
            if (res.data.code === 1 && Array.isArray(res.data.data)) {
                const data = res.data.data;

                data.forEach((item) => {
                    loadBarrierEntity(viewer, item);
                });
            }
        })
        .catch((err) => console.error(err));
}

function showLightReservoir(viewer) {
    const url = API_ENDPOINT.location.reservoir;

    axios
        .get(url)
        .then((res) => {
            if (res.data.code === 1 && Array.isArray(res.data.data)) {
                const data = res.data.data;

                data.forEach((item) => {
                    loadReservoirEntity(viewer, item);
                });
            }
        })
        .catch((err) => console.error(err));
}

function loadBarrierEntity(viewer, item) {
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
    let pointSize = 6;

    if (type.includes("Lake Control Dam")) {
        pointColor = Cesium.Color.GOLD;
    } else if (type.includes("Low Permeable Dam")) {
        pointColor = Cesium.Color.CYAN;
    } else if (type.includes("Lock")) {
        pointColor = Cesium.Color.BLUE;
    }

    viewer.entities.add({
        // 显示定义大坝唯一标志
        id: "b-" + gdwId,
        name: name,
        position: position,
        // 存储大坝关键属性
        properties: {
            dataType: "barrier",
            gdwId: gdwId,
            damType: type,
        },
        point: {
            pixelSize: pointSize,
            color: pointColor,
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 1,
            scaleByDistance: new Cesium.NearFarScalar(1.5e2, 1.0, 1.5e7, 0.5),
        },
    });
}

function loadReservoirEntity(viewer, item) {
    const gdwId = item.gdwId;
    const name = item.resName || "Reservoir #" + gdwId;

    const geoResult = parseGeometry(item.wkbGeometry);

    if (geoResult && geoResult.type === "MultiPolygon") {
        const hierarchies = geoResult.data;
        const hierarchy = hierarchies[0];

        viewer.entities.add({
            // 显示定义水库唯一标志
            id: "r-" + gdwId,
            name: name,
            // 存储水库关键属性
            properties: {
                dataType: "reservoir",
                gdwId: gdwId,
            },
            polygon: {
                hierarchy: hierarchy,
                material: Cesium.Color.CYAN.withAlpha(0.7),
                outline: true,
                outlineColor: Cesium.Color.LIGHTBLUE,
                height: 0,
            },
        });
    }
}

function parseGeometry(rawGeometry) {
    if (!rawGeometry) return null;

    let geometry = rawGeometry;

    if (typeof geometry === "string") {
        try {
            if (geometry.trim().startsWith("{")) {
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
                    Cesium.Cartesian3.fromDegreesArray(polygonRings[0].flat())
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

function generateDescriptionForm(data, mapping) {
    let html = '<table class="cesium-infoBox-defaultTable"><tbody>';
    for (const key in data) {
        // 侧边详情栏跳过地理位置信息字段
        if (
            key === "wkbGeometry" ||
            key === "geojson" ||
            data[key] === null ||
            data[key] === ""
        )
            continue;

        const label = mapping && mapping[key] ? mapping[key] : key;
        html += `<tr><th>${label}</th><td>${data[key]}</td></tr>`;
    }
    html += "</tbody></table>";
    return html;
}
