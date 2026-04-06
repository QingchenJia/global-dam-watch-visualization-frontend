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
                    placeholder="书签名称(如：长江流域大坝全貌)"
                    @keyup.enter="saveBookmark(globalVar.viewer)"
                />
                <button
                    class="bookmark-save"
                    :disabled="isSaving || !globalVar.viewer"
                    @click="saveBookmark(globalVar.viewer)"
                >
                    {{ isSaving ? "保存中···" : "保存当前" }}
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
                            <span class="bookmark-tag">{{
                                formatCamera(bookmark.camera)
                            }}</span>
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
import {
    bookmarkManager,
    formatDate,
    formatCamera,
} from "../hooks/bookmark.js";

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

defineEmits(["close"]);

const {
    bookmarkName,
    bookmarks,
    isApplying,
    isSaving,
    saveBookmark,
    deleteBookmark,
    applyBookmark,
} = bookmarkManager();

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
