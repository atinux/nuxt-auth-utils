<template>
  <USeparator
    icon="i-simple-icons-nuxtdotjs"
    class="h-px"
  />

  <UFooter>
    <template #left>
      <NuxtLink
        to="https://github.com/atinux/nuxt-auth-utils/blob/main/LICENSE"
        target="_blank"
        class="text-sm text-muted"
      >
        Published under <span class="text-highlighted">MIT License</span>
      </NuxtLink>
    </template>

    <template #right>
      <UButton
        aria-label="Nuxt Auth Utils on GitHub"
        icon="i-simple-icons-github"
        to="https://github.com/atinux/nuxt-auth-utils"
        target="_blank"
        color="neutral"
        variant="ghost"
        size="sm"
      />
    </template>
  </UFooter>
</template>
