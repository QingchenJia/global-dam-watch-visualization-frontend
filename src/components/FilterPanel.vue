<template>
    <section class="filter-panel hud-card">
        <header class="filter-panel__header">
            <div class="filter-panel__header-main">
                <div class="quick-panel__title filter-title-row">
                    <span class="quick-panel__title-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24">
                            <path d="M3 5h18l-7 8v5l-4 2v-7L3 5z" />
                        </svg>
                    </span>
                    <div class="quick-panel__title-text">
                        <h2 class="hud-card-title">条件筛选</h2>
                    </div>
                </div>
            </div>

            <button
                type="button"
                class="filter-panel__reset"
                @click="resetDashboardFilters"
            >
                重置条件
            </button>
        </header>

        <div class="filter-panel__body hud-scrollbar">
            <template v-for="field in activeFormField" :key="field.key">
                <div
                    v-if="
                        field.type === 'multiSelect' ||
                        field.type === 'singleSelect'
                    "
                    class="filter-group"
                >
                    <label class="filter-label">{{ field.label }}</label>
                    <div
                        class="filter-select"
                        :class="{ open: openDropdown === field.key }"
                    >
                        <button
                            type="button"
                            class="filter-select__trigger"
                            :ref="(el) => setTriggerRef(el, field.key)"
                            @click.stop="toggleDropdown(field.key)"
                        >
                            <span>{{ getSelectText(field) }}</span>
                            <svg viewBox="0 0 10 6">
                                <path d="M0 0l5 6 5-6z" />
                            </svg>
                        </button>
                        <Teleport to="body">
                            <div
                                v-show="openDropdown === field.key"
                                class="filter-select__panel hud-scrollbar"
                                :style="dropdownStyle"
                                @click.stop
                            >
                                <template v-if="field.type === 'multiSelect'">
                                    <label
                                        v-for="option in field.options"
                                        :key="option.value"
                                        class="filter-select__option"
                                    >
                                        <input
                                            v-model="activeForm[field.key]"
                                            type="checkbox"
                                            :value="option.value"
                                        />
                                        <span>{{ option.label }}</span>
                                    </label>
                                </template>
                                <template v-else>
                                    <button
                                        type="button"
                                        class="filter-select__single"
                                        :class="{
                                            active: isSingleSelected(
                                                field.key,
                                                '',
                                            ),
                                        }"
                                        @click="selectSingle(field.key, '')"
                                    >
                                        全部
                                    </button>
                                    <button
                                        v-for="option in field.options"
                                        :key="option.value"
                                        type="button"
                                        class="filter-select__single"
                                        :class="{
                                            active: isSingleSelected(
                                                field.key,
                                                option.value,
                                            ),
                                        }"
                                        @click="
                                            selectSingle(
                                                field.key,
                                                option.value,
                                            )
                                        "
                                    >
                                        {{ option.label }}
                                    </button>
                                </template>
                            </div>
                        </Teleport>
                    </div>
                </div>

                <div
                    v-else-if="field.type === 'yearRange'"
                    class="filter-group"
                >
                    <label class="filter-label">{{ field.label }}</label>
                    <div class="filter-range">
                        <input
                            class="hud-input filter-range__input"
                            type="text"
                            inputmode="numeric"
                            maxlength="4"
                            placeholder="起始年份"
                            :value="activeForm.year?.[0] ?? ''"
                            @input="onYearInput('yearFrom', $event)"
                        />
                        <span>至</span>
                        <input
                            class="hud-input filter-range__input"
                            type="text"
                            inputmode="numeric"
                            maxlength="4"
                            placeholder="结束年份"
                            :value="activeForm.year?.[1] ?? ''"
                            @input="onYearInput('yearTo', $event)"
                        />
                    </div>
                </div>
            </template>
        </div>
    </section>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import { FORM_FIELD } from "../configs/chart.js";
import { useDashboard } from "../hooks/dashboard.js";

const { dataType, activeForm, resetDashboardFilters } = useDashboard();

const activeFormField = computed(() => FORM_FIELD[dataType.value] || []);

const openDropdown = ref("");
const dropdownStyle = ref({});
const triggerRefs = {};

function setTriggerRef(el, key) {
    if (el) {
        triggerRefs[key] = el;
    }
}

function toggleDropdown(key) {
    if (openDropdown.value === key) {
        openDropdown.value = "";
        return;
    }

    const triggerEl = triggerRefs[key];
    if (triggerEl) {
        const rect = triggerEl.getBoundingClientRect();

        dropdownStyle.value = {
            top: `${rect.bottom + 4}px`,
            left: `${rect.left}px`,
            width: `${rect.width}px`,
        };
    }

    openDropdown.value = key;
}

function closeAllDropdowns() {
    openDropdown.value = "";
}

function getSelectText(field) {
    const value = activeForm.value[field.key];

    if (field.type === "multiSelect") {
        if (!value || value.length === 0) {
            return "全部";
        }

        if (value.length === 1) {
            const option = field.options.find(
                (item) => item.value === value[0],
            );
            return option ? option.label : value[0];
        }

        return `已选 ${value.length} 项`;
    }

    if (value === "" || value === undefined || value === null) {
        return "全部";
    }

    const option = field.options.find(
        (item) => JSON.stringify(item.value) === JSON.stringify(value),
    );

    return option ? option.label : "全部";
}

function isSingleSelected(key, value) {
    const current = activeForm.value[key];

    if (value === "") {
        return current === "";
    }

    return JSON.stringify(current) === JSON.stringify(value);
}

function selectSingle(key, value) {
    activeForm.value[key] = value;
    openDropdown.value = "";
}

function onYearInput(type, event) {
    const raw = event.target.value.replace(/\D/g, "").slice(0, 4);
    const value = raw ? Number.parseInt(raw, 10) : null;

    event.target.value = raw;

    if (!Array.isArray(activeForm.value.year)) {
        activeForm.value.year = [];
    }

    if (type === "yearFrom") {
        activeForm.value.year[0] = value;
        return;
    }

    activeForm.value.year[1] = value;
}

onMounted(() => {
    document.addEventListener("click", closeAllDropdowns);
});

onUnmounted(() => {
    document.removeEventListener("click", closeAllDropdowns);
});
</script>
