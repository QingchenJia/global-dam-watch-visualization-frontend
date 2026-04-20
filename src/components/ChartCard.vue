<template>
    <section class="chart-card">
        <h3 class="chart-card__title">{{ title }}</h3>
        <span v-if="meta" class="chart-card__meta">{{ meta }}</span>
        <div class="chart-card__body">
            <slot />
        </div>
    </section>
</template>

<script setup>
defineProps({
    title: {
        type: String,
        required: true,
    },
    meta: {
        type: String,
        default: "",
    },
});
</script>
