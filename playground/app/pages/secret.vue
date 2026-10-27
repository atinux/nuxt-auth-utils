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
  <UPageHeader title="Secret Page" />
  <UPageBody>
    <UButton
      to="/"
      color="neutral"
    >
      Home
    </UButton>
  </UPageBody>
</template>
