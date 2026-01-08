// 字段中英文映射表
export const FIELD_MAPPING = {
    /**
     * 大坝 (Barrier) 字段中英文映射表
     * 对应表: GDW_BARRIER
     */
    barrier: {
        // --- 1. 核心标识与几何字段 ---
        ogcFid: "系统主键",
        objectid: "原始对象ID",
        gdwId: "全球大坝ID",

        // --- 2. 名称与类型信息 ---
        resName: "对应水库名称",
        damName: "大坝名称",
        altName: "水库备用名称",
        damType: "大坝类型",
        lakeCtrl: "湖泊控制类型",

        // --- 3. 地理位置信息 ---
        river: "所在河流",
        altRiver: "备用河流名",
        mainBasin: "主要流域",
        subBasin: "子流域",
        country: "所在国家",
        secCntry: "第二国家",
        adminUnit: "行政单位",
        secAdmin: "第二行政单位",
        nearCity: "附近城市",
        altCity: "备用城市",

        // --- 4. 时间信息 ---
        yearDam: "建成年份",
        preYear: "前期年份",
        yearSrc: "年份来源",
        altYear: "备选年份",
        remYear: "拆除年份",
        timeline: "时间线分类",
        yearTxt: "年份描述",

        // --- 5. 大坝物理特征 ---
        damHgtM: "大坝高度(m)",
        altHgtM: "备选高度(m)",
        damLenM: "大坝长度(m)",
        altLenM: "备选长度(m)",

        // --- 6. 相关水库特征(引用信息) ---
        areaSkm: "对应水库表面积(km²)",
        areaRep: "报告水库面积",
        areaMax: "最大水库面积",
        areaMin: "最小水库面积",
        capMcm: "对应水库库容(百万m³)",
        capMax: "最大库容",
        capRep: "报告库容",
        capMin: "最小库容",
        depthM: "水库深度(m)",

        // --- 7. 水文特征 ---
        disAvgLs: "平均流量(L/s)",
        dorPc: "泄洪道百分比",
        elevMasl: "海拔高度(m)",
        catchSkm: "集水区面积(km²)",
        catchRep: "报告集水区面积",

        // --- 8. 功能用途 ---
        powerMw: "发电功率(MW)",
        useIrri: "灌溉用途",
        useElec: "发电用途",
        useSupp: "供水用途",
        useFcon: "防洪用途",
        useRecr: "娱乐用途",
        useNavi: "航运用途",
        useFish: "渔业用途",
        usePcon: "污染控制",
        useLive: "牲畜用水",
        useOthr: "其他用途",
        mainUse: "主要用途",

        // --- 9. 坐标信息 ---
        longRiv: "河流经度",
        latRiv: "河流纬度",
        longDam: "大坝经度",
        latDam: "大坝纬度",

        // --- 10. 元数据信息 ---
        dataInfo: "数据信息说明",
        multiDams: "多座大坝",
        comments: "注释",
        url: "相关网址",
        quality: "数据质量评级",
        editor: "编辑者",
        origSrc: "原始数据源",
        polySrc: "多边形数据源(引用)",

        // --- 11. 关联ID字段 ---
        grandId: "GRanD ID",
        hyrivId: "HydroRIVERS ID",
        instream: "河道内",
        hylakId: "HydroLAKES ID",
        hybasL12: "HydroBASINS ID",
    },

    /**
     * 水库 (Reservoir) 字段中英文映射表
     * 对应表: GDW_RESERVOIR
     */
    reservoir: {
        // --- 1. 核心标识与几何字段 ---
        ogcFid: "系统主键",
        objectid: "原始对象ID",
        gdwId: "全球大坝ID",

        // --- 2. 名称与类型信息 ---
        resName: "水库名称",
        damName: "对应大坝名称",
        altName: "大坝备用名称",
        damType: "大坝类型",
        lakeCtrl: "湖泊控制类型",

        // --- 3. 地理位置信息 ---
        river: "所在河流",
        altRiver: "备用河流名",
        mainBasin: "主要流域",
        subBasin: "子流域",
        country: "所在国家",
        secCntry: "第二国家",
        adminUnit: "行政单位",
        secAdmin: "第二行政单位",
        nearCity: "附近城市",
        altCity: "备用城市",

        // --- 4. 时间信息 ---
        yearDam: "建成年份",
        preYear: "前期年份",
        yearSrc: "年份来源",
        altYear: "备选年份",
        remYear: "拆除年份",
        timeline: "时间线分类",
        yearTxt: "年份描述",

        // --- 5. 尺寸容量数据 ---
        damHgtM: "大坝高度(m)",
        altHgtM: "备选高度(m)",
        damLenM: "大坝长度(m)",
        altLenM: "备选长度(m)",
        areaSkm: "表面积(km²)",
        areaPoly: "多边形计算面积",
        areaRep: "报告面积",
        areaMax: "最大面积",
        areaMin: "最小面积",
        capMcm: "库容(百万m³)",
        capMax: "最大库容",
        capRep: "报告库容",
        capMin: "最小库容",
        depthM: "深度(m)",

        // --- 6. 水文特征 ---
        disAvgLs: "平均流量(L/s)",
        dorPc: "泄洪道百分比",
        elevMasl: "海拔高度(m)",
        catchSkm: "集水区面积(km²)",
        catchRep: "报告集水区面积",

        // --- 7. 功能用途 ---
        powerMw: "发电功率(MW)",
        useIrri: "灌溉用途",
        useElec: "发电用途",
        useSupp: "供水用途",
        useFcon: "防洪用途",
        useRecr: "娱乐用途",
        useNavi: "航运用途",
        useFish: "渔业用途",
        usePcon: "污染控制",
        useLive: "牲畜用水",
        useOthr: "其他用途",
        mainUse: "主要用途",

        // --- 8. 坐标信息 ---
        longRiv: "河流经度",
        latRiv: "河流纬度",
        longDam: "大坝经度",
        latDam: "大坝纬度",

        // --- 9. 元数据信息 ---
        dataInfo: "数据信息说明",
        multiDams: "多座大坝",
        comments: "注释",
        url: "相关网址",
        quality: "数据质量评级",
        editor: "编辑者",
        origSrc: "原始数据源",
        polySrc: "多边形数据源",

        // --- 10. 关联ID ---
        grandId: "GRanD ID",
        hyrivId: "HydroRIVERS ID",
        instream: "河道内",
        hylakId: "HydroLAKES ID",
        hybasL12: "HydroBASINS ID",

        // --- 11. 几何计算字段 ---
        shapeLength: "形状周长",
        shapeArea: "形状面积",
    },
};

// 业务数据查询接口
export const API_ENDPOINT = {
    position: {
        barrier: "http://localhost:8100/barrier/position",
        reservoir: "http://localhost:8100/reservoir/position",
    },
    filter: {
        barrier: "http://localhost:8100/barrier/filter",
        reservoir: "http://localhost:8100/reservoir/filter",
    },
    detail: {
        barrier: "http://localhost:8100/barrier/",
        reservoir: "http://localhost:8100/reservoir/",
    },
    location: {
        barrier: "http://localhost:8100/barrier/location",
        reservoir: "http://localhost:8100/reservoir/location",
    },
};
