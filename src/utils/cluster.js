import * as Cesium from "cesium";

// 聚合行为参数
const CLUSTER_PIXEL_RANGE = 60;
const CLUSTER_MIN_SIZE = 3;
// 当拉近到这个高度以下时散开所有点
const ZOOM_THRESHOLD = 1000000;

// 分档配色与尺寸
const CLUSTER_TIERS = [
    // 冷蓝高亮
    { min: 500, hue: "210,70%", size: 30 },
    // 青蓝
    { min: 100, hue: "200,55%", size: 25 },
    // 灰蓝
    { min: 10, hue: "195,45%", size: 22 },
    // 暗蓝灰
    { min: 0, hue: "190,35%", size: 20 },
];

// 缓存已生成的气泡图标
const clusterPinCache = new Map();

function getClusterPin(count) {
    if (clusterPinCache.has(count)) return clusterPinCache.get(count);

    const tier = CLUSTER_TIERS.find((t) => count >= t.min);
    const size = tier.size;

    const dpr = window.devicePixelRatio || 1;
    const canvas = document.createElement("canvas");
    // 留出边距给外发光
    const pad = 4;
    const full = size + pad * 2;
    canvas.width = full * dpr;
    canvas.height = full * dpr;
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);

    const cx = full / 2;
    const cy = full / 2;
    const r = size / 2 - 1;

    // 投影
    ctx.shadowColor = "rgba(0, 0, 0, 0.2)";
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;

    // 纯色不透明主体
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = `hsl(${tier.hue}, 80%, 95%)`;
    ctx.fill();

    // 清除阴影以免影响描边
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // 描边
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = `hsl(${tier.hue}, 60%, 55%)`;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const url = canvas.toDataURL();
    clusterPinCache.set(count, url);
    return url;
}

let autoClusterEnabled = true;

export function setAutoClusterEnabled(enabled) {
    autoClusterEnabled = enabled;
}

export function enableEntityClustering(dataSource, viewer) {
    dataSource.clustering.enabled = true;
    dataSource.clustering.pixelRange = CLUSTER_PIXEL_RANGE;
    dataSource.clustering.minimumClusterSize = CLUSTER_MIN_SIZE;

    // 监听聚合事件自定义聚合图标和标签
    dataSource.clustering.clusterEvent.addEventListener(
        function (clusteredEntities, cluster) {
            const count = clusteredEntities.length;

            cluster.billboard.show = true;
            cluster.billboard.image = getClusterPin(count);
            cluster.billboard.verticalOrigin = Cesium.VerticalOrigin.CENTER;
            // 始终绘制在地表多边形水库之上
            cluster.billboard.disableDepthTestDistance =
                Number.POSITIVE_INFINITY;

            // 显示聚合数量标签
            cluster.label.show = true;
            cluster.label.text =
                count >= 1000 ? (count / 1000).toFixed(1) + "k" : String(count);
            cluster.label.font = '700 12px "JetBrains Mono", monospace';
            cluster.label.fillColor = Cesium.Color.BLACK;
            cluster.label.style = Cesium.LabelStyle.FILL_AND_OUTLINE;
            cluster.label.outlineColor = Cesium.Color.WHITE.withAlpha(0.85);
            cluster.label.outlineWidth = 2;
            cluster.label.verticalOrigin = Cesium.VerticalOrigin.CENTER;
            cluster.label.horizontalOrigin = Cesium.HorizontalOrigin.CENTER;
            cluster.label.disableDepthTestDistance = Number.POSITIVE_INFINITY;
        },
    );

    // 监听相机移动结束事件
    // 根据相机高度动态控制聚合的开关
    if (viewer) {
        const updateClusteringState = () => {
            if (!autoClusterEnabled) return;
            if (!viewer.camera || !viewer.camera.positionCartographic) return;

            const height = viewer.camera.positionCartographic.height;
            const shouldCluster = height > ZOOM_THRESHOLD;

            if (dataSource.clustering.enabled !== shouldCluster) {
                dataSource.clustering.enabled = shouldCluster;
                dataSource.clustering.pixelRange = shouldCluster
                    ? CLUSTER_PIXEL_RANGE + 0.1
                    : 0;
                setTimeout(() => {
                    // 下一帧还原正常的聚合范围
                    // 并在需要时请求重绘以更新聚合状态
                    dataSource.clustering.pixelRange = shouldCluster
                        ? CLUSTER_PIXEL_RANGE
                        : 0;
                    if (viewer.scene) {
                        viewer.scene.requestRender();
                    }
                }, 0);
            }
        };

        viewer.camera.moveEnd.addEventListener(updateClusteringState);

        // 初始化时调用一次
        updateClusteringState();
    }
}
