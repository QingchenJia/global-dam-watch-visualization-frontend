# Global Dam Watch Visualization Frontend

基于 Vue 3、Vite 与 CesiumJS 构建的全球大坝/水库三维可视化前端。项目提供大坝与水库实体加载、地图筛选、统计图表、实体详情对比、时间轴过滤、智能体对话定位/筛选，以及水库环湖绕行动画等能力。

## 功能概览

- 三维地球可视化：使用 CesiumJS 初始化全球视图，并加载大坝点实体与水库多边形实体。
- 多底图切换：支持 ArcGIS World Imagery、USGS Imagery Only、Sentinel-2 Cloudless。
- 数据筛选与同步：按实体类型、流域、用途、数据质量、建成年份、国家/地区及尺寸类字段筛选，并同步更新地图实体。
- 统计分析：使用 ECharts 展示不同维度的占比图表，并支持图表 PNG 导出。
- 实体详情：点击实体后展示属性详情，支持聚焦当前实体与同类型实体对比。
- 水库环湖绕行：对水库实体生成边界巡航路线，使用 `public/models/Boat.glb` 显示小船模型并沿边缘绕行。
- GIS Agent：基于 LangChain 工具调用实现自然语言定位、筛选与普通问答。
- 语音输入：在浏览器支持 Web Speech API 时，可通过语音补充聊天输入。
- 时间轴过滤：按建成年份控制实体显示范围。
- 书签与位置信息：提供视角书签管理和鼠标/相机位置辅助信息。

## 技术栈

- Vue 3 + `<script setup>`
- Vite 5
- CesiumJS + vite-plugin-cesium
- Element Plus
- ECharts
- Axios
- LangChain、OpenAI-compatible LLM Proxy、Ollama/OpenAI 模型配置
- Node.js 原生测试模块

## 目录结构

```text
.
├─ public/
│  ├─ favicon.ico
│  └─ models/
│     └─ Boat.glb              # 水库环湖绕行小船模型
├─ src/
│  ├─ assets/
│  │  ├─ images/               # 底图缩略图、头像等静态图片
│  │  └─ styles/               # 全局与组件样式
│  ├─ components/              # Vue 展示组件
│  │  ├─ CesiumViewer.vue      # Cesium Viewer 初始化与基础实体加载
│  │  ├─ ControlPanel.vue      # 快捷操作、底图切换、图层显隐、聚合、时间轴入口
│  │  ├─ FilterPanel.vue       # 筛选表单
│  │  ├─ StatsPanel.vue        # 统计图表
│  │  ├─ EntityDescription.vue # 实体详情、对比、环湖绕行入口
│  │  ├─ AgentChat.vue         # 智能体聊天与语音输入
│  │  └─ ...
│  ├─ configs/                 # API、字段、图表、提示词配置
│  ├─ hooks/                   # 地图数据、统计筛选、智能体、书签等组合逻辑
│  ├─ knowledge/               # 筛选问答 RAG 文档、检索与向量化逻辑
│  ├─ utils/                   # Cesium 相机、图层、聚合、巡航、语音等工具
│  ├─ App.vue                  # 应用 HUD 布局
│  └─ main.js                  # 应用入口与样式注册
├─ tests/
│  └─ cruise.test.mjs          # 水库巡航工具测试
├─ index.html
├─ package.json
├─ vite.config.js
└─ README.md
```

## 快速开始

### 环境要求

- Node.js 18 或更高版本
- npm
- 可访问的后端服务，默认地址为 `http://localhost:8100`

### 安装依赖

```bash
npm install
```

### 配置环境变量

项目会读取根目录 `.env` 中的 Vite 环境变量。当前代码使用的变量包括：

```env
VITE_AGENT_MODE=
VITE_OPENAI_MODEL_NAME=
VITE_OLLAMA_MODEL_NAME=
VITE_CHAT_MODEL_NAME=
VITE_EMBEDDING_MODEL_NAME=
```

`VITE_AGENT_MODE` 用于选择智能体主模型来源，通常对应 `cloud` 或 `local`。LLM 与 Embedding 请求会通过前端配置的后端代理接口转发，不建议在前端暴露真实模型服务密钥。

代码还支持以下可选变量：

```env
VITE_EMBEDDING_BATCH_SIZE=
VITE_EMBEDDING_TIMEOUT_MS=
```

### 启动开发服务

```bash
npm run dev
```

Vite 会在终端输出本地访问地址，通常为 `http://localhost:5173`。

### 生产构建

```bash
npm run build
```

### 本地预览构建产物

```bash
npm run preview
```

## 后端接口依赖

前端 API 入口集中在 `src/configs/api.js`，默认后端地址为：

```js
const API_BASE_URL = "http://localhost:8100";
```

主要接口分组如下：

- `GET /barrier/location`、`GET /reservoir/location`：初始加载大坝/水库轻量位置数据。
- `POST /barrier/position`、`POST /reservoir/position`：按名称定位实体。
- `POST /barrier/filter`、`POST /reservoir/filter`：根据 SQL 条件筛选实体。
- `GET /barrier/{id}`、`GET /reservoir/{id}`：查询实体详情。
- `POST /barrier/stats`、`POST /reservoir/stats`：获取筛选统计数据。
- `POST /barrier/sync`、`POST /reservoir/sync`：同步筛选结果到地图。
- `/api/llm/{provider}`：LLM/Embedding 代理接口，供 LangChain 模型与 RAG 检索使用。

如需切换后端地址，修改 `src/configs/api.js` 中的 `API_BASE_URL`。

## 核心模块说明

### 地图与实体

`src/components/CesiumViewer.vue` 创建 Cesium Viewer，隐藏默认控件，设置初始中国上空俯视视角，并调用 `showLightBarrier` 与 `showLightReservoir` 加载实体。

`src/hooks/earth.js` 负责维护大坝与水库 `CustomDataSource`，将后端返回的 GeoJSON-like 几何数据解析为 Cesium 点位或多边形实体，并提供清空、显隐、年份过滤等操作。

### 仪表盘状态

`src/hooks/dashboard.js` 聚合筛选表单、统计数据、地图同步、CSV/PNG 导出等状态。`FilterPanel`、`ControlPanel`、`StatsPanel` 通过该 hook 共享当前实体类型和筛选条件。

### 智能体

`src/hooks/agent.js` 定义 GIS Agent。它会先进行意图路由，再调用定位、精确跳转或 SQL 筛选工具。筛选类请求会通过 `src/knowledge/` 中的 RAG 检索补充字段上下文，降低自然语言字段映射错误。

### 水库环湖绕行

`src/utils/cruise.js` 提供水库巡航工具：

- 判断当前实体是否为水库。
- 从水库多边形边界提取闭合路线。
- 对路线进行轻量平滑，降低转向抖动。
- 使用 `Cesium.SampledPositionProperty` 和方向回调驱动小船模型沿边界移动。
- 添加巡航路径显示，并提供 `start`、`stop`、`active` 等方法。

`EntityDescription.vue` 在选中水库时显示“环湖绕行”按钮，点击后调用巡航工具。

## 测试

当前项目包含水库巡航工具测试，可使用：

```bash
node --test tests/cruise.test.mjs
```

## 开发注意事项

- `.env`、`node_modules/`、`dist/`、`resource/` 已在 `.gitignore` 中忽略。
- `resource/` 可作为本地生成资源目录使用，不应依赖其内容进入版本控制。
- Cesium 底图中的 USGS 与 Sentinel-2 图层需要浏览器能够访问对应公网瓦片服务。
- 浏览器语音输入依赖 Web Speech API，不同浏览器支持情况不同。
- 新增 Cesium 实体交互时，优先复用 `hooks/earth.js`、`utils/camera.js`、`utils/layer.js`、`utils/cruise.js` 中已有工具，避免在组件中堆叠底层 Cesium 逻辑。
