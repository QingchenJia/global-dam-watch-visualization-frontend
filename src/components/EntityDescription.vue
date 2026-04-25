<template>
    <transition name="entity-panel-slide">
        <aside v-if="panelVisible" class="entity-description-panel">
            <div class="entity-panel-header">
                <div class="entity-panel-title-row">
                    <el-icon class="entity-panel-title-icon" aria-hidden="true">
                        <Memo />
                    </el-icon>
                    <h3 class="entity-panel-title">
                        {{ compareMode ? "对比视图" : "实体详情" }}
                    </h3>
                </div>
                <button
                    class="entity-panel-close"
                    title="关闭详情"
                    @click="closePanel"
                >
                    关闭
                </button>
            </div>

            <div class="entity-panel-actions">
                <button
                    class="entity-action-btn"
                    :disabled="!currentEntity || focusing"
                    @click="focusEntity"
                >
                    {{ focusing ? "正在聚焦" : "聚焦当前" }}
                </button>
                <button
                    class="entity-action-btn compare-toggle"
                    :class="{ active: compareMode }"
                    @click="toggleCompareMode"
                >
                    {{ compareMode ? "关闭对比" : "开启对比" }}
                </button>
            </div>

            <div
                v-if="currentRecord && (!compareMode || !nextRecord)"
                class="entity-single-wrapper"
            >
                <div class="entity-card-head">
                    <div class="entity-card-name-chip">
                        {{ currentRecord.name }}
                    </div>
                    <div class="entity-card-type">
                        {{ typeLabel(currentRecord.type) }}
                    </div>
                </div>
                <div class="entity-table-wrapper">
                    <table class="entity-table">
                        <tbody>
                            <tr
                                v-for="field in currentRecord.fields"
                                :key="field.key"
                            >
                                <th>{{ field.label }}</th>
                                <td>{{ field.display }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div
                v-else-if="currentRecord && compareMode && nextRecord"
                class="entity-compare-wrapper"
            >
                <div class="entity-card-head">
                    <div class="entity-card-name-chip current">
                        {{ currentRecord.name }}
                    </div>
                    <div class="entity-card-name-chip next">
                        {{ nextRecord.name }}
                    </div>
                    <div class="entity-card-type">
                        {{ typeLabel(currentRecord.type) }}
                    </div>
                </div>
                <div class="entity-table-wrapper compare">
                    <table class="entity-table compare">
                        <thead>
                            <tr>
                                <th class="field-col">字段</th>
                                <th class="value-col current">
                                    {{ currentRecord.name }}
                                </th>
                                <th class="value-col next">
                                    {{ nextRecord.name }}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="field in compareFields" :key="field.key">
                                <th>{{ field.label }}</th>
                                <td>
                                    <span>{{ field.currentDisplay }}</span>
                                    <span
                                        v-if="field.winner === 'current'"
                                        class="value-win-arrow current"
                                        aria-label="当前实体数值更大"
                                        title="当前实体数值更大"
                                        >领先</span
                                    >
                                </td>
                                <td>
                                    <span>{{ field.nextDisplay }}</span>
                                    <span
                                        v-if="field.winner === 'next'"
                                        class="value-win-arrow next"
                                        aria-label="对比实体数值更大"
                                        title="对比实体数值更大"
                                        >领先</span
                                    >
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </aside>
    </transition>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, toRaw } from "vue";
import axios from "axios";
import { Memo } from "@element-plus/icons-vue";
import { API_ENDPOINT } from "../configs/api.js";
import { FIELD_MAP } from "../configs/field.js";

const globalVar = defineProps({
    viewer: {
        type: Object,
        required: true,
    },
});

const focusing = ref(false);
const compareMode = ref(false);

const currentEntity = ref(null);
const nextEntity = ref(null);

const currentRecord = ref(null);
const nextRecord = ref(null);

let detachListener = null;
let requestSeq = 0;

const panelVisible = computed(() => {
    return Boolean(currentRecord.value);
});

const compareFields = computed(() => {
    if (!currentRecord.value || !nextRecord.value) {
        return [];
    }

    const map = new Map();

    // 先将当前记录的字段添加到map中
    currentRecord.value.fields.forEach((item) => {
        map.set(item.key, {
            key: item.key,
            label: item.label,
            currentDisplay: item.display,
            nextDisplay: "暂无数据",
            currentRaw: item.raw,
            nextRaw: null,
        });
    });

    // 再将之前记录的字段与map中已有字段进行合并
    nextRecord.value.fields.forEach((item) => {
        const existing = map.get(item.key);
        if (existing) {
            existing.nextDisplay = item.display;
            existing.nextRaw = item.raw;
        } else {
            map.set(item.key, {
                key: item.key,
                label: item.label,
                currentDisplay: "暂无数据",
                nextDisplay: item.display,
                currentRaw: null,
                nextRaw: item.raw,
            });
        }
    });

    return Array.from(map.values()).map((item) => {
        const currentIsNumber =
            typeof item.currentRaw === "number" &&
            Number.isFinite(item.currentRaw);
        const nextIsNumber =
            typeof item.nextRaw === "number" && Number.isFinite(item.nextRaw);

        let winner = "";
        if (currentIsNumber && nextIsNumber) {
            if (item.currentRaw > item.nextRaw) {
                winner = "current";
            } else if (item.currentRaw < item.nextRaw) {
                winner = "next";
            }
        }

        return {
            ...item,
            winner,
        };
    });
});

function typeLabel(type) {
    switch (String(type)) {
        case "barrier":
            return "大坝";
        case "reservoir":
            return "水库";
        default:
            return "未知类型";
    }
}

function normalizeValue(value) {
    if (value === null || value === undefined) {
        return "暂无数据";
    }
    if (value === -99 || value === "" || value === " ") {
        return "暂无数据";
    }
    return String(value);
}

function buildRecord(entity, detail, type) {
    const mapping = FIELD_MAP[type] || {};
    const orderedKeys = Object.keys(mapping);

    const fields = orderedKeys.map((key) => {
        const raw = detail?.[key] ?? null;
        return {
            key,
            label: mapping[key] || key,
            raw,
            display: normalizeValue(raw),
        };
    });

    return {
        type,
        name: entity.name,
        fields,
    };
}

async function fetchDetail(entity) {
    const id = entity.properties.gdwId.getValue();
    const type = entity.properties.dataType.getValue();

    if (!id || !type) {
        throw new Error("当前实体没有可查询的详细信息");
    }

    const url = API_ENDPOINT.detail[type](id);
    const res = await axios.get(url);

    if (res?.data?.code !== 1) {
        throw new Error(res?.data?.message || "详情接口返回失败");
    }

    return buildRecord(entity, res.data.data || {}, type);
}

async function onEntitySelected(entity) {
    if (!entity) {
        if (!compareMode.value) {
            // 如果没有选中实体且当前不是对比模式则清空详情面板
            currentEntity.value = null;
            currentRecord.value = null;
        }
        return;
    }

    if (compareMode.value && currentRecord.value) {
        const nextType = entity.properties.dataType.getValue();
        const currentType = currentRecord.value.type;

        // 对比模式下如果新选中实体类型与当前记录类型不同则拒绝
        if (nextType && currentType && nextType !== currentType) {
            return;
        }
    }

    const token = ++requestSeq;

    try {
        const record = await fetchDetail(entity);
        if (token !== requestSeq) {
            return;
        }

        if (compareMode.value) {
            if (!currentRecord.value) {
                // 如果当前没有记录则直接设置为当前记录
                currentEntity.value = entity;
                currentRecord.value = record;
                nextEntity.value = null;
                nextRecord.value = null;
            } else if (currentEntity.value?.id !== entity.id) {
                // 对比模式下保持首个实体为基准，后续实体只更新对比侧
                nextEntity.value = entity;
                nextRecord.value = record;
            } else {
                nextEntity.value = null;
                nextRecord.value = null;
            }
        } else {
            // 非对比模式直接替换当前记录
            currentEntity.value = entity;
            currentRecord.value = record;
            nextEntity.value = null;
            nextRecord.value = null;
        }
    } catch (error) {
        if (token !== requestSeq) {
            return;
        }
    }
}

function closePanel() {
    globalVar.viewer.selectedEntity = null;
    compareMode.value = false;
    currentEntity.value = null;
    nextEntity.value = null;
    currentRecord.value = null;
    nextRecord.value = null;
}

function toggleCompareMode() {
    compareMode.value = !compareMode.value;

    if (!compareMode.value) {
        nextEntity.value = null;
        nextRecord.value = null;
    } else if (currentRecord.value) {
        // 开启对比模式时锁定当前实体为基准实体
        nextEntity.value = null;
        nextRecord.value = null;
    }
}

async function focusEntity() {
    if (!currentEntity.value || !globalVar.viewer) return;

    focusing.value = true;
    try {
        await globalVar.viewer.flyTo(toRaw(currentEntity.value), {
            duration: 1.5,
        });
    } catch (error) {
        console.error("聚焦实体失败", error);
    } finally {
        focusing.value = false;
    }
}

onMounted(() => {
    if (!globalVar.viewer) return;

    const handler = (entity) => {
        onEntitySelected(entity);
    };

    globalVar.viewer.selectedEntityChanged.addEventListener(handler);

    if (globalVar.viewer.selectedEntity) {
        onEntitySelected(globalVar.viewer.selectedEntity);
    }

    detachListener = () => {
        globalVar.viewer.selectedEntityChanged.removeEventListener(handler);
    };
});

onUnmounted(() => {
    if (detachListener) {
        detachListener();
    }
});
</script>
