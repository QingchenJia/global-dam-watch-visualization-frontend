const MAIN_BASIN = [
    { label: "澧水", value: "Li Shui" },
    { label: "九龙江", value: "Jiulong" },
    { label: "洛河", value: "Lo" },
    { label: "汉江河", value: "Han" },
    { label: "雅砻江", value: "Yalong" },
    { label: "河水", value: "Yellow" },
    { label: "宁远河", value: "Ningyuan" },
    { label: "淮河", value: "Huai He" },
    { label: "白溪", value: "Baixi" },
    { label: "大凌河", value: "Daling" },
    { label: "清江", value: "Qing Jiang" },
    { label: "龙江", value: "Longjiang" },
    { label: "塔里木河", value: "Tarim" },
    { label: "闽江", value: "Min Jiang" },
    { label: "瓯江", value: "Ou Jiang" },
    { label: "汉水", value: "Han Shui" },
    { label: "海河", value: "Hai He" },
    { label: "浔江", value: "Xun Jiang" },
    { label: "资水", value: "Zi Shui" },
    { label: "长江", value: "Chang Jiang" },
    { label: "鸭绿江", value: "Yalu" },
    { label: "沱江", value: "Tuo Jiang" },
    { label: "扬子江", value: "Yangtze" },
    { label: "沅水", value: "Yuan Shui" },
    { label: "汉江", value: "Han Jiang" },
    { label: "钱塘江", value: "Qiantang Jiang" },
    { label: "曹娥江", value: "Cao'e" },
    { label: "嘉陵江", value: "Jialing Jiang" },
    { label: "粤江", value: "Pearl" },
    { label: "涪河", value: "Fu He" },
    { label: "乌江", value: "Wu Jiang" },
    { label: "珠江", value: "Zhu Jiang" },
    { label: "钱塘河", value: "Qiantang" },
    { label: "黄河", value: "Huang He" },
    { label: "北江", value: "Beijiang" },
    { label: "辽河", value: "Liao He" },
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
    { label: "Other", value: "Other" },
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
            key: "damLenM",
            label: "大坝长度(m)",
            type: "singleSelect",
            options: [
                {
                    label: "无长度信息",
                    value: {
                        eq: -99,
                    },
                },
                {
                    label: "0-10 m",
                    value: {
                        gt: 0,
                        le: 10,
                    },
                },
                {
                    label: "10-50 m",
                    value: {
                        gt: 10,
                        le: 50,
                    },
                },
                {
                    label: "50-100 m",
                    value: {
                        gt: 50,
                        le: 100,
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
            label: "国家或地区",
            type: "multiSelect",
            options: COUNTRY,
        },
        {
            key: "damHgtM",
            label: "大坝高度(m)",
            type: "singleSelect",
            options: [
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
                        le: 50,
                    },
                },
                {
                    label: "50-100 m",
                    value: {
                        gt: 50,
                        le: 100,
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
            type: "singleSelect",
            options: [
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
                        le: 10,
                    },
                },
                {
                    label: "10-100 百万m³",
                    value: {
                        gt: 10,
                        le: 100,
                    },
                },
                {
                    label: "100-1000 百万m³",
                    value: {
                        gt: 100,
                        le: 1000,
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
            type: "singleSelect",
            options: [
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
                        le: 10,
                    },
                },
                {
                    label: "10-100 km²",
                    value: {
                        gt: 10,
                        le: 100,
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
            label: "国家或地区",
            type: "multiSelect",
            options: COUNTRY,
        },
        {
            key: "depthM",
            label: "水库深度(m)",
            type: "singleSelect",
            options: [
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
                        le: 50,
                    },
                },
                {
                    label: "50-100 m",
                    value: {
                        gt: 50,
                        le: 100,
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
        { title: "所在国家或地区占比", field: "country" },
    ],
    reservoir: [
        { title: "库容等级占比", field: "capMcm", isNumericRange: true },
        { title: "表面积等级占比", field: "areaSkm", isNumericRange: true },
        { title: "主要用途占比", field: "mainUse" },
        { title: "数据质量评级占比", field: "quality" },
        { title: "建成年代区间占比", field: "yearRes", isYearRange: true },
        { title: "所在国家或地区占比", field: "country" },
    ],
};
