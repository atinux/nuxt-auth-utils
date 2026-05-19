<script setup lang="ts">
const { title = 'My Page', description = '' } = defineProps<{
  title?: string
  description?: string
}>()
</script>

<template>
  <div class="w-full h-full flex flex-col justify-center items-center p-[60px] bg-white text-neutral-900 dark:bg-neutral-900 dark:text-white">
    <h1
      class="text-[72px] font-bold m-0 leading-tight text-center"
      style="text-wrap: balance;"
    >
      {{ title }}
    </h1>
    <p
      v-if="description"
      class="text-[32px] opacity-60 mt-4 text-center max-w-[900px]"
    >
      {{ description }}
    </p>
  </div>
</template>
