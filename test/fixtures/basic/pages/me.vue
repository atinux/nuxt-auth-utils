<script setup lang="ts">
const { loggedIn, user, status, error } = useUserSession()
</script>

<template>
  <div id="me">
    {{ loggedIn ? JSON.stringify(user) : 'anonymous' }}
  </div>
  <div id="session-status">
    {{ status }}
  </div>
  <div
    v-if="error"
    id="session-error"
  >
    {{ error.statusCode }}
  </div>
</template>
