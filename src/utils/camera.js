import * as Cesium from "cesium";

// 计算实体集合的中心点
export function computeCenter(entities) {
    const now = Cesium.JulianDate.now();
    const points = [];

    const source = Array.isArray(entities)
        ? entities
        : Array.isArray(entities?.values)
          ? entities.values
          : [];

    source.forEach((entity) => {
        // 优先使用position属性
        if (entity.position) {
            const position = Cesium.Property.getValueOrUndefined(
                entity.position,
                now,
            );
            if (position) points.push(position);
        }

        // 如果有polygon则使用polygon的第一个顶点位置
        if (entity.polygon?.hierarchy) {
            const hierarchy = Cesium.Property.getValueOrUndefined(
                entity.polygon.hierarchy,
                now,
            );
            if (hierarchy?.positions?.length) {
                points.push(hierarchy.positions[0]);
            }
        }
    });

    if (points.length === 0) return null;

    return Cesium.BoundingSphere.fromPoints(points).center;
}

// 旋转相机飞行到指定中心点
export function rotateEarth(viewer, center) {
    if (!viewer || !center) {
        return Promise.resolve();
    }

    const centerCartographic = Cesium.Cartographic.fromCartesian(center);
    const current = viewer.camera;
    const currentHeight = current.positionCartographic.height;

    return new Promise((resolve) => {
        viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromRadians(
                centerCartographic.longitude,
                centerCartographic.latitude,
                currentHeight,
            ),
            // 保持当前相机的参数不变
            orientation: {
                heading: current.heading,
                pitch: current.pitch,
                roll: current.roll,
            },
            duration: 1.5,
            complete: resolve,
            cancel: resolve,
        });
    });
}
