<script setup>
const { loggedIn } = useUserSession()
</script>

<template>
  <div>
    Nuxt module playground!
    {{ loggedIn ? 'Logged in' : 'Not logged in' }}
  </div>
</template>
