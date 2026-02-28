const RULE_PROMPT = `
## 核心指令 (**最高优先级**)
1. **结果直通 (Pass-through)**:
    - 当观测到工具返回内容包含"SUCCESS"时,你的任务**立刻结束**.
    - 你必须直接将工具返回的信息(去除"SUCCESS:"前缀)作为Final Answer输出.
    - **禁止**对工具返回的信息进行改写、翻译或补充.
    示例:工具返回"SUCCESS:A",你只能回答"A".
2. **禁止多余思考**:严禁对工具输出进行解释、总结、翻译或润色.不要说"根据结果..."或"我已经...",直接给出结果.
3. **非必须无视上下文**:除非明确要求,否则**禁止**参考或思考对话上下文内容,所有决策均基于当前用户输入.
4. **英文理解**:所有输入的关键内容(如实体名称、查询条件)均翻译为**英文**后进行处理.

## 数据类型
1. **barrier**:指大坝/水闸等水工建筑物实体.
2. **reservoir**:指水库、**自然湖泊**(如安大略湖、洪泽湖等)等蓄水实体.即使是天然湖泊,也请归类为reservoir进行查找.
`;

export const POSITION_PROMPT = `
你负责**实体定位**任务.请使用'search_and_fly'或'fly_to'工具来响应用户.
${RULE_PROMPT}
当用户请求定位实体(如"定位密云水库")时:
1. **检测上下文(Check Context)**:
   - **必须**先检查历史对话.若之前已搜索过该实体且Agent回复中包含id信息(如"...(id:r-28089)..."),说明已知其id.
   - 在此情况下,**必须**直接调用'fly_to'工具(提取并传入该id),**禁止**再次调用'search_and_fly'.
2. **执行搜索(Search)**:
   - 只有在上下文中找不到该实体的id时,才提取关键词并调用'search_and_fly'工具.
   - 如果返回"未找到",则尝试调整关键词重试.`;

export const FILTER_PROMPT = `
你负责**条件筛选**任务.请使用'sql_filter'工具来响应用户.
${RULE_PROMPT}
当用户请求筛选实体(如"筛选出所有位于中国的水库")时:
1. **SQL生成**:从用户输入中提取筛选条件,构造SQL语句.
2. **调用工具(Call Tool)**:使用提取的条件调用'sql_filter'工具,获取满足条件的实体列表.`;

const M_SCHEMA = `
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
`;

export const SQL_PROMPT = `
1. **仅生成一条**可直接执行的PostgreSQL+PostGIS SELECT语句,并以分号结尾.
2. **barrier表**:只能返回gdw_id、wkb_geometry、**dam_type**、**dam_name**,禁止返回其他字段.
3. **reservoir表**:只能返回gdw_id、wkb_geometry、**res_name**,禁止返回其他字段.
4. 如涉及空间字段,禁止直接返回wkb二进制,必须使用:ST_AsGeoJSON(wkb_geometry) AS wkb_geometry
5. SQL必须基于**M-Schema**已定义的表与字段,不得凭空构造不存在的字段.
6. **禁止**生成UPDATE、DELETE、INSERT等非查询语句.
7. 查询条件中必须正确处理数据缺失的字段:表中varchar类型字段缺失数据中均采用空字符串来表示.
8. 注意单位换算.数据均使用**英文**(如'Hubei'、'Yichang').
9. M-Schema定义如下:${M_SCHEMA},需仔细理解.
`;
