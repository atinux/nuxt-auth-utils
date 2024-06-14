<script setup lang="ts">
const { loggedIn, user, session, clear } = useUserSession()

const providers = computed(() => [
  {
    label: session.value.user?.google || 'Google',
    to: '/auth/google',
    disabled: Boolean(user.value?.google),
    icon: 'i-simple-icons-google',
  },
  {
    label: session.value.user?.facebook || 'Facebook',
    to: '/auth/facebook',
    disabled: Boolean(user.value?.facebook),
    icon: 'i-simple-icons-facebook',
  },
  {
    label: session.value.user?.github || 'GitHub',
    to: '/auth/github',
    disabled: Boolean(user.value?.github),
    icon: 'i-simple-icons-github',
  },
  {
    label: user.value?.linkedin || 'LinkedIn',
    to: '/auth/linkedin',
    disabled: Boolean(user.value?.linkedin),
    icon: 'i-simple-icons-linkedin',
  },
  {
    label: user.value?.microsoft || 'Microsoft',
    to: '/auth/microsoft',
    disabled: Boolean(user.value?.microsoft),
    icon: 'i-simple-icons-microsoft',
  },
  {
    label: user.value?.cognito || 'Cognito',
    to: '/auth/cognito',
    disabled: Boolean(user.value?.cognito),
    icon: 'i-simple-icons-amazonaws',
  },
  {
    label: user.value?.discord || 'Discord',
    to: '/auth/discord',
    disabled: Boolean(user.value?.discord),
    icon: 'i-simple-icons-discord',
  },
  {
    label: session.value.user?.spotify || 'Spotify',
    to: '/auth/spotify',
    disabled: Boolean(user.value?.spotify),
    icon: 'i-simple-icons-spotify',
  },
  {
    label: session.value.user?.twitch || 'Twitch',
    to: '/auth/twitch',
    disabled: Boolean(user.value?.twitch),
    icon: 'i-simple-icons-twitch',
  },
  {
    label: user.value?.auth0 || 'Auth0',
    to: '/auth/auth0',
    disabled: Boolean(user.value?.auth0),
    icon: 'i-simple-icons-auth0',
  },
  {
    label: user.value?.battledotnet || 'Battle.net',
    to: '/auth/battledotnet',
    disabled: Boolean(user.value?.battledotnet),
    icon: 'i-simple-icons-battledotnet',
  },
  {
    label: user.value?.keycloak || 'Keycloak',
    to: '/auth/keycloak',
    disabled: Boolean(user.value?.keycloak),
    icon: 'i-simple-icons-redhat',
  },
  {
    label: user.value?.xsuaa || 'XSUAA',
    to: '/auth/xsuaa',
    disabled: Boolean(user.value?.xsuaa),
    icon: 'i-simple-icons-sap',
  },
].map(p => ({
  ...p,
  prefetch: false,
  external: true,
})))
</script>

<template>
  <UHeader>
    <template #logo>
      Nuxt Auth Utils
    </template>
    <template #right>
      <UDropdown :items="[providers]">
        <UButton
          icon="i-heroicons-chevron-down"
          trailing
          color="gray"
          size="xs"
        >
          Login with
        </UButton>
      </UDropdown>
      <UButton
        v-if="loggedIn"
        color="gray"
        size="xs"
        @click="clear"
      >
        Logout
      </UButton>
    </template>
  </UHeader>
  <UMain>
    <UContainer>
      <NuxtPage />
    </UContainer>
  </UMain>
</template>
