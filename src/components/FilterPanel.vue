<template>
    <section class="filter-panel hud-card">
        <header class="filter-panel__header">
            <div class="filter-panel__header-main">
                <div class="quick-panel__title filter-title-row">
                    <el-icon class="quick-panel__title-icon" aria-hidden="true">
                        <Filter />
                    </el-icon>
                    <div class="quick-panel__title-text">
                        <h2 class="hud-card-title">条件筛选</h2>
                    </div>
                </div>
            </div>

            <el-button
                class="filter-panel__reset"
                size="small"
                text
                @click="resetDashboardFilters"
            >
                重置条件
            </el-button>
        </header>

        <div class="filter-panel__body hud-scrollbar">
            <template v-for="field in normalizedFormFields" :key="field.key">
                <div
                    v-if="
                        field.type === 'multiSelect' ||
                        field.type === 'singleSelect'
                    "
                    class="filter-group"
                >
                    <label class="filter-label">{{ field.label }}</label>
                    <el-select
                        v-if="field.type === 'multiSelect'"
                        v-model="activeForm[field.key]"
                        class="filter-select"
                        multiple
                        collapse-tags
                        collapse-tags-tooltip
                        clearable
                        :value-key="FILTER_VALUE_KEY"
                        @keydown.capture="blockSelectKeyboardInput"
                        popper-class="dashboard-select-popper dashboard-select-popper--multi"
                        placeholder="全部"
                        size="small"
                    >
                        <el-option
                            v-for="option in field.options"
                            :key="option.value"
                            :label="option.label"
                            :value="option.value"
                        />
                    </el-select>
                    <el-select
                        v-else
                        v-model="activeForm[field.key]"
                        class="filter-select"
                        clearable
                        :value-key="FILTER_VALUE_KEY"
                        @keydown.capture="blockSelectKeyboardInput"
                        popper-class="dashboard-select-popper dashboard-select-popper--single"
                        placeholder="全部"
                        size="small"
                    >
                        <el-option label="全部" value="" />
                        <el-option
                            v-for="option in field.options"
                            :key="JSON.stringify(option.value)"
                            :label="option.label"
                            :value="option.value"
                        />
                    </el-select>
                </div>

                <div
                    v-else-if="field.type === 'yearRange'"
                    class="filter-group"
                >
                    <label class="filter-label">{{ field.label }}</label>
                    <div class="filter-range">
                        <el-input
                            class="filter-range__input"
                            inputmode="numeric"
                            maxlength="4"
                            placeholder="起始年份"
                            size="small"
                            :model-value="activeForm.year?.[0] ?? ''"
                            @input="(value) => onYearInput('yearFrom', value)"
                        />
                        <span>至</span>
                        <el-input
                            class="filter-range__input"
                            inputmode="numeric"
                            maxlength="4"
                            placeholder="结束年份"
                            size="small"
                            :model-value="activeForm.year?.[1] ?? ''"
                            @input="(value) => onYearInput('yearTo', value)"
                        />
                    </div>
                </div>
            </template>
        </div>
    </section>
</template>

<script setup>
import { computed } from "vue";
import { Filter } from "@element-plus/icons-vue";
import { FORM_FIELD } from "../configs/chart.js";
import { useDashboard } from "../hooks/dashboard.js";

const { dataType, activeForm, resetDashboardFilters } = useDashboard();

const activeFormField = computed(() => FORM_FIELD[dataType.value] || []);
const FILTER_VALUE_KEY = "__filterValueKey";

const normalizedFormFields = computed(() =>
    activeFormField.value.map((field) => {
        if (!Array.isArray(field.options)) {
            return field;
        }

        return {
            ...field,
            options: field.options.map((option, index) => ({
                ...option,
                value: normalizeOptionValue(field.key, option.value, index),
            })),
        };
    }),
);

function normalizeOptionValue(fieldKey, value, index) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return value;
    }

    return {
        ...value,
        [FILTER_VALUE_KEY]: `${fieldKey}:${index}:${JSON.stringify(value)}`,
    };
}

function onYearInput(type, inputValue) {
    const raw = String(inputValue).replace(/\D/g, "").slice(0, 4);
    const value = raw ? Number.parseInt(raw, 10) : null;

    if (!Array.isArray(activeForm.value.year)) {
        activeForm.value.year = [];
    }

    if (type === "yearFrom") {
        activeForm.value.year[0] = value;
        return;
    }

    activeForm.value.year[1] = value;
}

function blockSelectKeyboardInput(event) {
    const blockedKeys = new Set(["Backspace", "Delete", "Space", " "]);

    if (blockedKeys.has(event.key) || event.key.length === 1) {
        event.preventDefault();
        event.stopPropagation();
    }
}
</script>
