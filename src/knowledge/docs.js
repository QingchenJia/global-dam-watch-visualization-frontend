import { FILTER_TABLES } from "./schema.js";

const FIELD_GROUPS = [
    {
        topic: "identity-id",
        title: "ID fields",
        fields: ["ogc_fid", "objectid", "gdw_id"],
        aliases: [
            "id",
            "gdw id",
            "object id",
            "编号",
            "唯一标识",
            "唯一ID",
        ],
    },
    {
        topic: "identity-name",
        title: "name fields",
        fields: ["res_name", "dam_name", "alt_name"],
        aliases: [
            "name",
            "reservoir name",
            "lake name",
            "dam name",
            "alternate name",
            "名称",
            "水库名称",
            "湖泊名称",
            "大坝名称",
            "别名",
        ],
    },
    {
        topic: "identity-type",
        title: "type and control fields",
        fields: ["dam_type", "lake_ctrl", "multi_dams"],
        aliases: [
            "dam type",
            "barrier type",
            "lake control",
            "multiple dams",
            "类型",
            "坝型",
            "控制类型",
            "是否多坝",
        ],
    },
    {
        topic: "location-country",
        title: "country and region fields",
        fields: ["country", "sec_cntry"],
        aliases: [
            "country",
            "region",
            "nation",
            "国家",
            "地区",
            "国家或地区",
            "所在国家",
        ],
    },
    {
        topic: "location-admin",
        title: "administrative and city fields",
        fields: ["admin_unit", "sec_admin", "near_city", "alt_city"],
        aliases: [
            "province",
            "state",
            "admin area",
            "city",
            "行政区",
            "省",
            "州",
            "城市",
            "附近城市",
        ],
    },
    {
        topic: "location-water",
        title: "river and basin fields",
        fields: ["river", "alt_river", "main_basin", "sub_basin"],
        aliases: [
            "river",
            "basin",
            "watershed",
            "河流",
            "流域",
            "主要流域",
            "子流域",
        ],
    },
    {
        topic: "location-coordinate",
        title: "coordinate fields",
        fields: ["long_riv", "lat_riv", "long_dam", "lat_dam"],
        aliases: [
            "longitude",
            "latitude",
            "coordinate",
            "经度",
            "纬度",
            "坐标",
        ],
    },
    {
        topic: "time-built",
        title: "built year fields",
        fields: ["year_dam", "pre_year", "year_src", "alt_year", "year_txt"],
        aliases: [
            "built year",
            "completion year",
            "construction year",
            "建成年份",
            "建成时间",
            "修建年份",
            "年代",
        ],
    },
    {
        topic: "time-lifecycle",
        title: "lifecycle fields",
        fields: ["rem_year", "timeline", "year_txt"],
        aliases: [
            "removed year",
            "destroyed",
            "modified",
            "subsumed",
            "拆除年份",
            "改造",
            "销毁",
            "生命周期",
        ],
    },
    {
        topic: "metrics-dam",
        title: "dam size fields",
        fields: ["dam_hgt_m", "alt_hgt_m", "dam_len_m", "alt_len_m"],
        aliases: [
            "dam height",
            "dam length",
            "height",
            "length",
            "坝高",
            "坝长",
            "高度",
            "长度",
        ],
    },
    {
        topic: "metrics-area",
        title: "area fields",
        fields: ["area_skm", "area_poly", "area_rep", "area_max", "area_min"],
        aliases: [
            "area",
            "surface area",
            "polygon area",
            "面积",
            "表面积",
            "水面面积",
        ],
    },
    {
        topic: "metrics-capacity",
        title: "capacity fields",
        fields: ["cap_mcm", "cap_max", "cap_rep", "cap_min"],
        aliases: [
            "capacity",
            "volume",
            "storage",
            "库容",
            "容量",
            "蓄水量",
        ],
    },
    {
        topic: "metrics-hydro",
        title: "hydrology and power fields",
        fields: [
            "depth_m",
            "dis_avg_ls",
            "dor_pc",
            "elev_masl",
            "catch_skm",
            "catch_rep",
            "power_mw",
        ],
        aliases: [
            "depth",
            "discharge",
            "elevation",
            "catchment",
            "watershed area",
            "hydropower",
            "power",
            "深度",
            "流量",
            "海拔",
            "集水区",
            "流域面积",
            "发电",
            "功率",
        ],
    },
    {
        topic: "uses-main",
        title: "main use field",
        fields: ["main_use"],
        aliases: [
            "main use",
            "primary use",
            "purpose",
            "主要用途",
            "用途",
            "功能",
        ],
    },
    {
        topic: "uses-flags",
        title: "specific use fields",
        fields: [
            "use_irri",
            "use_elec",
            "use_supp",
            "use_fcon",
            "use_recr",
            "use_navi",
            "use_fish",
            "use_pcon",
            "use_live",
            "use_othr",
        ],
        aliases: [
            "irrigation",
            "hydroelectricity",
            "water supply",
            "flood control",
            "recreation",
            "navigation",
            "fisheries",
            "pollution control",
            "livestock",
            "灌溉",
            "水电",
            "供水",
            "防洪",
            "娱乐",
            "航运",
            "渔业",
            "污染控制",
            "畜牧",
        ],
    },
    {
        topic: "provenance-quality",
        title: "quality field",
        fields: ["quality"],
        aliases: [
            "quality",
            "verified",
            "reliable",
            "unreliable",
            "数据质量",
            "质量评级",
            "可靠",
            "已验证",
        ],
    },
    {
        topic: "provenance-source",
        title: "source fields",
        fields: ["data_info", "comments", "url", "editor", "orig_src", "poly_src"],
        aliases: [
            "source",
            "editor",
            "data note",
            "original source",
            "polygon source",
            "来源",
            "数据来源",
            "备注",
            "编辑者",
        ],
    },
    {
        topic: "provenance-hydro-id",
        title: "hydro id fields",
        fields: ["grand_id", "hyriv_id", "hylak_id", "hybas_l12"],
        aliases: [
            "GRanD id",
            "HydroRIVERS id",
            "HydroLAKES id",
            "HydroBASINS id",
        ],
    },
    {
        topic: "provenance-geometry",
        title: "geometry fields",
        fields: ["wkb_geometry", "instream", "shape_length", "shape_area"],
        aliases: [
            "geometry",
            "instream",
            "offstream",
            "shape",
            "几何",
            "河道内",
            "河道外",
            "形状",
        ],
    },
];

function fieldList(type, names) {
    const fields = FILTER_TABLES[type].fields;

    return names
        .filter((name) => fields[name])
        .map((name) => `${name} (${fields[name]})`)
        .join(", ");
}

function aliasText(aliases) {
    return aliases.join(", ");
}

function schemaDoc(type, group) {
    const schema = FILTER_TABLES[type];

    return {
        id: `schema:${type}:${group.topic}`,
        category: "schema",
        type,
        topic: group.topic,
        title: `${schema.tableName} ${group.title}`,
        content: [
            `Table: ${schema.tableName}. Entity type: ${type}.`,
            `适用场景: 当用户用中文或英文提到 ${group.title} 时，只使用这些字段: ${fieldList(type, group.fields)}.`,
            `中文/英文常见说法: ${aliasText(group.aliases)}.`,
            `检索提示: 中文查询优先关注别名中的中文短语，再映射到对应英文字段名。`,
        ].join("\n"),
    };
}

export const SCHEMA_DOCUMENTS = Object.keys(FILTER_TABLES).flatMap((type) =>
    FIELD_GROUPS.map((group) => schemaDoc(type, group)),
);

export const GLOSSARY_DOCUMENTS = [
    {
        id: "glossary:entity-selection",
        category: "glossary",
        topic: "entity-selection",
        title: "entity type selection",
        content: [
            "barrier means dams, weirs, locks, and hydraulic barrier structures.",
            "reservoir means reservoirs and lakes, including natural lakes when the user asks for lake or reservoir entities.",
            "中文映射: 大坝/水闸/拦河设施 -> barrier; 水库/湖泊/天然湖 -> reservoir.",
            "如果用户中文里说“湖”或“湖泊”，在筛选任务里默认按 reservoir 理解。",
        ].join("\n"),
    },
    {
        id: "glossary:text-values",
        category: "glossary",
        topic: "text-values",
        title: "text value rules",
        content: [
            "Use English values in SQL strings, for example country ILIKE 'China' or admin_unit ILIKE 'Hubei'.",
            "中文地名、国家名、用途名在生成 SQL 时应尽量映射为英文值，例如 日本 -> Japan, 中国 -> China.",
            "Missing VARCHAR values are stored as empty strings, so use field = '' or field <> '' when the request is about missing or present text.",
        ].join("\n"),
    },
    {
        id: "glossary:sql-condition",
        category: "glossary",
        topic: "sql-condition",
        title: "SQL condition boundaries",
        content: [
            "Generate a WHERE condition only, without SELECT, FROM, JOIN, ORDER BY, LIMIT, or a table name.",
            "Prefer ILIKE for fuzzy text matching and use numeric comparisons for numeric fields.",
            "中文用户常说“筛选出”“只看”“位于”“属于”“大于/小于”，都要落成 WHERE 条件片段，而不是完整 SQL.",
        ].join("\n"),
    },
    {
        id: "glossary:units",
        category: "glossary",
        topic: "units",
        title: "unit conversions",
        content: [
            "cap_mcm is million cubic meters.",
            "area_skm, area_poly, and catch_skm are square kilometers.",
            "dam_hgt_m, dam_len_m, depth_m, and elev_masl are meters.",
            "power_mw is megawatts. dis_avg_ls is liters per second. dor_pc is percent.",
            "中文单位提示: 库容通常对应 百万立方米, 表面积对应 平方千米, 深度/坝高/坝长对应 米.",
        ].join("\n"),
    },
    {
        id: "glossary:use-values",
        category: "glossary",
        topic: "use-values",
        title: "use and purpose values",
        content: [
            "Use main_use for the main purpose text, such as Hydroelectricity, Irrigation, Flood control, Water supply, Recreation, Navigation, Fisheries, Pollution control, or Multipurpose.",
            "中文映射示例: 水电 -> Hydroelectricity, 灌溉 -> Irrigation, 防洪 -> Flood control, 供水 -> Water supply, 多用途 -> Multipurpose.",
            "use_* fields commonly contain Multi, Main, Major, or Sec.",
        ].join("\n"),
    },
    {
        id: "glossary:quality-values",
        category: "glossary",
        topic: "quality-values",
        title: "quality and lifecycle values",
        content: [
            "quality examples include '1: Verified', '3: Fair', and '5: Unreliable'.",
            "timeline examples include Removed, Modified, Destroyed, and Subsumed.",
            "lake_ctrl examples include Yes, Maybe, and Enlarged.",
            "中文理解提示: 数据质量高 通常靠近 Verified, 数据质量低 通常靠近 Unreliable.",
        ].join("\n"),
    },
];

export const FILTER_RAG_DOCUMENTS = [
    ...SCHEMA_DOCUMENTS,
    ...GLOSSARY_DOCUMENTS,
];
