<script setup>
// https:// vueuse.org/core/useWebSocket/
const { status, data, send, open, close } = useWebSocket('/ws', {
  // disable during ssr
  immediate: false,
})
onMounted(open)
</script>

<template>
  <div class="mt-4 flex flex-col gap-2">
    <p>Status: {{ status }}</p>
    <p>Data: {{ data }}</p>
    <div class="flex gap-2">
      <UButton @click="open">
        Open
      </UButton>
      <UButton @click="close(1000, 'Closing')">
        Close
      </UButton>
      <UButton @click="send('hello')">
        Send
      </UButton>
    </div>
  </div>
</template>
