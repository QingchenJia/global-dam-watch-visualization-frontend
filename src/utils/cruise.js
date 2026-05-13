import * as Cesium from "cesium";

const CRUISE_ENTITY_ID = "__reservoir_cruise_boat__";
const CRUISE_PATH_ID = "__reservoir_cruise_path__";
const DEFAULT_DURATION_SECONDS = 64;
const DEFAULT_BOAT_MODEL_URI = "/models/Boat.glb";
const MODEL_FORWARD_CORRECTION = Cesium.Quaternion.fromAxisAngle(
    Cesium.Cartesian3.UNIT_Z,
    Math.PI,
);

export function readCesiumProperty(property, time = Cesium.JulianDate.now()) {
    if (property === null || property === undefined) {
        return null;
    }
    if (typeof property.getValue === "function") {
        return property.getValue(time);
    }
    return property;
}

export function isReservoirEntity(entity) {
    return readCesiumProperty(entity?.properties?.dataType) === "reservoir";
}

function samePosition(left, right) {
    if (!left || !right) {
        return false;
    }
    if (typeof Cesium.Cartesian3.equalsEpsilon === "function") {
        return Cesium.Cartesian3.equalsEpsilon(
            left,
            right,
            Cesium.Math.EPSILON7,
        );
    }
    return left.x === right.x && left.y === right.y && left.z === right.z;
}

export function closeLoopPositions(positions) {
    if (!Array.isArray(positions) || positions.length === 0) {
        return [];
    }

    const route = positions.slice();
    const first = route[0];
    const last = route[route.length - 1];

    if (!samePosition(first, last)) {
        route.push(first);
    }

    return route;
}

export function getReservoirBoundaryPositions(entity) {
    const hierarchy = readCesiumProperty(entity?.polygon?.hierarchy);
    const positions = hierarchy?.positions || hierarchy;

    if (!Array.isArray(positions) || positions.length < 3) {
        return [];
    }

    return closeLoopPositions(positions);
}

export function smoothLoopPositions(positions, iterations = 1) {
    let route = closeLoopPositions(positions);
    if (route.length < 4 || iterations <= 0) {
        return route;
    }

    for (let iteration = 0; iteration < iterations; iteration++) {
        const openRoute = route.slice(0, -1);
        const smoothed = [];

        for (let index = 0; index < openRoute.length; index++) {
            const current = openRoute[index];
            const next = openRoute[(index + 1) % openRoute.length];
            smoothed.push(
                Cesium.Cartesian3.lerp(
                    current,
                    next,
                    0.25,
                    new Cesium.Cartesian3(),
                ),
                Cesium.Cartesian3.lerp(
                    current,
                    next,
                    0.75,
                    new Cesium.Cartesian3(),
                ),
            );
        }

        route = closeLoopPositions(smoothed);
    }

    return route;
}

function buildSampledPosition(routePositions, durationSeconds) {
    const start = Cesium.JulianDate.now();
    const property = new Cesium.SampledPositionProperty();
    const segmentSeconds = durationSeconds / (routePositions.length - 1);

    routePositions.forEach((position, index) => {
        const time = Cesium.JulianDate.addSeconds(
            start,
            segmentSeconds * index,
            new Cesium.JulianDate(),
        );
        property.addSample(time, position);
    });

    property.setInterpolationOptions({
        interpolationAlgorithm: Cesium.LinearApproximation,
        interpolationDegree: 1,
    });

    return {
        property,
        start,
        stop: Cesium.JulianDate.addSeconds(
            start,
            durationSeconds,
            new Cesium.JulianDate(),
        ),
    };
}

function createBoatOrientation(positionProperty) {
    const velocityOrientation = new Cesium.VelocityOrientationProperty(
        positionProperty,
    );
    const velocityScratch = new Cesium.Quaternion();

    return new Cesium.CallbackProperty((time, result) => {
        const velocityQuaternion = velocityOrientation.getValue(
            time,
            velocityScratch,
        );
        if (!velocityQuaternion) {
            return undefined;
        }

        return Cesium.Quaternion.multiply(
            velocityQuaternion,
            MODEL_FORWARD_CORRECTION,
            result || new Cesium.Quaternion(),
        );
    }, false);
}

function configureClock(viewer, start, stop) {
    viewer.clock.startTime = start.clone();
    viewer.clock.stopTime = stop.clone();
    viewer.clock.currentTime = start.clone();
    viewer.clock.clockRange = Cesium.ClockRange.LOOP_STOP;
    viewer.clock.multiplier = 1;
    viewer.clock.shouldAnimate = true;

    if (viewer.timeline) {
        viewer.timeline.zoomTo(start, stop);
    }
}

function addRoutePath(viewer, routePositions) {
    return viewer.entities.add({
        id: CRUISE_PATH_ID,
        polyline: {
            positions: routePositions,
            width: 3,
            material: new Cesium.PolylineGlowMaterialProperty({
                glowPower: 0.18,
                color: Cesium.Color.CYAN.withAlpha(0.85),
            }),
            clampToGround: true,
        },
    });
}

function addBoat(viewer, sampledPosition, options = {}) {
    const modelUri = options.modelUri ?? DEFAULT_BOAT_MODEL_URI;
    const boatEntity = {
        id: CRUISE_ENTITY_ID,
        name: "Reservoir cruise boat",
        availability: new Cesium.TimeIntervalCollection([
            new Cesium.TimeInterval({
                start: sampledPosition.start,
                stop: sampledPosition.stop,
            }),
        ]),
        position: sampledPosition.property,
        orientation: createBoatOrientation(sampledPosition.property),
        path: {
            resolution: 1,
            leadTime: 0,
            trailTime: options.trailTime ?? 8,
            width: 4,
            material: Cesium.Color.WHITE.withAlpha(0.75),
        },
    };

    if (modelUri) {
        boatEntity.model = {
            uri: modelUri,
            scale: options.modelScale ?? 8,
            minimumPixelSize: options.minimumPixelSize ?? 34,
            maximumScale: options.maximumScale ?? 240,
        };
    } else {
        boatEntity.box = {
            dimensions: new Cesium.Cartesian3(90, 36, 18),
            material: Cesium.Color.WHITE.withAlpha(0.92),
            outline: true,
            outlineColor: Cesium.Color.CYAN,
        };
        boatEntity.label = {
            text: "船",
            font: "14px sans-serif",
            pixelOffset: new Cesium.Cartesian2(0, -22),
            fillColor: Cesium.Color.CYAN,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
        };
    }

    return viewer.entities.add(boatEntity);
}

export function stop(viewer) {
    if (!viewer?.entities) {
        return;
    }

    const boat = viewer.entities.getById(CRUISE_ENTITY_ID);
    const path = viewer.entities.getById(CRUISE_PATH_ID);

    if (boat) {
        if (viewer.trackedEntity?.id === CRUISE_ENTITY_ID) {
            viewer.trackedEntity = undefined;
        }
        viewer.entities.remove(boat);
    }
    if (path) {
        viewer.entities.remove(path);
    }

    viewer.scene?.requestRender?.();
}

export function start(viewer, entity, options = {}) {
    if (!viewer || !entity || !isReservoirEntity(entity)) {
        return null;
    }

    const boundaryPositions = getReservoirBoundaryPositions(entity);
    if (boundaryPositions.length < 4) {
        return null;
    }

    stop(viewer);

    const routePositions = smoothLoopPositions(
        boundaryPositions,
        options.smoothingIterations ?? 1,
    );
    const sampledPosition = buildSampledPosition(
        routePositions,
        options.durationSeconds ?? DEFAULT_DURATION_SECONDS,
    );

    configureClock(viewer, sampledPosition.start, sampledPosition.stop);
    addRoutePath(viewer, routePositions);
    const boat = addBoat(viewer, sampledPosition, options);

    viewer.scene?.requestRender?.();

    return {
        entity: boat,
        routePositions,
        stop: () => stop(viewer),
    };
}

export function active(viewer) {
    return Boolean(viewer?.entities?.getById(CRUISE_ENTITY_ID));
}
