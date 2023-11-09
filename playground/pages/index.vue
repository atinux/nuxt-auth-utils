<script setup lang="ts">
const { session } = useUserSession()
</script>

<template>
  <UPageBody>
    <pre>{{ session }}</pre>
  </UPageBody>
</template>
