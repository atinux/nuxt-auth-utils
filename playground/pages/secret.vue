<script setup>
definePageMeta({
  middleware() {
    const { loggedIn } = useUserSession()
    if (!loggedIn.value) {
      return navigateTo('/')
    }
  },
})
</script>

<template>
  <div>
    <h1>Secret</h1>
    <NuxtLink to="/">
      Home
    </NuxtLink>
  </div>
</template>
