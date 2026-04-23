import { initFilterVectorStore } from "./store.js";

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

function expandFilterQuery(query) {
    const input = String(query || "");
    const hints = [];

    if (/水库|湖泊|湖/.test(input)) {
        hints.push("reservoir lake res_name year_dam country area_skm cap_mcm");
    }

    if (/大坝|坝|水闸|闸/.test(input)) {
        hints.push("barrier dam dam_name dam_type year_dam country dam_hgt_m");
    }

    if (/国家|中国|省|城市|河流|流域|经度|纬度/.test(input)) {
        hints.push("country China admin_unit near_city river basin longitude latitude");
    }

    if (/建成|建造|年份|年代|拆除|改造/.test(input)) {
        hints.push("year_dam rem_year timeline built removed modified");
    }

    if (/高度|长度|面积|库容|容量|深度|流量|海拔|集水|发电|功率/.test(input)) {
        hints.push("height length area capacity depth discharge elevation catchment power");
    }

    if (/灌溉|水电|供水|防洪|娱乐|航运|渔业|污染|多用途|用途/.test(input)) {
        hints.push("irrigation hydroelectricity supply flood recreation navigation fisheries pollution multipurpose use");
    }

    return [input, ...hints].join(" ");
}

function detectFilterType(query) {
    const input = String(query || "");

    if (/水库|湖泊|天然湖|reservoir|lake/i.test(input)) {
        return "reservoir";
    }

    if (/大坝|水闸|拦河|barrier|dam|weir|lock/i.test(input)) {
        return "barrier";
    }

    return null;
}

function detectFilterTopics(query) {
    const input = String(query || "");
    const topics = new Set();

    if (/名称|名字|id|gdw/i.test(input)) {
        topics.add("identity-id");
        topics.add("identity-name");
    }

    if (/坝型|控制湖泊|多坝|dam type|lake control|multiple dams/i.test(input)) {
        topics.add("identity-type");
    }

    if (/国家|地区|中国|country|region|nation/i.test(input)) {
        topics.add("location-country");
    }

    if (/省|城市|行政区|州|city|province|state|admin/i.test(input)) {
        topics.add("location-admin");
    }

    if (/河流|流域|river|basin|watershed/i.test(input)) {
        topics.add("location-water");
    }

    if (/经度|纬度|坐标|longitude|latitude|coordinate/i.test(input)) {
        topics.add("location-coordinate");
    }

    if (/建成|建造|年份|年代|year|built|completion|construction/i.test(input)) {
        topics.add("time-built");
    }

    if (/拆除|改造|毁坏|生命周期|removed|modified|destroyed|subsumed/i.test(input)) {
        topics.add("time-lifecycle");
    }

    if (/高度|长度|坝高|坝长|height|length/i.test(input)) {
        topics.add("metrics-dam");
    }

    if (/面积|表面积|水面面积|area/i.test(input)) {
        topics.add("metrics-area");
    }

    if (/库容|容量|蓄水量|capacity|volume|storage/i.test(input)) {
        topics.add("metrics-capacity");
    }

    if (/深度|流量|海拔|集水|发电|功率|depth|discharge|elevation|catchment|power/i.test(input)) {
        topics.add("metrics-hydro");
    }

    if (/主要用途|多用途|用途|main use|purpose|multipurpose/i.test(input)) {
        topics.add("uses-main");
    }

    if (/灌溉|水电|供水|防洪|娱乐|航运|渔业|污染|irrigation|hydroelectricity|supply|flood|recreation|navigation|fish|pollution/i.test(input)) {
        topics.add("uses-flags");
    }

    if (/质量|可靠|验证|quality|verified|reliable|unreliable/i.test(input)) {
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
    const schemaRows = await vectorStore.similaritySearchWithScore(
        input,
        schemaK,
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
