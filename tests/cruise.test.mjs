import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as Cesium from "cesium";

import {
    closeLoopPositions,
    getReservoirBoundaryPositions,
    isReservoirEntity,
    smoothLoopPositions,
} from "../src/utils/cruise.js";
import * as cruise from "../src/utils/cruise.js";

function property(value) {
    return {
        getValue: () => value,
    };
}

describe("reservoir cruise utilities", () => {
    it("detects only reservoir entities", () => {
        assert.equal(
            isReservoirEntity({
                properties: {
                    dataType: property("reservoir"),
                },
            }),
            true,
        );
        assert.equal(
            isReservoirEntity({
                properties: {
                    dataType: property("barrier"),
                },
            }),
            false,
        );
    });

    it("extracts and closes the reservoir polygon boundary route", () => {
        const p1 = { x: 1, y: 0, z: 0 };
        const p2 = { x: 0, y: 1, z: 0 };
        const p3 = { x: 0, y: 0, z: 1 };
        const entity = {
            polygon: {
                hierarchy: property({
                    positions: [p1, p2, p3],
                }),
            },
        };

        const route = getReservoirBoundaryPositions(entity);

        assert.deepEqual(route, [p1, p2, p3, p1]);
    });

    it("does not duplicate a route that is already closed", () => {
        const p1 = { x: 1, y: 0, z: 0 };
        const p2 = { x: 0, y: 1, z: 0 };
        const route = closeLoopPositions([p1, p2, p1]);

        assert.deepEqual(route, [p1, p2, p1]);
    });

    it("smooths a closed boundary route to reduce sharp direction changes", () => {
        const p1 = new Cesium.Cartesian3(0, 0, 0);
        const p2 = new Cesium.Cartesian3(10, 0, 0);
        const p3 = new Cesium.Cartesian3(10, 10, 0);
        const p4 = new Cesium.Cartesian3(0, 10, 0);

        const route = smoothLoopPositions([p1, p2, p3, p4, p1]);

        assert.equal(route.length, 9);
        assert.equal(Cesium.Cartesian3.equals(route[0], route.at(-1)), true);
        assert.equal(Cesium.Cartesian3.equals(route[1], p2), false);
    });

    it("starts cruise with a boat model without tracking the boat camera", () => {
        const p1 = { x: 6378137, y: 0, z: 0 };
        const p2 = { x: 0, y: 6378137, z: 0 };
        const p3 = { x: 0, y: 0, z: 6378137 };
        const added = [];
        const viewer = {
            clock: {},
            entities: {
                add: (entity) => {
                    added.push(entity);
                    return entity;
                },
                getById: () => null,
                remove: () => {},
            },
            scene: {
                requestRender: () => {},
            },
            trackedEntity: undefined,
        };
        const entity = {
            properties: {
                dataType: property("reservoir"),
            },
            polygon: {
                hierarchy: property({
                    positions: [p1, p2, p3],
                }),
            },
        };

        cruise.start(viewer, entity);

        const boat = added.find((item) => item.name === "Reservoir cruise boat");
        assert.equal(viewer.trackedEntity, undefined);
        assert.equal(boat.model.uri, "/models/Boat.glb");
        assert.equal(boat.orientation.constructor.name, "CallbackProperty");
        assert.equal(boat.box, undefined);
        assert.equal(
            Cesium.JulianDate.secondsDifference(
                viewer.clock.stopTime,
                viewer.clock.startTime,
            ),
            64,
        );
    });
});
