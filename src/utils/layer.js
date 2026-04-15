import * as Cesium from "cesium";
import { ref } from "vue";

export const barrierVisible = ref(true);
export const reservoirVisible = ref(true);
export const DEFAULT_BASE_MAP_TYPE = "arcgis-world-imagery";

const BASE_MAP_OPTIONS = [
    {
        type: "arcgis-world-imagery",
        label: "ArcGIS World Imagery",
        createProvider: () =>
            Cesium.ArcGisMapServerImageryProvider.fromBasemapType(
                Cesium.ArcGisBaseMapType.SATELLITE,
                {
                    enablePickFeatures: false,
                },
            ),
    },
    {
        type: "usgs-imagery-only",
        label: "USGS Imagery Only",
        createProvider: () =>
            new Cesium.UrlTemplateImageryProvider({
                url: "https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}",
                credit: "USGS",
            }),
    },
    {
        type: "sentinel-2-cloudless",
        label: "Sentinel-2 Cloudless",
        createProvider: () =>
            new Cesium.UrlTemplateImageryProvider({
                url: "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/g/{z}/{y}/{x}.jpg",
                credit: "Sentinel-2 cloudless by EOX IT Services GmbH",
            }),
    },
];

export async function setupBaseMapSwitcher(viewer) {
    let currentBaseLayer = null;
    let currentBaseMapType = DEFAULT_BASE_MAP_TYPE;

    const setBaseMapType = async (type) => {
        const option = BASE_MAP_OPTIONS.find((item) => item.type === type);
        if (!option) {
            return false;
        }

        try {
            const provider = await option.createProvider();
            const nextLayer = viewer.imageryLayers.addImageryProvider(
                provider,
                0,
            );

            if (
                currentBaseLayer &&
                viewer.imageryLayers.contains(currentBaseLayer)
            ) {
                viewer.imageryLayers.remove(currentBaseLayer, false);
            }

            currentBaseLayer = nextLayer;
            currentBaseMapType = option.type;
            return true;
        } catch (error) {
            console.error("切换底图失败", error);
            return false;
        }
    };

    viewer.__setBaseMapType = setBaseMapType;
    viewer.__getBaseMapType = () => currentBaseMapType;
    viewer.__getBaseMapOptions = () => {
        return BASE_MAP_OPTIONS.map((item) => ({
            type: item.type,
            label: item.label,
        }));
    };

    const initialized = await setBaseMapType(DEFAULT_BASE_MAP_TYPE);
    if (!initialized) {
        await setBaseMapType("usgs-imagery-only");
    }
}
