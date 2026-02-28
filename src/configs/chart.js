const MAIN_BASIN = [
    { label: "长江", value: "Yangtze" },
    { label: "黄河", value: "Yellow" },
    { label: "珠江", value: "Pearl" },
    { label: "海河", value: "Hai He" },
    { label: "淮河", value: "Huai He" },
    { label: "Amazon", value: "Amazon" },
    { label: "Mississippi", value: "Mississippi" },
    { label: "Nile", value: "Nile" },
    { label: "Ganges", value: "Ganges" },
    { label: "Danube", value: "Danube" },
    { label: "Mekong", value: "Mekong" },
    { label: "Congo", value: "Congo" },
    { label: "Volga", value: "Volga" },
    { label: "Indus", value: "Indus" },
    { label: "Niger", value: "Niger" },
];

const MAIN_USE = [
    { label: "Irrigation", value: "Irrigation" },
    { label: "Hydroelectricity", value: "Hydroelectricity" },
    { label: "Water supply", value: "Water supply" },
    { label: "Flood control", value: "Flood control" },
    { label: "Recreation", value: "Recreation" },
    { label: "Navigation", value: "Navigation" },
    { label: "Fisheries", value: "Fisheries" },
    { label: "Pollution control", value: "Pollution control" },
    { label: "Multipurpose", value: "Multipurpose" },
];

const COUNTRY = [
    { label: "China", value: "China" },
    { label: "United States", value: "United States" },
    { label: "India", value: "India" },
    { label: "Brazil", value: "Brazil" },
    { label: "Japan", value: "Japan" },
    { label: "Canada", value: "Canada" },
    { label: "Russia", value: "Russia" },
    { label: "Turkey", value: "Turkey" },
    { label: "South Africa", value: "South Africa" },
    { label: "Indonesia", value: "Indonesia" },
    { label: "Mexico", value: "Mexico" },
    { label: "Australia", value: "Australia" },
    { label: "France", value: "France" },
    { label: "Spain", value: "Spain" },
    { label: "South Korea", value: "South Korea" },
];

const QUALITY = [
    { label: "1: Verified", value: "1: Verified" },
    { label: "2: Good", value: "2: Good" },
    { label: "3: Fair", value: "3: Fair" },
    { label: "4: Poor", value: "4: Poor" },
    { label: "5: Unreliable", value: "5: Unreliable" },
];

export const FORM_FIELD = {
    barrier: [
        {
            key: "damType",
            label: "大坝类型",
            type: "multiSelect",
            options: [
                { label: "Dam", value: "Dam" },
                { label: "Lake Control Dam", value: "Lake Control Dam" },
                { label: "Low Permeable Dam", value: "Low Permeable Dam" },
                { label: "Lock", value: "Lock" },
            ],
        },
        {
            key: "powerMw",
            label: "发电功率(MW)",
            type: "rangeSelect",
            ranges: [
                {
                    label: "无发电 (0 MW)",
                    value: {
                        eq: 0,
                    },
                },
                {
                    label: "0-10 MW",
                    value: {
                        gt: 0,
                        lte: 10,
                    },
                },
                {
                    label: "10-100 MW",
                    value: {
                        gt: 10,
                        lte: 100,
                    },
                },
                {
                    label: "100-500 MW",
                    value: {
                        gt: 100,
                        lte: 500,
                    },
                },
                {
                    label: ">500 MW",
                    value: {
                        gt: 500,
                    },
                },
            ],
        },
        {
            key: "mainBasin",
            label: "主要流域",
            type: "multiSelect",
            options: MAIN_BASIN,
        },
        {
            key: "mainUse",
            label: "主要用途",
            type: "multiSelect",
            options: MAIN_USE,
        },
        {
            key: "quality",
            label: "数据质量",
            type: "multiSelect",
            options: QUALITY,
        },
        {
            key: "yearDam",
            label: "建成年份",
            type: "yearRange",
        },
        {
            key: "country",
            label: "国家/地区",
            type: "multiSelect",
            options: COUNTRY,
        },
        {
            key: "damHgtM",
            label: "大坝高度(m)",
            type: "rangeSelect",
            ranges: [
                {
                    label: "<20 m",
                    value: {
                        lt: 20,
                    },
                },
                {
                    label: "20-50 m",
                    value: {
                        gt: 20,
                        lte: 50,
                    },
                },
                {
                    label: "50-100 m",
                    value: {
                        gt: 50,
                        lte: 100,
                    },
                },
                {
                    label: ">100 m",
                    value: {
                        gt: 100,
                    },
                },
            ],
        },
    ],
    reservoir: [
        {
            key: "capMcm",
            label: "库容(百万m³)",
            type: "rangeSelect",
            ranges: [
                {
                    label: "<1 百万m³",
                    value: {
                        lt: 1,
                    },
                },
                {
                    label: "1-10 百万m³",
                    value: {
                        gt: 1,
                        lte: 10,
                    },
                },
                {
                    label: "10-100 百万m³",
                    value: {
                        t: 10,
                        lte: 100,
                    },
                },
                {
                    label: "100-1000 百万m³",
                    value: {
                        gt: 100,
                        lte: 1000,
                    },
                },
                {
                    label: ">1000 百万m³",
                    value: {
                        gt: 1000,
                    },
                },
            ],
        },
        {
            key: "areaSkm",
            label: "表面积(km²)",
            type: "rangeSelect",
            ranges: [
                {
                    label: "<1 km²",
                    value: {
                        lt: 1,
                    },
                },
                {
                    label: "1-10 km²",
                    value: {
                        gt: 1,
                        lte: 10,
                    },
                },
                {
                    label: "10-100 km²",
                    value: {
                        gt: 10,
                        lte: 100,
                    },
                },
                {
                    label: ">100 km²",
                    value: {
                        gt: 100,
                    },
                },
            ],
        },
        {
            key: "mainBasin",
            label: "主要流域",
            type: "multiSelect",
            options: MAIN_BASIN,
        },
        {
            key: "mainUse",
            label: "主要用途",
            type: "multiSelect",
            options: MAIN_USE,
        },
        {
            key: "quality",
            label: "数据质量",
            type: "multiSelect",
            options: QUALITY,
        },
        {
            key: "yearDam",
            label: "建成年份",
            type: "yearRange",
        },
        {
            key: "country",
            label: "国家/地区",
            type: "multiSelect",
            options: COUNTRY,
        },
        {
            key: "depthM",
            label: "水库深度(m)",
            type: "rangeSelect",
            ranges: [
                {
                    label: "<10 m",
                    value: {
                        lt: 10,
                    },
                },
                {
                    label: "10-50 m",
                    value: {
                        gt: 10,
                        lte: 50,
                    },
                },
                {
                    label: "50-100 m",
                    value: {
                        gt: 50,
                        lte: 100,
                    },
                },
                {
                    label: ">100 m",
                    value: {
                        gt: 100,
                    },
                },
            ],
        },
    ],
};

export const CHART_CONFIG = {
    barrier: [
        { title: "大坝类型占比", field: "damType" },
        { title: "发电功率等级占比", field: "powerMw", isNumericRange: true },
        { title: "主要用途占比", field: "mainUse" },
        { title: "数据质量评级占比", field: "quality" },
        { title: "建成年代区间占比", field: "yearDam", isYearRange: true },
        { title: "所在国家/地区占比", field: "country" },
    ],
    reservoir: [
        { title: "库容等级占比", field: "capMcm", isNumericRange: true },
        { title: "表面积等级占比", field: "areaSkm", isNumericRange: true },
        { title: "主要用途占比", field: "mainUse" },
        { title: "数据质量评级占比", field: "quality" },
        { title: "建成年代区间占比", field: "yearRes", isYearRange: true },
        { title: "所在国家/地区占比", field: "country" },
    ],
};
