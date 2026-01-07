import axios from "axios";
import { BARRIER_FIELD_MAPPING, RESERVOIR_FIELD_MAPPING } from "./config.js";

// 全局 Cesium 视图实例变量
let viewer = null;

// 页面加载完成后执行初始化逻辑
window.onload = function () {
    // 初始化 Cesium Viewer，配置基础控件
    // 关闭动画、时间轴等不必要的组件，保留信息框和图层选择器
    // 注意：这里去掉了 let 关键字，使用外部定义的全局 viewer 变量，或者直接传递给函数
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

    // 隐藏 Cesium 默认的版权信息容器
    viewer._cesiumWidget._creditContainer.style.display = "none";

    // 将核心渲染函数挂载到 window 对象，供 filter.js 等外部模块调用
    window.loadBarrierEntity = loadBarrierEntity;
    window.loadReservoirEntity = loadReservoirEntity;
    window.parseGeometry = parseGeometry;
    window.showLightBarrier = showLightBarrier;
    window.showLightReservoir = showLightReservoir;

    // 加载大坝和水库的轻量级位置数据（仅包含坐标和ID，用于快速渲染）
    showLightBarrier(viewer);
    showLightReservoir(viewer);

    // 配置实体点击交互逻辑
    showDescription(viewer);

    // 初始化跳转按钮 (使用 index.html 中预置的按钮)
    initJumpButton(viewer);

    // 初始化智能体组件
    if (typeof initAgent === "function") {
        initAgent(viewer);
    }
};

// 全局变量维护跳转索引
let currentEntityIndex = -1;

/**
 * 初始化跳转按钮功能 (重构：仅负责逻辑绑定)
 */
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
        // 循环跳转
        currentEntityIndex = (currentEntityIndex + 1) % entities.length;
        const targetEntity = entities[currentEntityIndex];

        // 选中并飞向目标
        viewer.selectedEntity = targetEntity;
        viewer.flyTo(targetEntity, { duration: 1.5 });
    });
}

/**
 * 监听实体选中事件
 * 当用户点击地图上的实体时，显示加载状态并触发详情查询
 */
function showDescription(viewer) {
    viewer.selectedEntityChanged.addEventListener(function (entity) {
        if (entity) {
            // 设置临时加载提示
            entity.description =
                '<div style="padding:10px;">正在从服务器获取详细数据...</div>';

            // 仅当实体包含必要的元数据（ID和类型）时才发起请求
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

/**
 * 向后端请求实体的详细属性信息
 * @param {Cesium.Entity} entity - 选中的实体对象
 * @param {String|Number} id - 实体ID
 * @param {String} type - 实体类型 ('barrier' 或 'reservoir')
 */
function queryDescription(entity, id, type) {
    let apiUrl = "";
    let mapping = null;

    // 根据类型确定 API 端点和字段映射表
    if (type === "barrier") {
        apiUrl = `http://localhost:8100/barrier/${id}`;
        mapping =
            typeof BARRIER_FIELD_MAPPING !== "undefined"
                ? BARRIER_FIELD_MAPPING
                : null;
    } else if (type === "reservoir") {
        apiUrl = `http://localhost:8100/reservoir/${id}`;
        mapping =
            typeof RESERVOIR_FIELD_MAPPING !== "undefined"
                ? RESERVOIR_FIELD_MAPPING
                : null;
    }

    // 发起异步请求
    axios
        .get(apiUrl)
        .then((res) => {
            if (res.data.code === 1) {
                const entireInfo = res.data.data;

                // 解析几何数据以更新实体名称（如果后端返回了更准确的名称）
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

                // 生成 HTML 表格并更新 InfoBox 内容
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

/**
 * 获取并渲染所有大坝的简略位置信息
 */
function showLightBarrier(viewer) {
    const apiUrl = "http://localhost:8100/barrier/location";

    axios
        .get(apiUrl)
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

/**
 * 获取并渲染所有水库的简略位置信息
 */
function showLightReservoir(viewer) {
    const apiUrl = "http://localhost:8100/reservoir/location";

    axios
        .get(apiUrl)
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

/**
 * 在地图上创建一个大坝实体（点要素）
 * 根据大坝类型应用不同的颜色样式
 */
function loadBarrierEntity(viewer, item) {
    const gdwId = item.gdwId;
    const type = item.damType || "Unknown";
    const name = item.damName || "Barrier #" + gdwId;

    // 解析几何数据
    let position = null;
    const geoResult = parseGeometry(item.wkbGeometry);

    if (geoResult && geoResult.type === "Point") {
        position = geoResult.data;
    }

    if (!position) return;

    // 默认样式配置
    let pointColor = Cesium.Color.RED;
    let pointSize = 6;

    // 根据特定类型调整颜色
    if (type.includes("Lake Control Dam")) {
        pointColor = Cesium.Color.GOLD;
    } else if (type.includes("Low Permeable Dam")) {
        pointColor = Cesium.Color.CYAN;
    } else if (type.includes("Lock")) {
        pointColor = Cesium.Color.BLUE;
    }

    // 添加实体
    viewer.entities.add({
        id: "b-" + gdwId, // 设置实体ID: b-{gdwId}
        name: name,
        position: position,
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
            // 视距缩放：距离越远点越小，避免密集时遮挡
            scaleByDistance: new Cesium.NearFarScalar(1.5e2, 1.0, 1.5e7, 0.5),
        },
    });
}

/**
 * 在地图上创建一个水库实体（多边形要素）
 * 处理 MultiPolygon 几何类型，将其拆分为多个 Polygon 实体
 */
function loadReservoirEntity(viewer, item) {
    const gdwId = item.gdwId;
    const name = item.resName || "Reservoir #" + gdwId;

    const geoResult = parseGeometry(item.wkbGeometry);

    if (geoResult && geoResult.type === "MultiPolygon") {
        const hierarchies = geoResult.data;

        // 只需要将其外环渲染即可
        // 取第一个多边形部件作为主实体，确保 ID 唯一且符合 r-{gdwId} 格式
        const hierarchy = hierarchies[0];

        viewer.entities.add({
            id: "r-" + gdwId, // 设置实体ID: r-{gdwId}
            name: name,
            properties: {
                dataType: "reservoir",
                gdwId: gdwId,
            },
            polygon: {
                hierarchy: hierarchy,
                // 使用高亮青色填充，提高可见度
                material: Cesium.Color.CYAN.withAlpha(0.7),
                outline: true,
                outlineColor: Cesium.Color.LIGHTBLUE,
                height: 0, // 贴地模式
            },
        });
    }
}

/**
 * 解析 GeoJSON 格式的几何数据
 * 支持 Point 和 MultiPolygon 类型
 * @returns {Object|null} 解析后的 Cesium 几何对象或 null
 */
function parseGeometry(rawGeometry) {
    if (!rawGeometry) return null;

    let geometry = rawGeometry;

    // 尝试解析 JSON 字符串
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

    // 处理点类型
    if (geometry.type === "Point" && Array.isArray(geometry.coordinates)) {
        const coords = geometry.coordinates;
        return {
            type: "Point",
            data: Cesium.Cartesian3.fromDegrees(coords[0], coords[1]),
        };
    }
    // 处理多多边形类型
    else if (geometry.type === "MultiPolygon") {
        const polygons = geometry.coordinates;
        if (polygons && polygons.length > 0) {
            // 将 GeoJSON 坐标数组转换为 Cesium.PolygonHierarchy 对象数组
            const hierarchies = polygons.map((polygonRings) => {
                // polygonRings[0] 是外环，后续元素是内环（孔洞）
                // 此处简化处理，仅使用外环构建多边形
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

/**
 * 生成 InfoBox 显示用的 HTML 表格
 * 过滤掉几何字段和空值，并应用字段名映射
 */
function generateDescriptionForm(data, mapping) {
    let html = '<table class="cesium-infoBox-defaultTable"><tbody>';
    for (const key in data) {
        // 排除不需要显示的字段
        if (
            key === "wkbGeometry" ||
            key === "geojson" ||
            data[key] === null ||
            data[key] === ""
        )
            continue;

        // 获取中文标签
        const label = mapping && mapping[key] ? mapping[key] : key;
        html += `<tr><th>${label}</th><td>${data[key]}</td></tr>`;
    }
    html += "</tbody></table>";
    return html;
}
