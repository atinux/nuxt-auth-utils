<script setup lang="ts">
const { loggedIn, user } = useUserSession()
</script>

<template>
  <div id="me">
    {{ loggedIn ? JSON.stringify(user) : 'anonymous' }}
  </div>
</template>
