<script setup lang="ts">
import type { InputProps } from '@nuxt/ui'
import { useClipboard } from '@vueuse/core'

withDefaults(defineProps<{
  value: string
  size?: InputProps['size']
}>(), {
  size: 'lg',
})

const { copy, copied } = useClipboard()
</script>

<template>
  <label class="inline-block max-w-full shrink-0">
    <UInput
      :model-value="value"
      :size="size"
      disabled
      :ui="{
        root: 'w-max max-w-full font-mono',
        base: 'field-sizing-content min-w-[34ch] whitespace-nowrap',
        trailing: 'pe-1 shrink-0',
      }"
    >
      <div
        class="absolute inset-0"
        :class="[copied ? 'cursor-default' : 'cursor-copy']"
        @click="copy(value)"
      />
      <template #trailing>
        <UButton
          :icon="copied ? 'i-iconoir-check' : 'i-iconoir-copy'"
          color="neutral"
          variant="link"
          :padded="false"
          :ui="{ leadingIcon: 'size-4' }"
          :class="{ 'text-green-500 hover:text-green-500 dark:text-green-400 hover:dark:text-green-400': copied }"
          aria-label="copy button"
          @click="copy(value)"
        />
      </template>
    </UInput>
  </label>
</template>
