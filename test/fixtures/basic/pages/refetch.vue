<script setup lang="ts">
const { loggedIn, status, error, fetch, clear } = useUserSession()
const route = useRoute()

// During SSR, refetch while a second fetch, `clear()`, or `clear()` then a fetch starts 50ms later
if (import.meta.server) {
  const next = route.query.then === 'clear'
    ? clear
    : route.query.then === 'clear-fetch' ? () => clear().then(fetch) : fetch
  await Promise.all([fetch(), new Promise(resolve => setTimeout(resolve, 50)).then(next)])
}
</script>

<template>
  <div id="refetch">
    {{ loggedIn }} {{ status }} {{ error?.statusCode ?? 'none' }}
  </div>
</template>
