<script setup>
const { session } = useUserSession()
</script>

<template>
  <pre>{{ session }}</pre>
</template>
