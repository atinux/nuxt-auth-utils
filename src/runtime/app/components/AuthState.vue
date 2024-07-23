<script lang="ts" setup>
import { useUserSession } from '#imports'

const { loggedIn, user, clear, ready } = useUserSession()
</script>

<template>
  <slot
    v-if="ready"
    v-bind="{ loggedIn, user, clear }"
  />
  <slot
    v-else
    name="placeholder"
  />
</template>
