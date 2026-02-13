import axios from "axios";
import { API_ENDPOINT, FIELD_MAP, IGNORE_FIELD } from "./config.js";

let viewer = null;
let currentEntityIndex = -1;

window.onload = function () {
    viewer = new Cesium.Viewer("cesiumContainer", {
        animation: false,
        timeline: false,
        infoBox: true,
        selectionIndicator: true,
        baseLayerPicker: true,
        // 设置默认底图为ArcGIS影像图
        selectedImageryProviderViewModel:
            Cesium.createDefaultImageryProviderViewModels().find(
                (viewModel) => viewModel.name === "ArcGIS World Imagery",
            ),
        navigationHelpButton: false,
        homeButton: true,
        geocoder: true,
        sceneModePicker: true,
    });
    // 隐藏开源三维地球版权信息
    viewer._cesiumWidget._creditContainer.style.display = "none";

    // 初始化窗口交互功能
    initWindowFunc(viewer);
    // 对外暴露实体加载和解析函数
    bindWindowFunc();

    // 加载并显示大坝和水库实体
    showLightBarrier(viewer);
    showLightReservoir(viewer);
};

function initWindowFunc(viewer) {
    // 设置实体循环跳转
    initJumpButton(viewer);
    // 设置实体重新加载
    initReloadButton(viewer);
    // 设置视角重置
    initResetViewButton(viewer);
    // 初始化智能体功能
    initAgent(viewer);
    // 绑定单击实体侧边详情栏显示
    entitySelectedEvent(viewer);
}

function bindWindowFunc() {
    window.loadBarrierEntity = loadBarrierEntity;
    window.loadReservoirEntity = loadReservoirEntity;
    window.showLightBarrier = showLightBarrier;
    window.showLightReservoir = showLightReservoir;
}

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

function initReloadButton(viewer) {
    const reloadBtn = document.getElementById("reload-button");

    if (!reloadBtn) {
        console.warn("Reload button element (#reload-button) not found");
        return;
    }

    reloadBtn.addEventListener("click", () => {
        // 移除当前渲染到三维地球上的所有实体
        viewer.entities.removeAll();

        showLightBarrier(viewer);
        showLightReservoir(viewer);
    });
}

function initResetViewButton(viewer) {
    const resetBtn = document.getElementById("reset-view-button");

    if (!resetBtn) {
        console.warn("Reset button element (#reset-view-button) not found");
        return;
    }

    resetBtn.addEventListener("click", () => {
        // 取消当前的实体选中状态
        viewer.selectedEntity = null;
        // 调整视角至自定义初始位置
        viewer.camera.flyTo({
            // 设置初始视角位置为中国上空
            destination: Cesium.Cartesian3.fromDegrees(105.0, 35.0, 20000000),
            duration: 1.5,
        });
    });
}

function entitySelectedEvent(viewer) {
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

function showLightBarrier(viewer) {
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

function showLightReservoir(viewer) {
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

    // 根据大坝类型调整显示颜色
    if (type.includes("Lake Control Dam")) {
        pointColor = Cesium.Color.GOLD;
    } else if (type.includes("Low Permeable Dam")) {
        pointColor = Cesium.Color.CYAN;
    } else if (type.includes("Lock")) {
        pointColor = Cesium.Color.BLUE;
    }

    viewer.entities.add({
        // 显式定义大坝id
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
            // 显式定义水库id
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
                // 多边形色块贴地显示
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

function generateDescriptionForm(data, mapping) {
    let html = '<table class="cesium-infoBox-defaultTable"><tbody>';
    for (const key in data) {
        // 侧边详情栏过滤非必要与空值字段
        const ignoreField = IGNORE_FIELD;
        if (
            ignoreField.has(key) ||
            data[key] === null ||
            data[key] === -99 ||
            data[key] === "" ||
            data[key] === " "
        )
            continue;

        const label = mapping && mapping[key] ? mapping[key] : key;
        html += `<tr><th>${label}</th><td>${data[key]}</td></tr>`;
    }
    html += "</tbody></table>";
    return html;
}
