<template>
    <transition name="bookmark-slide">
        <div v-if="show" class="bookmark-panel">
            <div class="bookmark-header">
                <div class="bookmark-header-content">
                    <div class="bookmark-title">视角收藏</div>
                    <div class="bookmark-subtitle">
                        保存当前相机视角和实体状态
                    </div>
                </div>
                <button
                    class="bookmark-close"
                    title="关闭收藏面板"
                    @click="$emit('close')"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>

            <div class="bookmark-creator">
                <input
                    class="bookmark-input"
                    v-model="bookmarkName"
                    type="text"
                    placeholder="书签名称(如:长江流域大坝全貌)"
                    @keyup.enter="handleSave(globalVar.viewer)"
                />
                <button
                    class="bookmark-save"
                    :disabled="isSaving || !globalVar.viewer"
                    @click="handleSave(globalVar.viewer)"
                >
                    {{ isSaving ? "保存中..." : "保存当前" }}
                </button>
            </div>

            <div class="bookmark-list">
                <div
                    v-for="bookmark in bookmarks"
                    :key="bookmark.id"
                    class="bookmark-card"
                >
                    <div class="bookmark-card-main">
                        <div class="bookmark-name">{{ bookmark.name }}</div>
                        <div class="bookmark-meta">
                            <span
                                class="bookmark-badge"
                                :class="getBadgeClass(bookmark.dataType)"
                            >
                                {{ getBadgeLabel(bookmark.dataType) }}
                            </span>
                            <span class="bookmark-date">{{
                                formatDate(bookmark.createdAt)
                            }}</span>
                        </div>
                        <div class="bookmark-tags">
                            <span class="bookmark-tag"
                                >视角 {{ formatCamera(bookmark.camera) }}</span
                            >
                        </div>
                    </div>
                    <div class="bookmark-actions">
                        <button
                            class="bookmark-btn primary"
                            :disabled="isApplying"
                            @click="applyBookmark(bookmark, globalVar.viewer)"
                        >
                            恢复
                        </button>
                        <button
                            class="bookmark-btn ghost"
                            :disabled="isApplying"
                            @click="deleteBookmark(bookmark.id)"
                        >
                            删除
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </transition>
</template>

<script setup>
import { ref, watch } from "vue";
import { dataSync, useFilter } from "../hooks/stats.js";
import { captureCamera, flyCamera } from "../utils/camera.js";

const globalVar = defineProps({
    viewer: {
        type: Object,
        required: true,
    },
    show: {
        type: Boolean,
        default: false,
    },
});

const emit = defineEmits(["close"]);

// 使用共享状态管理
const { getSnapshot, applyForm, setDataType } = useFilter();

const STORAGE_KEY = "gdw-bookmarks";
const bookmarkName = ref("");
const bookmarks = ref(loadBookmarks());
const isApplying = ref(false);
const isSaving = ref(false);

watch(
    bookmarks,
    (val) => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(val));
        } catch (e) {
            console.warn("保存书签失败", e);
        }
    },
    { deep: true },
);

function loadBookmarks() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        console.warn("读取书签失败", e);
        return [];
    }
}

function clone(obj) {
    try {
        return JSON.parse(JSON.stringify(obj || {}));
    } catch (e) {
        console.warn("书签数据复制失败", e);
        return {};
    }
}

function handleSave(viewer) {
    if (!viewer) return;
    isSaving.value = true;
    try {
        // 直接从共享状态获取快照
        const snapshot = getSnapshot();
        const camera = captureCamera(viewer);
        const name =
            bookmarkName.value.trim() || `书签${bookmarks.value.length + 1}`;

        const payload = {
            id: `bm_${bookmarks.value.length + 1}`,
            name,
            dataType: snapshot.dataType,
            filterForm: snapshot.form,
            camera,
            createdAt: new Date().toISOString(),
        };

        bookmarks.value = [payload, ...bookmarks.value];
        bookmarkName.value = "";
    } finally {
        isSaving.value = false;
    }
}

function deleteBookmark(id) {
    bookmarks.value = bookmarks.value.filter((bookmark) => bookmark.id !== id);
}

async function applyBookmark(bookmark, viewer) {
    if (!bookmark || !viewer) return;
    isApplying.value = true;
    try {
        // 恢复共享状态
        const targetType = bookmark.dataType || "barrier";
        setDataType(targetType);
        applyForm(targetType, bookmark.filterForm || {});

        await dataSync(
            viewer,
            clone(bookmark.filterForm || {}),
            targetType,
            () => {},
        );
        window.dispatchEvent(new CustomEvent("map-sync-completed"));
        await flyCamera(viewer, bookmark.camera);
    } catch (e) {
        console.error("恢复书签失败", e);
    } finally {
        isApplying.value = false;
    }
}

function formatDate(dateStr) {
    if (!dateStr) {
        return "";
    }
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) {
        return "";
    }
    return date.toLocaleString("zh-CN", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function formatCamera(camera) {
    if (!camera) {
        return "--";
    }
    const heightKm = camera.height ? Math.round(camera.height / 1000) : 0;
    return `${camera.lon?.toFixed?.(1) ?? "-"}°, ${camera.lat?.toFixed?.(1) ?? "-"}° / ${heightKm}km`;
}

function getBadgeClass(dataType) {
    switch (dataType) {
        case "barrier":
            return "badge-barrier";
        case "reservoir":
            return "badge-reservoir";
    }
}

function getBadgeLabel(dataType) {
    switch (dataType) {
        case "barrier":
            return "大坝";
        case "reservoir":
            return "水库";
    }
}
</script>
