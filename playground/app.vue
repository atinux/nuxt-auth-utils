<script setup lang="ts">
const { user } = useUserSession()

const providers = computed(() =>
  [
    {
      label: user.value?.google || 'Google',
      to: '/auth/google',
      disabled: Boolean(user.value?.google),
      icon: 'i-simple-icons-google',
    },
    {
      label: user.value?.facebook || 'Facebook',
      to: '/auth/facebook',
      disabled: Boolean(user.value?.facebook),
      icon: 'i-simple-icons-facebook',
    },
    {
      label: user.value?.instagram || 'instagram',
      to: '/auth/instagram',
      disabled: Boolean(user.value?.instagram),
      icon: 'i-simple-icons-instagram',
    },
    {
      label: user.value?.github || 'GitHub',
      to: '/auth/github',
      disabled: Boolean(user.value?.github),
      icon: 'i-simple-icons-github',
    },
    {
      label: user.value?.gitlab || 'GitLab',
      to: '/auth/gitlab',
      disabled: Boolean(user.value?.gitlab),
      icon: 'i-simple-icons-gitlab',
    },
    {
      label: user.value?.linear || 'Linear',
      to: '/auth/linear',
      disabled: Boolean(user.value?.linear),
      icon: 'i-simple-icons-linear',
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
      label: user.value?.spotify || 'Spotify',
      to: '/auth/spotify',
      disabled: Boolean(user.value?.spotify),
      icon: 'i-simple-icons-spotify',
    },
    {
      label: user.value?.twitch || 'Twitch',
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
      label: user.value?.paypal || 'PayPal',
      to: '/auth/paypal',
      disabled: Boolean(user.value?.paypal),
      icon: 'i-simple-icons-paypal',
    },
    {
      label: user.value?.steam || 'Steam',
      to: '/auth/steam',
      disabled: Boolean(user.value?.steam),
      icon: 'i-simple-icons-steam',
    },
    {
      label: user.value?.x || 'X',
      to: '/auth/x',
      disabled: Boolean(user.value?.x),
      icon: 'i-simple-icons-x',
    },
    {
      label: user.value?.xsuaa || 'XSUAA',
      to: '/auth/xsuaa',
      disabled: Boolean(user.value?.xsuaa),
      icon: 'i-simple-icons-sap',
    },
    {
      label: user.value?.vk || 'VK',
      to: '/auth/vk',
      disabled: Boolean(user.value?.vk),
      icon: 'i-simple-icons-vk',
    },
    {
      label: user.value?.yandex || 'Yandex',
      to: '/auth/yandex',
      disabled: Boolean(user.value?.yandex),
      icon: 'i-gravity-ui-logo-yandex',
    },
    {
      label: user.value?.tiktok || 'TikTok',
      to: '/auth/tiktok',
      disabled: Boolean(user.value?.tiktok),
      icon: 'i-simple-icons-tiktok',
    },
    {
      label: user.value?.dropbox || 'Dropbox',
      to: '/auth/dropbox',
      disabled: Boolean(user.value?.dropbox),
      icon: 'i-simple-icons-dropbox',
    },
    {
      label: user.value?.polar || 'Polar',
      to: '/auth/polar',
      disabled: Boolean(user.value?.polar),
      icon: 'i-iconoir-polar-sh',
    },
    {
      label: user.value?.zitadel || 'Zitadel',
      to: '/auth/zitadel',
      disabled: Boolean(user.value?.zitadel),
      icon: 'i-gravity-ui-lock',
    },
  ].map(p => ({
    ...p,
    prefetch: false,
    external: true,
  })),
)
</script>

<template>
  <UHeader>
    <template #logo>
      Nuxt Auth Utils
    </template>
    <template #right>
      <AuthState>
        <template
          #default="{ loggedIn, clear }"
        >
          <AuthRegister />
          <AuthLogin />
          <WebAuthnModal />
          <PasswordModal />
          <UDropdown :items="[providers]">
            <UButton
              icon="i-heroicons-chevron-down"
              trailing
              color="gray"
              size="xs"
            >
              Sign in with
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
        <template #placeholder>
          <UButton
            size="xs"
            color="gray"
            disabled
          >
            Loading...
          </UButton>
        </template>
      </AuthState>
    </template>
  </UHeader>
  <UMain>
    <UContainer>
      <NuxtPage />
    </UContainer>
  </UMain>
  <UNotifications />
</template>
