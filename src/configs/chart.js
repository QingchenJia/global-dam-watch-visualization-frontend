const MAIN_BASIN = [
    { label: "长江", value: "Chang Jiang" },
    { label: "扬子江", value: "Yangtze" },
    { label: "黄河", value: "Huang He" },
    { label: "河水", value: "Yellow" },
    { label: "汉水", value: "Han Shui" },
    { label: "汉江", value: "Han Jiang" },
    { label: "珠江", value: "Zhu Jiang" },
    { label: "粤江", value: "Pearl" },
    { label: "钱塘江", value: "Qiantang Jiang" },
    { label: "钱塘河", value: "Qiantang" },
    { label: "澧水", value: "Li Shui" },
    { label: "九龙江", value: "Jiulong" },
    { label: "洛河", value: "Lo" },
    { label: "汉江河", value: "Han" },
    { label: "雅砻江", value: "Yalong" },
    { label: "宁远河", value: "Ningyuan" },
    { label: "淮河", value: "Huai He" },
    { label: "白溪", value: "Baixi" },
    { label: "大凌河", value: "Daling" },
    { label: "清江", value: "Qing Jiang" },
    { label: "龙江", value: "Longjiang" },
    { label: "塔里木河", value: "Tarim" },
    { label: "闽江", value: "Min Jiang" },
    { label: "瓯江", value: "Ou Jiang" },
    { label: "海河", value: "Hai He" },
    { label: "浔江", value: "Xun Jiang" },
    { label: "资水", value: "Zi Shui" },
    { label: "鸭绿江", value: "Yalu" },
    { label: "沱江", value: "Tuo Jiang" },
    { label: "沅水", value: "Yuan Shui" },
    { label: "曹娥江", value: "Cao'e" },
    { label: "嘉陵江", value: "Jialing Jiang" },
    { label: "涪河", value: "Fu He" },
    { label: "乌江", value: "Wu Jiang" },
    { label: "北江", value: "Beijiang" },
    { label: "辽河", value: "Liao He" },
];

const MAIN_USE = [
    { label: "灌溉", value: "Irrigation" },
    { label: "水力发电", value: "Hydroelectricity" },
    { label: "供水", value: "Water supply" },
    { label: "防洪", value: "Flood control" },
    { label: "娱乐", value: "Recreation" },
    { label: "航运", value: "Navigation" },
    { label: "渔业", value: "Fisheries" },
    { label: "污染控制", value: "Pollution control" },
    { label: "多功能", value: "Multipurpose" },
    { label: "其他", value: "Other" },
];

const COUNTRY = [
    { label: "中国", value: "China" },
    { label: "美国", value: "United States" },
    { label: "印度", value: "India" },
    { label: "巴西", value: "Brazil" },
    { label: "日本", value: "Japan" },
    { label: "加拿大", value: "Canada" },
    { label: "俄罗斯", value: "Russia" },
    { label: "土耳其", value: "Turkey" },
    { label: "南非", value: "South Africa" },
    { label: "印度尼西亚", value: "Indonesia" },
    { label: "墨西哥", value: "Mexico" },
    { label: "澳大利亚", value: "Australia" },
    { label: "法国", value: "France" },
    { label: "西班牙", value: "Spain" },
    { label: "韩国", value: "South Korea" },
];

const QUALITY = [
    { label: "已验证", value: "1: Verified" },
    { label: "良好", value: "2: Good" },
    { label: "一般", value: "3: Fair" },
    { label: "糟糕", value: "4: Poor" },
    { label: "不可靠", value: "5: Unreliable" },
];

export const FORM_FIELD = {
    barrier: [
        {
            key: "damType",
            label: "大坝类型",
            type: "multiSelect",
            options: [
                { label: "一般类", value: "Dam" },
                { label: "湖泊控制类", value: "Lake Control Dam" },
                { label: "低渗透类", value: "Low Permeable Dam" },
                { label: "船闸类", value: "Lock" },
            ],
        },
        {
            key: "damLenM",
            label: "大坝长度(m)",
            type: "singleSelect",
            options: [
                // 无效或未填充字段赋值为-1
                // 标记为无效数据
                // 后端进行解析时过滤掉值为-1的条件
                // 部分条件值允许为0
                {
                    label: "无长度信息",
                    value: {
                        eq: -99,
                        gt: -1,
                        ge: -1,
                        lt: -1,
                        le: -1,
                    },
                },
                {
                    label: "0-10 m",
                    value: {
                        eq: -1,
                        gt: 0,
                        ge: -1,
                        lt: -1,
                        le: 10,
                    },
                },
                {
                    label: "10-50 m",
                    value: {
                        eq: -1,
                        gt: 10,
                        ge: -1,
                        lt: -1,
                        le: 50,
                    },
                },
                {
                    label: "50-100 m",
                    value: {
                        eq: -1,
                        gt: 50,
                        ge: -1,
                        lt: -1,
                        le: 100,
                    },
                },
                {
                    label: ">100 m",
                    value: {
                        eq: -1,
                        gt: 100,
                        ge: -1,
                        lt: -1,
                        le: -1,
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
                        eq: -1,
                        gt: -1,
                        ge: -1,
                        lt: 20,
                        le: -1,
                    },
                },
                {
                    label: "20-50 m",
                    value: {
                        eq: -1,
                        gt: 20,
                        ge: -1,
                        lt: -1,
                        le: 50,
                    },
                },
                {
                    label: "50-100 m",
                    value: {
                        eq: -1,
                        gt: 50,
                        ge: -1,
                        lt: -1,
                        le: 100,
                    },
                },
                {
                    label: ">100 m",
                    value: {
                        eq: -1,
                        gt: 100,
                        ge: -1,
                        lt: -1,
                        le: -1,
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
                        eq: -1,
                        gt: -1,
                        ge: -1,
                        lt: 1,
                        le: -1,
                    },
                },
                {
                    label: "1-10 百万m³",
                    value: {
                        eq: -1,
                        gt: 1,
                        ge: -1,
                        lt: -1,
                        le: 10,
                    },
                },
                {
                    label: "10-100 百万m³",
                    value: {
                        eq: -1,
                        gt: 10,
                        ge: -1,
                        lt: -1,
                        le: 100,
                    },
                },
                {
                    label: "100-1000 百万m³",
                    value: {
                        eq: -1,
                        gt: 100,
                        ge: -1,
                        lt: -1,
                        le: 1000,
                    },
                },
                {
                    label: ">1000 百万m³",
                    value: {
                        eq: -1,
                        gt: 1000,
                        ge: -1,
                        lt: -1,
                        le: -1,
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
                        eq: -1,
                        gt: -1,
                        ge: -1,
                        lt: 1,
                        le: -1,
                    },
                },
                {
                    label: "1-10 km²",
                    value: {
                        eq: -1,
                        gt: 1,
                        ge: -1,
                        lt: -1,
                        le: 10,
                    },
                },
                {
                    label: "10-100 km²",
                    value: {
                        eq: -1,
                        gt: 10,
                        ge: -1,
                        lt: -1,
                        le: 100,
                    },
                },
                {
                    label: ">100 km²",
                    value: {
                        eq: -1,
                        gt: 100,
                        ge: -1,
                        lt: -1,
                        le: -1,
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
                        eq: -1,
                        gt: -1,
                        ge: -1,
                        lt: 10,
                        le: -1,
                    },
                },
                {
                    label: "10-50 m",
                    value: {
                        eq: -1,
                        gt: 10,
                        ge: -1,
                        lt: -1,
                        le: 50,
                    },
                },
                {
                    label: "50-100 m",
                    value: {
                        eq: -1,
                        gt: 50,
                        ge: -1,
                        lt: -1,
                        le: 100,
                    },
                },
                {
                    label: ">100 m",
                    value: {
                        eq: -1,
                        gt: 100,
                        ge: -1,
                        lt: -1,
                        le: -1,
                    },
                },
            ],
        },
    ],
};

export const CHART_CONFIG = {
    barrier: [
        { title: "大坝类型占比", field: "damType" },
        { title: "发电功率占比", field: "powerMw", isNumericRange: true },
        { title: "主要用途占比", field: "mainUse" },
        { title: "数据质量评级占比", field: "quality" },
        { title: "建成年代占比", field: "yearDam", isYearRange: true },
        { title: "所在国家或地区占比", field: "country" },
    ],
    reservoir: [
        { title: "库容占比", field: "capMcm", isNumericRange: true },
        { title: "表面积占比", field: "areaSkm", isNumericRange: true },
        { title: "主要用途占比", field: "mainUse" },
        { title: "数据质量评级占比", field: "quality" },
        { title: "建成年代占比", field: "yearDam", isYearRange: true },
        { title: "所在国家或地区占比", field: "country" },
    ],
};
