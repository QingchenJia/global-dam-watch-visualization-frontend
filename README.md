# 全球大坝与水库三维可视化前端

基于 Vue 3、CesiumJS 和 Vite 构建的 Global Dam Watch（GDW）数据可视化前端。应用以三维地球为核心，将大坝点位、水库多边形、条件筛选、统计分析、实体详情、时间演进和 GIS 智能体整合在同一套 HUD 界面中。

## 当前功能

- **大坝与水库可视化**：分别以 Cesium 点实体和多边形实体加载，支持选择、定位、重载和独立显隐。
- **多源影像底图**：支持 ArcGIS World Imagery、USGS Imagery Only 和 Sentinel-2 Cloudless 2024。
- **点位聚合**：大坝数据源可按相机高度自动聚合，也可在快捷操作区手动开关。
- **条件筛选与地图同步**：支持在大坝/水库之间切换，并按流域、用途、质量、年份、国家或地区及类型、尺寸等字段筛选。
- **统计与导出**：通过 ECharts 展示 6 组占比图；可导出同步后的实体 CSV，以及逐图导出 PNG。
- **实体详情与对比**：点击实体加载完整属性，可聚焦目标，并对比两个同类型实体。
- **水库环湖绕行**：根据水库边界生成闭合巡航路线，驱动 `public/models/Boat.glb` 小船模型沿边界运动。
- **建设历程回放**：按建成年份过滤当前类型实体，支持播放、暂停、重置及多档速度。
- **视角书签**：保存筛选条件与相机位置；书签存放在浏览器 `localStorage` 的 `gdw-bookmarks` 项中。
- **GIS 智能体**：使用规则路由区分定位、筛选和普通问答，再通过 LangChain 和 OpenAI-compatible 后端代理执行任务；筛选任务会结合本地字段知识进行 RAG 检索。
- **语音输入**：在支持 Web Speech API 的浏览器中使用中文语音补充智能体输入。
- **位置辅助信息**：实时显示鼠标经纬度、相机高度和视角等信息。

## 技术栈

- Vue 3.5 + `<script setup>`
- Vite 5 + `@vitejs/plugin-vue` 6
- CesiumJS + `vite-plugin-cesium`
- Element Plus
- ECharts 6
- Axios
- LangChain 0.3、`@langchain/openai`
- Node.js 原生测试运行器

实际安装版本以 `package-lock.json` 为准。

## 运行要求

- Node.js `^20.19.0` 或 `>=22.12.0`（来自当前 `@vitejs/plugin-vue` 的运行要求）
- npm
- 支持 WebGL 的现代桌面浏览器
- 运行在 `http://localhost:8100` 的配套后端
- 能够访问 ArcGIS、USGS 或 EOX 的公网影像瓦片服务

语音输入是可选能力，取决于浏览器的 Web Speech API 支持和麦克风权限。

## 快速开始

### 1. 安装依赖

推荐按锁文件安装：

```bash
npm ci
```

需要更新依赖时可改用 `npm install`。

### 2. 配置智能体

在项目根目录创建或更新 `.env`：

```env
# 主 GIS Agent 使用的代理提供方：cloud 或 local
VITE_AGENT_MODE=cloud

# cloud/local 模式对应的模型名
VITE_OPENAI_MODEL_NAME=
VITE_OLLAMA_MODEL_NAME=

# 普通问答和 RAG 向量化所用模型
VITE_CHAT_MODEL_NAME=
VITE_EMBEDDING_MODEL_NAME=

# 可选，未设置时分别使用 8 和 10000
VITE_EMBEDDING_BATCH_SIZE=8
VITE_EMBEDDING_TIMEOUT_MS=10000
```

前端不会直连模型服务，也不需要保存模型 API Key。代码使用固定占位凭据 `proxy`，所有模型请求都交由后端代理鉴权和转发。不要将真实密钥写入 `VITE_*` 变量，因为 Vite 会把这些值打包到浏览器代码中。

如果只使用地图、筛选和统计功能，可以不配置模型变量，但 GIS 智能体将不可用。

### 3. 启动开发服务

```bash
npm run dev
```

Vite 默认会提供类似 `http://localhost:5173` 的访问地址，实际端口以终端输出为准。

### 4. 构建与预览

```bash
npm run build
npm run preview
```

构建产物生成在 `dist/`。

## 后端依赖

API 统一定义在 `src/configs/api.js`，当前后端基地址直接写为：

```js
const API_BASE_URL = "http://localhost:8100";
```

若后端地址不同，需要修改该常量后重新启动或构建前端。目前尚未通过环境变量配置 API 基地址。

| 方法与路径                                           | 前端用途                                        |
| ---------------------------------------------------- | ----------------------------------------------- |
| `GET /barrier/location`                              | 加载大坝轻量点位                                |
| `GET /reservoir/location`                            | 加载水库轻量多边形                              |
| `POST /barrier/position`、`POST /reservoir/position` | 按名称搜索实体                                  |
| `POST /barrier/filter`、`POST /reservoir/filter`     | 执行智能体生成的筛选条件                        |
| `GET /barrier/{id}`、`GET /reservoir/{id}`           | 获取实体完整详情                                |
| `POST /barrier/stats`、`POST /reservoir/stats`       | 获取筛选结果总量和图表数据                      |
| `POST /barrier/sync`、`POST /reservoir/sync`         | 获取筛选实体并同步到地图                        |
| `/api/llm/cloud` 或 `/api/llm/local`                 | GIS 定位/筛选所用的 OpenAI-compatible 代理基址  |
| `/api/llm/chat`                                      | 普通问答所用的 OpenAI-compatible 代理基址       |
| `/api/llm/rag`                                       | 字段知识向量化所用的 OpenAI-compatible 代理基址 |

后端返回的数据结构必须与 `src/hooks/earth.js`、`src/hooks/stats.js` 和 `src/components/EntityDescription.vue` 中的解析逻辑一致。没有后端时，前端仍可启动，但实体加载、详情、筛选、统计和智能体功能无法正常工作。

## 常用操作流程

1. 在右侧快捷操作区选择“大坝”或“水库”。
2. 在左侧条件筛选区设置条件。
3. 点击顶部“查询统计”刷新总量和图表。
4. 点击“地图同步”清空当前实体，并只加载当前类型的筛选结果。
5. 同步成功后可导出 CSV；统计图加载后可导出 PNG。
6. 点击地图实体查看详情；水库详情提供环湖绕行，同类型实体可进入对比模式。

“查询统计”和“同步地图”是两个独立请求，修改筛选条件后不会自动请求后端。

## 目录结构

```text
.
├─ public/
│  ├─ favicon.ico
│  └─ models/Boat.glb          # 环湖绕行小船模型
├─ src/
│  ├─ assets/
│  │  ├─ images/               # 底图缩略图和聊天头像
│  │  └─ styles/               # 全局及组件样式
│  ├─ components/              # HUD、地图、筛选、统计、详情等 Vue 组件
│  ├─ configs/                 # API、字段、图表和提示词配置
│  ├─ hooks/                   # 地图数据、筛选统计、智能体和书签状态
│  ├─ knowledge/               # 筛选字段知识、向量存储与 RAG 检索
│  ├─ utils/                   # 相机、图层、聚合、巡航和语音工具
│  ├─ App.vue                  # 应用整体 HUD 布局
│  └─ main.js                  # Vue 入口和全局样式注册
├─ tests/cruise.test.mjs       # 水库巡航工具测试
├─ resource/                   # 本地辅助资源，已被 Git 忽略
├─ index.html
├─ package.json
├─ package-lock.json
└─ vite.config.js
```

## 核心代码

- `src/components/CesiumViewer.vue`：创建 Viewer、设置初始视角、注册实体选择并加载轻量数据。
- `src/hooks/earth.js`：维护大坝/水库 `CustomDataSource`，解析几何数据并控制显隐和年份过滤。
- `src/hooks/dashboard.js`：集中管理筛选统计、地图同步及 CSV/PNG 导出状态。
- `src/hooks/stats.js`：组装筛选表单并调用统计、同步接口。
- `src/hooks/agent.js`：执行意图路由，定义定位、飞行和 SQL 筛选工具。
- `src/knowledge/`：为筛选任务提供字段文档、Embedding 和内存向量检索。
- `src/utils/layer.js`：配置三种影像底图。
- `src/utils/cruise.js`：生成水库边界路线并控制小船巡航生命周期。
- `src/hooks/bookmark.js`：持久化和恢复筛选条件与相机视角。

## 测试

当前仓库只有水库巡航工具测试，`package.json` 尚未定义 `test` 脚本，请直接运行：

```bash
node --test tests/cruise.test.mjs
```

## 开发说明

- `.env`、`node_modules/`、`dist/` 和 `resource/` 已在 `.gitignore` 中忽略。
- `.env` 属于本地配置；新增环境变量时，应同步更新本 README，但不要提交真实密钥。
- 书签仅保存在当前浏览器，不会同步到后端；清理站点数据会删除书签。
- 大坝与水库的轻量数据分别维护在独立 `CustomDataSource` 中，时间轴只过滤当前选择的实体类型。
- CSV 仅导出最近一次“同步地图”返回的实体；没有同步数据时不会生成文件。
- 图表 PNG 会按当前实体类型逐张下载。
- 更换底图依赖第三方公网服务，网络或跨域策略可能导致切换失败。
- 新增 Cesium 交互时，优先复用 `src/hooks/earth.js` 与 `src/utils/` 中的现有工具，保持组件层只负责界面和事件编排。
