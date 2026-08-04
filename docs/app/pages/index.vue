<script setup lang="ts">
definePageMeta({ layout: 'default' })

const title = 'Nuxt Auth Utils — Authentication for Nuxt'
const description = 'Add authentication to Nuxt applications with secure, sealed cookie sessions'

useSeoMeta({
  title: title,
  description: description,
})

defineOgImage('AuthUtils', {
  title: title,
  description: description,
})

const features = [
  {
    icon: 'i-heroicons-key-20-solid',
    title: '40+ OAuth Providers',
    description: 'GitHub, Google, Discord, Spotify, Apple, and 40+ more providers ready to use.',
    color: 'text-green-500',
  },
  {
    icon: 'i-heroicons-shield-check-20-solid',
    title: 'Secured Sessions',
    description: 'Sealed cookie sessions with h3, encrypted and signed for maximum security.',
    color: 'text-blue-500',
  },
  {
    icon: 'i-heroicons-finger-print-20-solid',
    title: 'WebAuthn / Passkeys',
    description: 'Biometric authentication with full passkey support via SimpleWebAuthn.',
    color: 'text-purple-500',
  },
  {
    icon: 'i-heroicons-lock-closed-20-solid',
    title: 'Password Hashing',
    description: 'Secure scrypt-based password hashing with hashPassword and verifyPassword.',
    color: 'text-orange-500',
  },
  {
    icon: 'i-heroicons-server-20-solid',
    title: 'Hybrid Rendering',
    description: 'Works with SSR, CSR, SWR, and prerendering. AuthState component included.',
    color: 'text-cyan-500',
  },
  {
    icon: 'i-heroicons-code-bracket-square-20-solid',
    title: 'Fully Typed',
    description: 'Extend User, UserSession, and SecureSessionData with your own TypeScript types.',
    color: 'text-indigo-500',
  },
]
</script>

<template>
  <UPageHero
    :description="description"
  >
    <template #headline>
      <UBadge
        variant="outline"
        size="lg"
      >
        Authentication for Nuxt — Zero Config in Dev
      </UBadge>
    </template>

    <template #title>
      Nuxt
      <span class="bg-linear-to-r from-[#00DC82] to-[#36E4DA] bg-clip-text text-transparent">
        Auth Utils
      </span>
    </template>

    <template #links>
      <UButton
        label="Get started"
        to="/getting-started/installation"
        size="xl"
        color="primary"
        trailing-icon="i-heroicons-arrow-right-20-solid"
      />
      <UInputCopy
        value="npx nuxi module add auth-utils"
        size="xl"
      />
    </template>

    <UPageGrid>
      <UPageFeature
        v-for="feature in features"
        :key="feature.title"
        :title="feature.title"
        :description="feature.description"
        class="border border-default p-6 rounded-xl"
      >
        <template #leading>
          <UIcon
            :name="feature.icon"
            :class="`size-6 ${feature.color}`"
          />
        </template>
      </UPageFeature>
    </UPageGrid>
  </UPageHero>
</template>
