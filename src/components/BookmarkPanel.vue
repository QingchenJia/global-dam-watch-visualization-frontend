<template>
    <transition name="bookmark-slide">
        <div v-if="show" class="bookmark-panel">
            <div class="bookmark-header">
                <div class="bookmark-header-content">
                    <div class="quick-panel__title bookmark-title-row">
                        <el-icon
                            class="quick-panel__title-icon"
                            aria-hidden="true"
                        >
                            <CollectionTag />
                        </el-icon>
                        <div class="quick-panel__title-text">
                            <h2 class="hud-card-title">视角收藏</h2>
                        </div>
                    </div>
                </div>
                <el-button
                    class="bookmark-close"
                    text
                    circle
                    title="关闭收藏面板"
                    @click="$emit('close')"
                >
                    <el-icon><Close /></el-icon>
                </el-button>
            </div>

            <div class="bookmark-creator">
                <el-input
                    v-model="bookmarkName"
                    class="bookmark-input"
                    placeholder="书签名称，例如：长江流域大坝总览"
                    size="small"
                    clearable
                    @keyup.enter="saveBookmark(globalVar.viewer)"
                />
                <el-button
                    class="bookmark-save"
                    type="primary"
                    :loading="isSaving"
                    :disabled="!globalVar.viewer"
                    @click="saveBookmark(globalVar.viewer)"
                >
                    {{ isSaving ? "保存中..." : "保存当前" }}
                </el-button>
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
                        <el-button
                            class="bookmark-btn primary"
                            size="small"
                            type="primary"
                            :disabled="isApplying"
                            @click="applyBookmark(bookmark, globalVar.viewer)"
                        >
                            恢复
                        </el-button>
                        <el-button
                            class="bookmark-btn ghost"
                            size="small"
                            text
                            :disabled="isApplying"
                            @click="deleteBookmark(bookmark.id)"
                        >
                            删除
                        </el-button>
                    </div>
                </div>
            </div>
        </div>
    </transition>
</template>

<script setup>
import { Close, CollectionTag } from "@element-plus/icons-vue";
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
        default:
            return "";
    }
}

function getBadgeLabel(dataType) {
    switch (dataType) {
        case "barrier":
            return "大坝";
        case "reservoir":
            return "水库";
        default:
            return "未知";
    }
}
</script>
