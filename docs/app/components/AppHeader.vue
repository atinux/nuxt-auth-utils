<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const route = useRoute()

const items = computed<NavigationMenuItem[]>(() => [
  {
    label: 'Docs',
    to: '/getting-started/installation',
    active: route.path.startsWith('/getting-started') || route.path.startsWith('/usage'),
  },
  {
    label: 'Changelog',
    to: 'https://github.com/atinux/nuxt-auth-utils/blob/main/CHANGELOG.md',
    target: '_blank',
  },
])
</script>

<template>
  <UHeader>
    <template #left>
      <NuxtLink
        to="/"
      >
        <AppLogo class="w-auto h-6 shrink-0" />
      </NuxtLink>
    </template>

    <UNavigationMenu
      :items="items"
      variant="link"
    />

    <template #right>
      <UColorModeButton />

      <UButton
        icon="i-simple-icons-github"
        variant="ghost"
        color="neutral"
        to="https://github.com/atinux/nuxt-auth-utils"
        target="_blank"
        aria-label="GitHub"
      />
    </template>

    <template #body>
      <UNavigationMenu
        :items="items"
        orientation="vertical"
        class="-mx-2.5"
      />
    </template>
  </UHeader>
</template>
