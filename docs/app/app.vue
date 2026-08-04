<script setup lang="ts">
const { data: navigation } = await useAsyncData('docs-navigation', () =>
  queryCollectionNavigation('docs'),
)

provide('navigation', navigation)

const { data: files } = useLazyAsyncData('docs-search', () =>
  queryCollectionSearchSections('docs', {
    ignoredTags: ['style'],
  }), {
  server: false,
},
)
</script>

<template>
  <UApp>
    <NuxtLoadingIndicator />

    <ClientOnly>
      <LazyUContentSearch
        :navigation="navigation"
        :files="files"
      />
    </ClientOnly>

    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
