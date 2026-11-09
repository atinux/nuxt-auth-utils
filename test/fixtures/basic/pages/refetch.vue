<script setup lang="ts">
const { loggedIn, status, error, fetch } = useUserSession()

// Refetch twice during SSR, the second fetch starting while the first one runs
if (import.meta.server) {
  await Promise.all([fetch(), new Promise(resolve => setTimeout(resolve, 50)).then(fetch)])
}
</script>

<template>
  <div id="refetch">
    {{ loggedIn }} {{ status }} {{ error?.statusCode ?? 'none' }}
  </div>
</template>
