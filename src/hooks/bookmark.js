import { ref, watch } from "vue";
import {
    mapUpdate,
    filterManager,
    createBarrierFormState,
    createReservoirFormState,
} from "./stats.js";
import { captureCamera, flyCamera } from "../utils/camera.js";

const STORAGE_KEY = "gdw-bookmarks";

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

function getFormDefaults(type) {
    switch (type) {
        case "barrier":
            return createBarrierFormState();
        case "reservoir":
            return createReservoirFormState();
        default:
            return null;
    }
}

export function bookmarkManager() {
    const { dataType, form, setDataType } = filterManager();

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

    const getSnapshot = () => ({
        dataType: dataType.value,
        form: clone(form[dataType.value]),
    });

    const applyForm = (type, data) => {
        const defaults = getFormDefaults(type);
        if (!defaults) return;

        const target = form[type];
        Object.keys(defaults).forEach((key) => {
            const val = data[key];
            target[key] = val !== undefined ? val : defaults[key];
        });
    };

    // 保存当前状态为书签
    const saveBookmark = (viewer) => {
        if (!viewer) return;

        isSaving.value = true;
        // 获取当前表单状态和相机视角
        // 构建书签对象并保存
        try {
            const snapshot = getSnapshot();
            const camera = captureCamera(viewer);
            const name =
                bookmarkName.value.trim() ||
                `书签${bookmarks.value.length + 1}`;

            // 构建书签对象
            const payload = {
                id: `bm_${Date.now()}`,
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
    };

    const deleteBookmark = (id) => {
        bookmarks.value = bookmarks.value.filter((item) => item.id !== id);
    };

    // 应用书签状态到地图
    const applyBookmark = async (bookmark, viewer) => {
        if (!bookmark || !viewer) return;

        isApplying.value = true;
        // 根据书签数据类型和筛选条件更新地图状态
        try {
            const targetType = bookmark.dataType;
            setDataType(targetType);
            applyForm(targetType, bookmark.filterForm || {});

            await mapUpdate(
                clone(bookmark.filterForm || {}),
                targetType,
                viewer,
                () => {},
            );
            // 同步完成后飞行到书签保存的相机位置
            window.dispatchEvent(new CustomEvent("map-sync-completed"));
            await flyCamera(viewer, bookmark.camera);
        } catch (e) {
            console.error("恢复书签失败", e);
        } finally {
            isApplying.value = false;
        }
    };

    return {
        bookmarkName,
        bookmarks,
        isApplying,
        isSaving,
        saveBookmark,
        deleteBookmark,
        applyBookmark,
    };
}

export function formatDate(dateStr) {
    if (!dateStr) {
        return "";
    }

    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) {
        return "";
    }

    // 格式化为"MM-DD HH:mm"格式
    return date.toLocaleString("zh-CN", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export function formatCamera(camera) {
    if (!camera) {
        return "--";
    }

    // 经纬度保留1位小数
    // 距离以千米为单位显示
    const heightKm = camera.height ? Math.round(camera.height / 1000) : 0;
    return `${camera.lon?.toFixed?.(1) ?? "-"}°, ${camera.lat?.toFixed?.(1) ?? "-"}° / ${heightKm}km`;
}
