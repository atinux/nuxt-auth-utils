<script setup>
import { useUserSession } from '#imports'

const userSession = useUserSession()
const { ready } = userSession
</script>

<template>
  <slot
    v-if="ready"
    v-bind="userSession"
  />
  <slot
    v-else
    name="placeholder"
  />
</template>
