import { initFilterVectorStore } from "./store.js";

const STRUCTURED_FILTER_SPECS = [
    {
        pattern: /主要流域|main basin|basin/i,
        topic: "location-water",
        hint: "river basin watershed main_basin sub_basin",
    },
    {
        pattern: /主要用途|main use|purpose/i,
        topic: "uses-main",
        hint: "main use purpose multipurpose main_use",
    },
    {
        pattern: /数据质量|quality/i,
        topic: "provenance-quality",
        hint: "quality verified reliable unreliable",
    },
    {
        pattern: /建成年份|built year|completion year|construction year/i,
        topic: "time-built",
        hint: "year_dam built year completion construction",
    },
    {
        pattern: /国家或地区|国家|地区|country|region|nation/i,
        topic: "location-country",
        hint: "country region nation sec_cntry",
    },
    {
        pattern: /库容|capacity|volume|storage/i,
        topic: "metrics-capacity",
        hint: "capacity volume storage cap_mcm cap_max cap_rep cap_min",
    },
    {
        pattern: /表面积|面积|surface area|area/i,
        topic: "metrics-area",
        hint: "area surface area area_skm area_poly area_rep area_max area_min",
    },
    {
        pattern: /水库深度|深度|depth/i,
        topic: "metrics-hydro",
        hint: "depth depth_m hydrology",
    },
    {
        pattern: /大坝类型|坝型|dam type|barrier type/i,
        topic: "identity-type",
        hint: "dam type barrier type lake control multiple dams",
    },
    {
        pattern: /大坝长度|坝长|dam length/i,
        topic: "metrics-dam",
        hint: "dam length length dam_len_m alt_len_m",
    },
    {
        pattern: /大坝高度|坝高|dam height/i,
        topic: "metrics-dam",
        hint: "dam height height dam_hgt_m alt_hgt_m",
    },
];

const STRUCTURED_FILTER_ORDER_SPECS = {
    common: {
        1: "location-water",
        2: "uses-main",
        3: "provenance-quality",
        4: "time-built",
        5: "location-country",
    },
    reservoir: {
        6: "metrics-capacity",
        7: "metrics-area",
        8: "metrics-hydro",
    },
    barrier: {
        6: "identity-type",
        7: "metrics-dam",
        8: "metrics-dam",
    },
};

const TOPIC_HINTS = {
    "location-water": "river basin watershed main_basin sub_basin",
    "uses-main": "main use purpose multipurpose main_use",
    "provenance-quality": "quality verified reliable unreliable",
    "time-built": "year_dam built year completion construction",
    "location-country": "country region nation sec_cntry",
    "metrics-capacity": "capacity volume storage cap_mcm cap_max cap_rep cap_min",
    "metrics-area": "area surface area area_skm area_poly area_rep area_max area_min",
    "metrics-hydro": "depth depth_m hydrology",
    "identity-type": "dam type barrier type lake control multiple dams",
    "metrics-dam": "dam height dam length height length dam_hgt_m dam_len_m",
};

function toContextDoc([document, score]) {
    return {
        pageContent: document.pageContent,
        metadata: {
            ...document.metadata,
            score,
        },
    };
}

function dedupe(rows) {
    const seen = new Set();
    const docs = [];

    rows.forEach((row) => {
        const id = row[0].metadata.id;

        if (!seen.has(id)) {
            seen.add(id);
            docs.push(toContextDoc(row));
        }
    });

    return docs;
}

function parseStructuredFilterQuery(query) {
    const input = String(query || "");
    const lines = input.split(/\r?\n/);
    const parsed = {
        task: "",
        type: "",
        hasFilterList: false,
        filledFilters: [],
    };
    let topLevelValueIndex = 0;

    lines.forEach((line) => {
        const trimmed = line.trim();

        if (!trimmed) {
            return;
        }

        const topLevelMatch = trimmed.match(/^-\s*\*\*.+?\*\*\s*[：:]\s*(.*?)\s*$/);
        if (topLevelMatch) {
            const value = topLevelMatch[1].trim();

            if (topLevelValueIndex === 0) {
                parsed.task = value;
            } else if (topLevelValueIndex === 1) {
                parsed.type = value;
            }

            topLevelValueIndex += 1;
            return;
        }

        const filterMatch = trimmed.match(
            /^(\d+)\.\s*\*\*(.+?)\*\*\s*[：:]\s*(.*?)\s*$/,
        );
        if (!filterMatch) {
            return;
        }

        parsed.hasFilterList = true;

        const index = Number.parseInt(filterMatch[1], 10);
        const label = filterMatch[2].trim();
        const value = filterMatch[3].trim();

        if (!value) {
            return;
        }

        parsed.filledFilters.push({ index, label, value });
    });

    return parsed;
}

function normalizeType(type) {
    if (/水库|湖泊|湖|reservoir|lake/i.test(type)) {
        return "reservoir";
    }

    if (/大坝|水闸|闸|堰|barrier|dam|weir|lock/i.test(type)) {
        return "barrier";
    }

    return null;
}

function findStructuredFilterSpec(label, index, type) {
    const byLabel = STRUCTURED_FILTER_SPECS.find(({ pattern }) => pattern.test(label));

    if (byLabel) {
        return byLabel;
    }

    const commonTopic = STRUCTURED_FILTER_ORDER_SPECS.common[index];

    if (commonTopic) {
        return {
            topic: commonTopic,
            hint: TOPIC_HINTS[commonTopic] || "",
        };
    }

    const normalizedType = normalizeType(type);

    if (!normalizedType) {
        return null;
    }

    const topic = STRUCTURED_FILTER_ORDER_SPECS[normalizedType]?.[index];

    if (!topic) {
        return null;
    }

    return {
        topic,
        hint: TOPIC_HINTS[topic] || "",
    };
}

function expandStructuredFilterQuery(query) {
    const parsed = parseStructuredFilterQuery(query);

    if (!parsed.hasFilterList || !parsed.filledFilters.length) {
        return "";
    }

    const parts = [String(query || "")];

    if (parsed.type) {
        parts.push(parsed.type);
    }

    parsed.filledFilters.forEach(({ index, label, value }) => {
        parts.push(`${label} ${value}`);

        const spec = findStructuredFilterSpec(label, index, parsed.type);
        if (spec?.hint) {
            parts.push(spec.hint);
        }
    });

    return parts.join(" ");
}

function expandFilterQuery(query) {
    const input = String(query || "");
    const structuredQuery = expandStructuredFilterQuery(input);
    const hints = [];

    if (structuredQuery) {
        return structuredQuery;
    }

    if (/水库|湖泊|湖|reservoir|lake/i.test(input)) {
        hints.push("reservoir lake res_name year_dam country area_skm cap_mcm");
    }

    if (/大坝|水闸|闸|堰|barrier|dam|weir|lock/i.test(input)) {
        hints.push("barrier dam dam_name dam_type year_dam country dam_hgt_m");
    }

    if (/国家|地区|中国|城市|河流|流域|经度|纬度|country|region|nation/i.test(input)) {
        hints.push("country China admin_unit near_city river basin longitude latitude");
    }

    if (/建成|新建|修建|兴建|建造|建于|年份|年代|拆除|改造|以后|以前|之前|之后|year|built|completion|construction/i.test(input)) {
        hints.push("year_dam rem_year timeline built removed modified");
    }

    if (/高度|长度|面积|库容|容量|深度|流量|海拔|集水|发电|功率|height|length|area|capacity|depth/i.test(input)) {
        hints.push("height length area capacity depth discharge elevation catchment power");
    }

    if (/灌溉|水电|供水|防洪|娱乐|航运|渔业|污染|多用途|用途|irrigation|hydroelectricity|supply|flood|recreation|navigation|fish|pollution/i.test(input)) {
        hints.push("irrigation hydroelectricity supply flood recreation navigation fisheries pollution multipurpose use");
    }

    return [input, ...hints].join(" ");
}

function detectStructuredFilterType(query) {
    const parsed = parseStructuredFilterQuery(query);

    if (!parsed.hasFilterList || !parsed.type) {
        return null;
    }

    return normalizeType(parsed.type);
}

function detectFilterType(query) {
    const input = String(query || "");
    const structuredType = detectStructuredFilterType(input);

    if (structuredType) {
        return structuredType;
    }

    return normalizeType(input);
}

function detectStructuredFilterTopics(query) {
    const parsed = parseStructuredFilterQuery(query);
    const topics = new Set();

    if (!parsed.hasFilterList) {
        return topics;
    }

    parsed.filledFilters.forEach(({ index, label }) => {
        const spec = findStructuredFilterSpec(label, index, parsed.type);

        if (spec) {
            topics.add(spec.topic);
        }
    });

    return topics;
}

function detectFilterTopics(query) {
    const input = String(query || "");
    const structuredTopics = detectStructuredFilterTopics(input);

    if (structuredTopics.size) {
        return structuredTopics;
    }

    const topics = new Set();

    if (/名称|名字|id|gdw/i.test(input)) {
        topics.add("identity-id");
        topics.add("identity-name");
    }

    if (/坝型|大坝类型|控制湖泊|多坝|dam type|lake control|multiple dams/i.test(input)) {
        topics.add("identity-type");
    }

    if (/国家|地区|中国|country|region|nation/i.test(input)) {
        topics.add("location-country");
    }

    if (/省|州|城市|行政区|city|province|state|admin/i.test(input)) {
        topics.add("location-admin");
    }

    if (/河流|流域|主要流域|river|basin|watershed/i.test(input)) {
        topics.add("location-water");
    }

    if (/经度|纬度|坐标|longitude|latitude|coordinate/i.test(input)) {
        topics.add("location-coordinate");
    }

    if (/建成|新建|修建|兴建|建造|建于|建成年份|年份|年代|以后|以前|之前|之后|year|built|completion|construction/i.test(input)) {
        topics.add("time-built");
    }

    if (/拆除|改造|损坏|生命周期|removed|modified|destroyed|subsumed/i.test(input)) {
        topics.add("time-lifecycle");
    }

    if (/高度|长度|坝高|坝长|大坝高度|大坝长度|height|length/i.test(input)) {
        topics.add("metrics-dam");
    }

    if (/面积|表面积|水面面积|area/i.test(input)) {
        topics.add("metrics-area");
    }

    if (/库容|容量|蓄水量|capacity|volume|storage/i.test(input)) {
        topics.add("metrics-capacity");
    }

    if (/深度|水库深度|流量|海拔|集水|发电|功率|depth|discharge|elevation|catchment|power/i.test(input)) {
        topics.add("metrics-hydro");
    }

    if (/主要用途|多用途|用途|main use|purpose|multipurpose/i.test(input)) {
        topics.add("uses-main");
    }

    if (/灌溉|水电|供水|防洪|娱乐|航运|渔业|污染|irrigation|hydroelectricity|supply|flood|recreation|navigation|fish|pollution/i.test(input)) {
        topics.add("uses-flags");
    }

    if (/质量|数据质量|可靠|验证|quality|verified|reliable|unreliable/i.test(input)) {
        topics.add("provenance-quality");
    }

    if (/来源|数据源|编辑者|source|editor/i.test(input)) {
        topics.add("provenance-source");
    }

    if (/grand|hyriv|hylak|hybas|hydro/i.test(input)) {
        topics.add("provenance-hydro-id");
    }

    if (/几何|河道内|河道外|geometry|instream|offstream|shape/i.test(input)) {
        topics.add("provenance-geometry");
    }

    return topics;
}

export async function retrieveFilterDocuments(
    query,
    { schemaK = 4, glossaryK = 1 } = {},
) {
    const vectorStore = await initFilterVectorStore();
    const input = expandFilterQuery(query);
    const type = detectFilterType(query);
    const topics = detectFilterTopics(query);
    const typeMultiplier = type ? 1 : 2;
    const effectiveSchemaK = topics.size
        ? Math.max(schemaK, topics.size * typeMultiplier)
        : schemaK;
    const schemaRows = await vectorStore.similaritySearchWithScore(
        input,
        effectiveSchemaK,
        (document) => {
            if (document.metadata.category !== "schema") {
                return false;
            }

            if (type && document.metadata.type !== type) {
                return false;
            }

            if (topics.size && !topics.has(document.metadata.topic)) {
                return false;
            }

            return true;
        },
    );
    const glossaryRows = await vectorStore.similaritySearchWithScore(
        input,
        glossaryK,
        (document) => document.metadata.category === "glossary",
    );

    return dedupe([...schemaRows, ...glossaryRows].sort((a, b) => b[1] - a[1]));
}
