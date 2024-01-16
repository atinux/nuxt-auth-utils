<script setup lang="ts">
const { loggedIn, session, clear } = useUserSession()

const providers = computed(() => [
  {
    label: session.value?.user.github?.login || 'GitHub',
    to: '/auth/github',
    disabled: Boolean(session.value?.user.github),
    icon: 'i-simple-icons-github',
  },
  {
    label: session.value?.user.spotify?.display_name || 'Spotify',
    to: '/auth/spotify',
    disabled: Boolean(session.value?.user.spotify),
    icon: 'i-simple-icons-spotify',
  },
  {
    label: session.value?.user.google?.email || 'Google',
    to: '/auth/google',
    disabled: Boolean(session.value?.user.google),
    icon: 'i-simple-icons-google',
  },
  {
    label: session.value?.user.twitch?.login || 'Twitch',
    to: '/auth/twitch',
    disabled: Boolean(session.value?.user.twitch),
    icon: 'i-simple-icons-twitch',
  },
  {
    label: session.value?.user.auth0?.email || 'Auth0',
    to: '/auth/auth0',
    disabled: Boolean(session.value?.user.auth0),
    icon: 'i-simple-icons-auth0',
  },
  {
    label: session.value?.user.discord?.username || 'Discord',
    to: '/auth/discord',
    disabled: Boolean(session.value?.user.discord),
    icon: 'i-simple-icons-discord',
  },
  {
    label: session.value?.user.battledotnet?.battletag || 'Battle.net',
    to: '/auth/battledotnet',
    disabled: Boolean(session.value?.user.battledotnet),
    icon: 'i-simple-icons-battledotnet',
  },
  {
    label: session.value?.user.microsoft?.displayName || 'Microsoft',
    to: '/auth/microsoft',
    disabled: Boolean(session.value?.user.microsoft),
    icon: 'i-simple-icons-microsoft',
  },
  {
    label: session.value?.user.keycloak?.preferred_username || 'Keycloak',
    to: '/auth/keycloak',
    disabled: Boolean(session.value?.user.keycloak),
    icon: 'i-simple-icons-redhat'
  },
  {
    label: session.value?.user.linkedin?.email || 'LinkedIn',
    to: '/auth/linkedin',
    disabled: Boolean(session.value?.user.linkedin),
    icon: 'i-simple-icons-linkedin',
  }
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
