import { ChatOpenAI } from "@langchain/openai";
import { ChatOllama } from "@langchain/ollama";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { AgentExecutor, createToolCallingAgent } from "langchain/agents";
import z from "zod";
import axios from "axios";
import { API_ENDPOINT } from "./config";

// ============================================================================
// 1. 核心模式配置
// ============================================================================
// ============================================================================
// 2. 环境与接口配置
// ============================================================================
// 统一管理不同模式下的 LLM 配置及后端业务接口地址
const agentConfig = {
    agentMode: import.meta.env.VITE_AGENT_MODE,
    // 远程模式配置 (OpenAI 兼容接口)
    cloud: {
        baseUrl: import.meta.env.VITE_OPENAI_BASE_URL,
        apiKey: import.meta.env.VITE_OPENAI_API_KEY,
        modelName: import.meta.env.VITE_OPENAI_MODEL_NAME,
    },
    // 本地模式配置 (Ollama 接口)
    local: {
        baseUrl: import.meta.env.VITE_OLLAMA_BASE_URL,
        modelName: import.meta.env.VITE_OLLAMA_MODEL_NAME,
    },
};

let agentExecutor = null;
let chatHistory = [];

// ============================================================================
// 3. Agent 初始化主流程
// ============================================================================
/**
 * 初始化 GIS 智能体
 * @param {Cesium.Viewer} viewer - Cesium 地图实例，用于执行地图操作
 */
window.initAgent = async function (viewer) {
    // 1. 获取并初始化 UI
    const ui = initUI();

    // 2. 远程模式下的必要性检查
    if (agentConfig.agentMode === "cloud" && !agentConfig.cloud.apiKey) {
        ui.addMessage(
            "agent",
            "错误: Cloud 模式下未配置 API Key，请检查 .env 文件。"
        );
        return;
    }

    try {
        // --------------------------------------------------------------------
        // A. LLM 实例初始化 (工厂模式)
        // --------------------------------------------------------------------
        let llm;
        let currentModelName;

        if (agentConfig.agentMode === "local") {
            // 初始化本地 Ollama 模型
            llm = new ChatOllama({
                baseUrl: agentConfig.local.baseUrl,
                model: agentConfig.local.modelName,
                temperature: 0,
            });
            currentModelName = agentConfig.local.modelName;
        } else if (agentConfig.agentMode === "cloud") {
            // 初始化远程 OpenAI 兼容模型
            llm = new ChatOpenAI({
                apiKey: agentConfig.cloud.apiKey,
                configuration: { baseURL: agentConfig.cloud.baseUrl },
                model: agentConfig.cloud.modelName,
                temperature: 0,
                streamUsage: false,
            });
            currentModelName = agentConfig.cloud.modelName;
        }

        // --------------------------------------------------------------------
        // B. 注册工具集
        // --------------------------------------------------------------------
        const tools = defineTools(viewer);

        // --------------------------------------------------------------------
        // C. 构建 Prompt 模板
        // --------------------------------------------------------------------
        const prompt = ChatPromptTemplate.fromMessages([
            [
                "system",
                `
                ## 角色定义
                你是一个高效的GIS操作助手，负责检索全球的"barrier"和"reservoir"。你的任务是根据用户指令调用工具，并汇报结果。

                ## 核心指令 (**最高优先级**)
                1. **结果直通 (Pass-through)**：工具执行成功并返回以"SUCCESS: "开头的内容时，**必须直接原样输出"SUCCESS: "后的内容**作为最终回答。
                2. **禁止多余思考**：严禁对工具输出进行解释、总结、翻译或润色。不要说 "根据结果..." 或 "我已经..."，直接给出结果。
                3. **非必须无视上下文**：除非明确要求，否则**禁止**参考或思考对话上下文内容，所有决策均基于当前用户输入。

                ## 数据类型
                1. **barrier**：指大坝/水闸等水工建筑物实体。
                2. **reservoir**：指水库、**自然湖泊**（如安大略湖、洪泽湖等）等蓄水实体。即使是天然湖泊，也请归类为 reservoir 进行查找。

                ## 实体定位策略 (智能上下文决策)
                当用户请求定位实体（如"定位密云水库"）时：
                1. **检测上下文 (Check Context)**：
                   - **必须**先检查历史对话。若之前已搜索过该实体且 Agent 回复中包含 ID信息 (如 "...(ID: r-28089)...")，说明已知其 ID。
                   - 在此情况下，**必须**直接调用 \`fly_to_entity\` 工具（提取并传入该 ID），**禁止**再次调用 search_and_fly。
                2. **执行搜索 (Search)**：
                   - 只有在上下文中找不到该实体的 ID 时，才调用 \`search_and_fly\` 工具。
                   - 该工具会自动执行"本地查找 -> 远程查找 -> 自动飞行"。
                   - 如果返回"未找到"，则尝试调整关键词重试。

                ## 实体过滤策略
                当用户进行条件筛选（如"查找库容大于5亿的水库"）时：
                - 调用 \`sql_filter_entity\`。
                - 根据表结构构造 SQL 条件语句。
                - 注意单位换算。

                ## 其他工具指南
                - 重置/复位 -> 使用 \`reset_view\`
                - 重新加载数据 -> 使用 \`reload_all_entities\`
                `,
            ],
            ["placeholder", "{chat_history}"],
            ["human", "{input}"],
            ["placeholder", "{agent_scratchpad}"],
        ]);

        // --------------------------------------------------------------------
        // D. 创建 Agent 执行器
        // --------------------------------------------------------------------
        const agent = createToolCallingAgent({
            llm,
            tools,
            prompt,
        });

        agentExecutor = new AgentExecutor({
            agent,
            tools,
            handleParsingErrors: true,
            maxIterations: 5,
        });

        // 3. 初始化完成反馈
        ui.clearLoading();
        ui.updateHeader(agentConfig.agentMode);
        ui.addMessage(
            "agent",
            `就绪！我是GIS助手 (模式: ${agentConfig.agentMode}, 模型: ${currentModelName})。`
        );
        bindEvents(ui);
    } catch (error) {
        console.error("Agent初始化失败:", error);
        ui.clearLoading();

        // 针对本地服务连接失败提供具体提示
        if (
            agentConfig.agentMode === "local" &&
            (error.message.includes("fetch") ||
                error.message.includes("network"))
        ) {
            ui.addMessage(
                "agent",
                `连接 Ollama 失败。请确保服务已启动 (ollama serve)。`
            );
        } else {
            ui.addMessage("agent", `初始化失败: ${error.message}`);
        }
    }
};

// ============================================================================
// 4. 工具定义层
// ============================================================================
/**
 * 定义 Agent 可调用的具体工具
 * @param {Cesium.Viewer} viewer - Cesium 视图对象
 */
function defineTools(viewer) {
    // 工具 1: 综合搜索与定位
    const searchAndFlyTool = new DynamicStructuredTool({
        name: "search_and_fly",
        description:
            "综合搜索定位工具。按名称搜索实体，优先查找本地，若无则查询远程数据库。找到后自动控制地图飞行定位。",
        schema: z.object({
            keyword: z
                .string()
                .describe(
                    "实体名称关键词(英文，尽可能简短如 'Three Gorges'、'Miyun'、'Winnipeg')"
                ),
            type: z.enum(["barrier", "reservoir"]).describe("实体类型"),
        }),
        func: async ({ keyword, type }) =>
            searchAndFlyToEntity(viewer, keyword, type),
    });

    // 工具 2: 精确ID定位实体
    const flyToEntityTool = new DynamicStructuredTool({
        name: "fly_to_entity",
        description:
            "精确ID定位工具。当上下文中已经知道实体的ID时，必须优先使用此工具进行跳转，而不是重新搜索名称。",
        schema: z.object({
            id: z
                .string()
                .describe("实体唯一ID (格式如 'b-12345' 或 'r-67890')"),
        }),
        func: async ({ id }) => {
            const entity = viewer.entities.getById(id);
            if (entity) {
                viewer.selectedEntity = entity;
                viewer.flyTo(entity, { duration: 1.5 });
                return `SUCCESS: 已定位到实体 "${entity.name}" (ID: ${id})，视角已自动调整。`;
            } else {
                return `ERROR: 不存在当前实体 (ID: ${id})。`;
            }
        },
    });

    // 工具 3: SQL 过滤实体
    const sqlFilterEntityTool = new DynamicStructuredTool({
        name: "sql_filter_entity",
        description:
            "高级过滤工具。根据SQL条件筛选实体。适用于'大于'、'小于'、'筛选'等批量查询场景。",
        schema: z.object({
            sql: z.string().describe(
                `
                    1. 仅生成一条可直接执行的 PostgreSQL + PostGIS SELECT 语句，并以分号结尾。
                    2. barrier 表：只能返回 gdw_id、wkb_geometry、dam_type、dam_name，禁止返回其他字段。
                    3. reservoir 表：只能返回 gdw_id、wkb_geometry、res_name，禁止返回其他字段。
                    4. 如涉及空间字段，禁止直接返回 wkb 二进制，必须使用：ST_AsGeoJSON(wkb_geometry) AS wkb_geometry
                    5. SQL 必须基于 M-Schema 已定义的表与字段，不得凭空构造不存在的字段。
                    6. 禁止生成 UPDATE、DELETE、INSERT 等非查询语句。
                    7. 查询条件中必须正确处理数据缺失的字段：表中 varchar 类型字段缺失数据中均采用空字符串来表示
                    8. M-Schema 定义如下：        
                        # Table: public.gdw_barrier
                        [
                        (ogc_fid:INTEGER, Primary Key, Examples: [1, 2, 3]),
                        (wkb_geometry:GEOMETRY(POINT), Examples: [POINT(-97.8635419999999 53.696359)]),
                        (objectid:NUMERIC, Examples: [37209.0, 13381.0, 39500.0]),
                        (gdw_id:NUMERIC, Examples: [37209.0, 13381.0, 39500.0]),
                        (res_name:VARCHAR, Examples: [Karatomarskoye, Red Indian, Lake Glenn Shoals]),
                        (dam_name:VARCHAR, Examples: [Balarood, Houayho, Onoike]),
                        (alt_name:VARCHAR, Examples: [CANE CREEK WATERSHED DAM 3A]),
                        (dam_type:VARCHAR, Examples: [Low Permeable Dam, Lock, Dam]),
                        (lake_ctrl:VARCHAR, Examples: [Yes, Maybe, Enlarged]),
                        (river:VARCHAR, Examples: [Alaingni Creek, Oidegawa, Molototosi]),
                        (alt_river:VARCHAR, Examples: [Contoocook River, Duan, Ouegha]),
                        (main_basin:VARCHAR, Examples: [Betsiboka, Mangamahoe, Waihopai]),
                        (sub_basin:VARCHAR, Examples: [Elefantes, Oueme, Kampe]),
                        (country:VARCHAR, Examples: [Indonesia, Bangladesh, Venezuela]),
                        (sec_cntry:VARCHAR, Examples: [El Salvador, Italy, Uruguay]),
                        (admin_unit:VARCHAR, Examples: [Giresun, Bali, Sukhothai]),
                        (sec_admin:VARCHAR, Examples: [SAN BERNARDINO, Chhattisgarh, WALKER]),
                        (near_city:VARCHAR, Examples: [Jiuzhaigou, Carmo do Cajuru, Lingchuan]),
                        (alt_city:VARCHAR, Examples: [Homa, Vereeniging, Don Matias]),
                        (year_dam:NUMERIC, Examples: [1988.0, 1944.0, 1900.0]),
                        (pre_year:NUMERIC, Examples: [2000.0, 1989.0, 1998.0]),
                        (year_src:VARCHAR, Examples: [JRC-GSW, NID, Other]),
                        (alt_year:NUMERIC, Examples: [1924.0, 1962.0, 1964.0]),
                        (rem_year:NUMERIC, Examples: [1987.0, 2005.0, 2016.0]),
                        (timeline:VARCHAR, Examples: [Subsumed, Removed, Modified]),
                        (year_txt:VARCHAR, Examples: [Built 1949 - Modified 1966]),
                        (dam_hgt_m:NUMERIC, Examples: [117.0, 33.0, 124.0]),
                        (alt_hgt_m:NUMERIC, Examples: [93.0, 44.0, 50.0]),
                        (dam_len_m:NUMERIC, Examples: [3070.0, 163.0, 8000.0]),
                        (alt_len_m:NUMERIC, Examples: [124.0, 2000.0, 252.0]),
                        (area_skm:DOUBLE PRECISION, Examples: [4.168, 0.473, 42.794]),
                        (area_poly:DOUBLE PRECISION, Examples: [4.168, 0.473, 42.794]),
                        (area_rep:DOUBLE PRECISION, Examples: [79.2, 7.365, 44.6]),
                        (area_max:DOUBLE PRECISION, Examples: [39.0, 68.0, 11.0]),
                        (area_min:DOUBLE PRECISION, Examples: [1000.0, 0.9, 760.0]),
                        (cap_mcm:DOUBLE PRECISION, Examples: [1444.1, 14.1, 60.5]),
                        (cap_max:DOUBLE PRECISION, Examples: [44.2, 1518.2, 173.8]),
                        (cap_rep:DOUBLE PRECISION, Examples: [1444.1, 14.1, 60.5]),
                        (cap_min:DOUBLE PRECISION, Examples: [787.5, 57.0, 7100.0]),
                        (depth_m:DOUBLE PRECISION, Examples: [0.0, 60.5, 159.600006103516]),
                        (dis_avg_ls:NUMERIC, Examples: [140257.0, 2747.0, 39058.0]),
                        (dor_pc:DOUBLE PRECISION, Examples: [224.899993896484, 621.900024414062, 767.700012207031]),
                        (elev_masl:NUMERIC, Examples: [2865.0, 204.0, 2482.0]),
                        (catch_skm:NUMERIC, Examples: [55879.0, 4773.0, 30922.0]),
                        (catch_rep:NUMERIC, Examples: [59160.0, 13580.0, 1330.0]),
                        (power_mw:DOUBLE PRECISION, Examples: [0.0, 1000.0, 24.3]),
                        (data_info:VARCHAR, Examples: [Capacity from statistics - Eq 2]),
                        (use_irri:VARCHAR, Examples: [Multi, Main, Major]),
                        (use_elec:VARCHAR, Examples: [Multi, Main, Major]),
                        (use_supp:VARCHAR, Examples: [Multi, Main, Major]),
                        (use_fcon:VARCHAR, Examples: [Multi, Main, Major]),
                        (use_recr:VARCHAR, Examples: [Multi, Main, Sec]),
                        (use_navi:VARCHAR, Examples: [Multi, Main, Major]),
                        (use_fish:VARCHAR, Examples: [Multi, Main, Major]),
                        (use_pcon:VARCHAR, Examples: [Multi, Main, Sec]),
                        (use_live:VARCHAR, Examples: [Sec]),
                        (use_othr:VARCHAR, Examples: [Multi, Main, Sec]),
                        (main_use:VARCHAR, Examples: [Pollution control, Hydroelectricity, Multipurpose]),
                        (multi_dams:VARCHAR, Examples: [Yes]),
                        (comments:VARCHAR),
                        (url:VARCHAR),
                        (quality:VARCHAR, Examples: [5: Unreliable, 3: Fair, 1: Verified]),
                        (editor:VARCHAR, Examples: [UNH, McGill-TX, McGill-MA]),
                        (long_riv:DOUBLE PRECISION, Examples: [-0.403180345999942, -90.0760059999999, 115.181201]),
                        (lat_riv:DOUBLE PRECISION, Examples: [27.868694197, 36.789122311, 20.774666768]),
                        (long_dam:DOUBLE PRECISION, Examples: [107.172427114, 133.745862076, -41.7284490854585]),
                        (lat_dam:DOUBLE PRECISION, Examples: [29.4655917147, 33.1152704958877, 27.3618654545]),
                        (orig_src:VARCHAR, Examples: [GROD-NID, Other, GRanD]),
                        (poly_src:VARCHAR, Examples: [UY, No Polygon, Other]),
                        (grand_id:NUMERIC, Examples: [4773.0, 2747.0, 2482.0]),
                        (hyriv_id:NUMERIC, Examples: [41243498.0, 41044980.0, 40674650.0]),
                        (instream:VARCHAR, Examples: [Offstream, Instream]),
                        (hylak_id:NUMERIC, Examples: [16336.0, 1373069.0, 174466.0]),
                        (hybas_l12:DOUBLE PRECISION, Examples: [7121099760.0, 0.0, 2120425050.0])
                        ]
                        # Table: public.gdw_reservoir
                        [
                        (ogc_fid:INTEGER, Primary Key, Examples: [1, 2, 3]),
                        (wkb_geometry:GEOMETRY(MULTIPOLYGON),Examples:[MULTIPOLYGON(((-96.9260430229998 36.8243969726566, -96.9252777777741 36.824166666667, -96.9239054361943 36.8246904839413, -96.9232047526006 36.82626030816, -96.9211775716109 36.8290969509553, -96.9212719726526 36.830273166233, -96.9223714192673 36.8309619140628, -96.9227137586769 36.8317287868926, -96.9251907009512 36.8346213107642, -96.9258610026006 36.8368478732642, -96.926743977861 36.8367770724829, -96.9279994032082 36.8335308159726, -96.9279673936595 36.8315898980039, -96.9275857204825 36.8309060329864, -96.9265530056387 36.826764322917, -96.925941026472 36.8256673177088, -96.9260430229998 36.8243969726566)))]),
                        (objectid:NUMERIC, Examples: [13381.0, 28089.0, 799.0]),
                        (gdw_id:NUMERIC, Examples: [28089.0, 799.0, 24481.0]),
                        (res_name:VARCHAR, Examples: [Karatomarskoye, Red Indian, Lake Glenn Shoals]),
                        (dam_name:VARCHAR, Examples: [Onoike, Houayho, Nalan]),
                        (alt_name:VARCHAR, Examples: [CANE CREEK WATERSHED DAM 3A]),
                        (dam_type:VARCHAR, Examples: [Low Permeable Dam, Lock, Dam]),
                        (lake_ctrl:VARCHAR, Examples: [Yes, Maybe, Enlarged]),
                        (river:VARCHAR, Examples: [Alaingni Creek, Oidegawa, Kamiichigawa]),
                        (alt_river:VARCHAR, Examples: [Contoocook River, Duan, Ouegha]),
                        (main_basin:VARCHAR, Examples: [Betsiboka, Mangamahoe, Waihopai]),
                        (sub_basin:VARCHAR, Examples: [Elefantes, Oueme, Kampe]),
                        (country:VARCHAR, Examples: [Indonesia, Bangladesh, Venezuela]),
                        (sec_cntry:VARCHAR, Examples: [Italy, Uruguay, Cameroon]),
                        (admin_unit:VARCHAR, Examples: [Bali, Sukhothai, Karlovarský]),
                        (sec_admin:VARCHAR, Examples: [ULSTER, WHATCOM, Giresun]),
                        (near_city:VARCHAR, Examples: [Jiuzhaigou, Carmo do Cajuru, Lingchuan]),
                        (alt_city:VARCHAR, Examples: [Homa, Vereeniging, Don Matias]),
                        (year_dam:NUMERIC, Examples: [1988.0, 1944.0, 1900.0]),
                        (pre_year:NUMERIC, Examples: [2000.0, 1989.0, 1998.0]),
                        (year_src:VARCHAR, Examples: [JRC-GSW, NID, Other]),
                        (alt_year:NUMERIC, Examples: [1924.0, 1962.0, 1964.0]),
                        (rem_year:NUMERIC, Examples: [2003.0, 1987.0, 2002.0]),
                        (timeline:VARCHAR, Examples: [Removed, Modified, Destroyed]),
                        (year_txt:VARCHAR, Examples: [Built 1949 - Modified 1966]),
                        (dam_hgt_m:NUMERIC, Examples: [117.0, 33.0, 124.0]),
                        (alt_hgt_m:NUMERIC, Examples: [93.0, 44.0, 50.0]),
                        (dam_len_m:NUMERIC, Examples: [3070.0, 163.0, 8000.0]),
                        (alt_len_m:NUMERIC, Examples: [124.0, 2000.0, 252.0]),
                        (area_skm:DOUBLE PRECISION, Examples: [4.168, 0.473, 42.794]),
                        (area_poly:DOUBLE PRECISION, Examples: [4.168, 0.473, 42.794]),
                        (area_rep:DOUBLE PRECISION, Examples: [79.2, 7.365, 44.6]),
                        (area_max:DOUBLE PRECISION, Examples: [39.0, 68.0, 11.0]),
                        (area_min:DOUBLE PRECISION, Examples: [1000.0, 0.9, 760.0]),
                        (cap_mcm:DOUBLE PRECISION, Examples: [1444.1, 14.1, 60.5]),
                        (cap_max:DOUBLE PRECISION, Examples: [44.2, 1518.2, 173.8]),
                        (cap_rep:DOUBLE PRECISION, Examples: [1444.1, 14.1, 60.5]),
                        (cap_min:DOUBLE PRECISION, Examples: [787.5, 57.0, 7100.0]),
                        (depth_m:DOUBLE PRECISION, Examples: [0.0, 60.5, 159.600006103516]),
                        (dis_avg_ls:NUMERIC, Examples: [4773.0, 140257.0, 2747.0]),
                        (dor_pc:DOUBLE PRECISION, Examples: [224.899993896484, 621.900024414062, 767.700012207031]),
                        (elev_masl:NUMERIC, Examples: [204.0, 2482.0, 1070.0]),
                        (catch_skm:NUMERIC, Examples: [204.0, 4773.0, 30922.0]),
                        (catch_rep:NUMERIC, Examples: [59160.0, 13580.0, 1330.0]),
                        (power_mw:DOUBLE PRECISION, Examples: [48.1, 1.8, 0.0]),
                        (data_info:VARCHAR, Examples: [Capacity from statistics - Eq 2]),
                        (use_irri:VARCHAR, Examples: [Multi, Main, Major]),
                        (use_elec:VARCHAR, Examples: [Multi, Main, Major]),
                        (use_supp:VARCHAR, Examples: [Multi, Main, Major]),
                        (use_fcon:VARCHAR, Examples: [Multi, Main, Major]),
                        (use_recr:VARCHAR, Examples: [Multi, Main, Sec]),
                        (use_navi:VARCHAR, Examples: [Multi, Main, Major]),
                        (use_fish:VARCHAR, Examples: [Multi, Main, Major]),
                        (use_pcon:VARCHAR, Examples: [Multi, Main, Sec]),
                        (use_live:VARCHAR, Examples: [Sec]),
                        (use_othr:VARCHAR, Examples: [Multi, Main, Sec]),
                        (main_use:VARCHAR, Examples: [Pollution control, Hydroelectricity, Multipurpose]),
                        (multi_dams:VARCHAR, Examples: [Yes]),
                        (comments:VARCHAR),
                        (url:VARCHAR),
                        (quality:VARCHAR, Examples: [5: Unreliable, 3: Fair, 1: Verified]),
                        (editor:VARCHAR, Examples: [UNH, McGill-TX, McGill-MA]),
                        (long_riv:DOUBLE PRECISION, Examples: [-90.0760059999999, 115.181201, -72.6660416669999]),
                        (lat_riv:DOUBLE PRECISION, Examples: [27.868694197, 36.789122311, 20.774666768]),
                        (long_dam:DOUBLE PRECISION, Examples: [19.6013654962, 10.9265436681, -68.7077887491]),
                        (lat_dam:DOUBLE PRECISION, Examples: [27.6676489242, 48.0130177701, 50.2413450265]),
                        (orig_src:VARCHAR, Examples: [GROD-NID, Other, GRanD]),
                        (poly_src:VARCHAR, Examples: [Other, SWBD, JRC-GSW]),
                        (grand_id:NUMERIC, Examples: [4773.0, 2747.0, 2482.0]),
                        (hyriv_id:NUMERIC, Examples: [41243498.0, 41044980.0, 40674650.0]),
                        (instream:VARCHAR, Examples: [Offstream, Instream]),
                        (hylak_id:NUMERIC, Examples: [16336.0, 1373069.0, 174466.0]),
                        (hybas_l12:DOUBLE PRECISION, Examples: [6120406470.0, 4121508690.0, 2120685640.0]),
                        (shape_length:DOUBLE PRECISION, Examples: [0.08588079250678, 0.0424254338660635, 0.0193721577721688]),
                        (shape_area:DOUBLE PRECISION, Examples: [0.00018992758547819, 4.60430052748586e-05, 1.7304645538329e-05])
                        ]
                    `
            ),
            type: z.enum(["barrier", "reservoir"]).describe("实体类型"),
        }),
        func: async ({ sql, type }) => sqlFilterEntity(viewer, sql, type),
    });

    // 工具 4: 重置视角
    const resetViewTool = new DynamicStructuredTool({
        name: "reset_view",
        description: "重置地图视角到中国默认区域。执行即完成。",
        schema: z.object({
            // 将参数改为空对象，明确告诉模型这是一个无参动作
        }),
        func: async () => {
            viewer.selectedEntity = null;
            viewer.camera.flyTo({
                destination: Cesium.Cartesian3.fromDegrees(
                    105.0,
                    35.0,
                    20000000
                ),
                duration: 1.5,
            });
            return "SUCCESS: 视角已重置。";
        },
    });

    // 工具 5: 重新加载全部实体数据
    const reloadAllEntitiesTool = new DynamicStructuredTool({
        name: "reload_all_entities",
        description: "重新加载全部数据。执行即完成。",
        schema: z.object({
            // 将参数改为空对象，明确告诉模型这是一个无参动作
        }),
        func: async () => {
            window.showLightBarrier(viewer);
            window.showLightReservoir(viewer);
            return "SUCCESS: 数据已重载。";
        },
    });

    return [
        searchAndFlyTool,
        flyToEntityTool,
        sqlFilterEntityTool,
        resetViewTool,
        reloadAllEntitiesTool,
    ];
}

// ============================================================================
// 5. 业务逻辑实现层
// ============================================================================

/**
 * 综合搜索与定位逻辑
 * 策略：
 * 1. 本地模糊匹配 (优先) -> 找到则飞行
 * 2. 远程API精确查询 (兜底) -> 加载 -> 飞行
 */
async function searchAndFlyToEntity(viewer, keyword, type) {
    // ------------------------------------------------------------------------
    // Step 1: 本地查找
    // ------------------------------------------------------------------------
    const entities = viewer.entities.values;

    // 在本地数据中查找
    const localTarget = entities.find((e) => {
        if (e.properties?.dataType?.getValue() !== type) return false;
        return e.name.includes(keyword);
    });

    if (localTarget) {
        viewer.selectedEntity = localTarget;
        viewer.flyTo(localTarget, { duration: 1.5 });
        return `SUCCESS: 本地已找到实体 "${localTarget.name}" (ID: ${localTarget.id})，视角已自动定位。`;
    }

    // ------------------------------------------------------------------------
    // Step 2: 远程查找
    // ------------------------------------------------------------------------
    try {
        const url = API_ENDPOINT.position[type];
        // 调用后端 API
        const res = await axios.post(url, keyword, {
            headers: { "Content-Type": "text/plain" },
        });

        if (res.data.code === 1 && res.data.data) {
            const item = res.data.data;

            let entityId = null;
            let entityName = null;

            // 根据类型加载实体
            if (type === "barrier") {
                entityId = "b-" + item.gdwId;
                entityName = item.dam_name || "Barrier #" + item.gdwId;
            } else if (type === "reservoir") {
                entityId = "r-" + item.gdwId;
                entityName = item.res_name || "Reservoir #" + item.gdwId;
            }

            const entity = viewer.entities.getById(entityId);
            if (entity) {
                viewer.selectedEntity = entity;
                viewer.flyTo(entity, { duration: 1.5 });
                return `SUCCESS: 远程数据库查找到 "${entityName}" (ID: ${entityId})，已加载并自动定位。`;
            } else {
                return `ERROR: 数据库查找到数据，但实体加载失败 (ID: ${entityId})。`;
            }
        }

        return `ERROR: 未找到名为 "${keyword}" 的${type}实体 (本地与远程均无结果)。`;
    } catch (error) {
        return `ERROR: 搜索过程出错: ${error.message}`;
    }
}

/**
 * 执行 SQL 过滤逻辑
 * 1. 清空当前实体
 * 2. 调用后端过滤接口
 * 3. 重新渲染结果
 */
async function sqlFilterEntity(viewer, sql, type) {
    try {
        const url = API_ENDPOINT.filter[type];
        // 1. 移除当前加载的全部实体
        viewer.entities.removeAll();

        // 2. 调用后端接口
        // 假设后端接收纯文本的 SQL 语句
        const res = await axios.post(url, sql, {
            headers: { "Content-Type": "text/plain" },
        });

        if (res.data.code === 1 && Array.isArray(res.data.data)) {
            const data = res.data.data;
            if (data.length === 0) {
                return "查询成功，但未找到符合条件的实体。";
            }

            // 3. 重新渲染
            // 复用 window 上挂载的渲染函数 (来自 app.js)
            data.forEach((item) => {
                if (type === "barrier" && window.loadBarrierEntity) {
                    window.loadBarrierEntity(viewer, item);
                } else if (type === "reservoir" && window.loadReservoirEntity) {
                    window.loadReservoirEntity(viewer, item);
                }
            });

            // 自动缩放视角以包含所有结果
            viewer.zoomTo(viewer.entities);

            return `SUCCESS: 查询成功！已筛选 ${data.length} 个符合条件的${type}实体。`;
        } else {
            return `ERROR: 查询失败: ${res.data.message || "未知错误"}`;
        }
    } catch (error) {
        return `ERROR: 查询出错: ${error.message}`;
    }
}

// ============================================================================
// 6. UI 交互层
// ============================================================================

/**
 * 绑定输入框与发送按钮事件
 */
function bindEvents(ui) {
    const handleSend = async () => {
        const text = ui.input.value.trim();
        if (!text || ui.sendBtn.disabled) return;

        ui.sendBtn.disabled = true;
        ui.sendBtn.style.opacity = "0.6";

        // 显示用户消息
        ui.addMessage("user", text);
        ui.input.value = "";

        // 核心修复：这里需要 addMessage 返回 ID，否则 loadingId 为 undefined
        const loadingId = ui.addMessage("agent", "思考中...", true);

        try {
            if (!agentExecutor) throw new Error("Agent未初始化");

            // 调用 Agent 执行器处理输入，并传入历史上下文
            const result = await agentExecutor.invoke({
                input: text,
                chat_history: chatHistory,
            });

            // 记录本轮对话到历史
            chatHistory.push(new HumanMessage(text));
            chatHistory.push(new AIMessage(result.output));

            // 简单防溢出处理：保留最近20条消息
            if (chatHistory.length > 20) {
                chatHistory = chatHistory.slice(chatHistory.length - 20);
            }

            ui.updateMessage(loadingId, result.output);
        } catch (e) {
            console.error(e);
            ui.updateMessage(loadingId, `执行出错: ${e.message}`);
        } finally {
            ui.sendBtn.disabled = false;
            ui.sendBtn.style.opacity = "1";
            ui.input.focus();
        }
    };

    ui.sendBtn.onclick = handleSend;
    ui.input.onkeypress = (e) => e.key === "Enter" && handleSend();
}

/**
 * 初始化聊天窗口逻辑
 */
function initUI() {
    const container = document.getElementById("agent-chat-container");
    const messagesContainer = document.getElementById("agent-messages");
    const toggleBtn = document.getElementById("agent-toggle");
    const titleSpan = document.getElementById("agent-title");
    const input = document.getElementById("agent-input");
    const sendBtn = document.getElementById("agent-send-btn");

    if (!container || !messagesContainer || !input || !sendBtn) {
        console.error("Agent UI elements not found in index.html");
        return null;
    }

    // 最小化/展开切换
    toggleBtn.onclick = () => container.classList.toggle("minimized");
    // 点击标头也可以切换
    container.querySelector(".agent-header").onclick = (e) => {
        if (e.target !== toggleBtn) container.classList.toggle("minimized");
    };

    return {
        input: input,
        sendBtn: sendBtn,
        container: container,
        messagesContainer: messagesContainer,
        toggleBtn: toggleBtn,
        titleSpan: titleSpan,

        updateHeader: (mode) => {
            titleSpan.textContent = `🦜🔗 GIS Agent (${mode})`;
        },

        scrollToBottom: () => {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        },

        addMessage: (role, text, loading) => {
            const msgDiv = document.createElement("div");
            msgDiv.className = `message ${role} ${loading ? "loading" : ""}`;

            if (!loading) {
                text = text.replace(/\n/g, "<br>");
            }
            msgDiv.innerHTML = text;

            if (loading) msgDiv.id = "agent-loading-msg";

            messagesContainer.appendChild(msgDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;

            return msgDiv.id;
        },

        updateMessage: (id, text) => {
            if (!id) return; // 安全检查
            const msgDiv = document.getElementById(id);
            if (msgDiv) {
                msgDiv.innerHTML = text.replace(/\n/g, "<br>");
                msgDiv.classList.remove("loading");
                msgDiv.removeAttribute("id");
            }
        },

        clearLoading: () => {
            const loadingMsg = document.getElementById("agent-loading-msg");
            if (loadingMsg) loadingMsg.remove();
        },
    };
}
