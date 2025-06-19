<script setup lang="ts">
const { user, openInPopup } = useUserSession()

const inPopup = ref(false)
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
      label: user.value?.bluesky || 'Bluesky',
      click() {
        const handle = prompt('Enter your Bluesky handle')
        if (handle) {
          navigateTo({
            path: '/auth/bluesky',
            query: { handle },
          }, {
            external: true,
          })
        }
      },
      disabled: Boolean(user.value?.bluesky),
      icon: 'i-simple-icons-bluesky',
    },
    {
      label: user.value?.gitlab || 'GitLab',
      to: '/auth/gitlab',
      disabled: Boolean(user.value?.gitlab),
      icon: 'i-simple-icons-gitlab',
    },
    {
      label: user.value?.line || 'Line',
      to: '/auth/line',
      disabled: Boolean(user.value?.line),
      icon: 'i-simple-icons-line',
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
      label: user.value?.azureb2c || 'Azure B2C',
      to: '/auth/azureb2c',
      disabled: Boolean(user.value?.azureb2c),
      icon: 'i-simple-icons-microsoftazure',
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
      label: user.value?.workos || 'WorkOS',
      to: '/auth/workos',
      disabled: Boolean(user.value?.workos),
      icon: 'i-logos-workos-icon',
    },
    {
      label: user.value?.zitadel || 'Zitadel',
      to: '/auth/zitadel',
      disabled: Boolean(user.value?.zitadel),
      icon: 'i-gravity-ui-lock',
    },
    {
      label: user.value?.authentik || 'Authentik',
      to: '/auth/authentik',
      disabled: Boolean(user.value?.authentik),
      icon: 'i-simple-icons-authentik',
    },
    {
      label: user.value?.seznam || 'Seznam',
      to: '/auth/seznam',
      disabled: Boolean(user.value?.seznam),
      icon: 'i-gravity-ui-lock',
    },
    {
      label: user.value?.strava || 'Strava',
      to: '/auth/strava',
      disabled: Boolean(user.value?.strava),
      icon: 'i-simple-icons-strava',
    },
    {
      label: user.value?.hubspot || 'HubSpot',
      to: '/auth/hubspot',
      disabled: Boolean(user.value?.hubspot),
      icon: 'i-simple-icons-hubspot',
    },
    {
      label: user.value?.atlassian || 'Atlassian',
      to: '/auth/atlassian',
      disabled: Boolean(user.value?.atlassian),
      icon: 'i-simple-icons-atlassian',
    },
    {
      label: user.value?.apple || 'Apple',
      to: '/auth/apple',
      disabled: Boolean(user.value?.apple),
      icon: 'i-simple-icons-apple',
    },
    {
      label: user.value?.kick || 'Kick',
      to: '/auth/kick',
      disabled: Boolean(user.value?.kick),
      icon: 'i-simple-icons-kick',
    },
    {
      label: user.value?.salesforce || 'Salesforce',
      to: `/auth/salesforce`,
      disabled: Boolean(user.value?.salesforce),
      icon: 'i-simple-icons-salesforce',
    },
    {
      label: user.value?.slack || 'Slack',
      to: '/auth/slack',
      disabled: Boolean(user.value?.slack),
      icon: 'i-simple-icons-slack',
    },
    {
      label: user.value?.heroku || 'Heroku',
      to: '/auth/heroku',
      disabled: Boolean(user.value?.heroku),
      icon: 'i-simple-icons-heroku',
    },
    {
      label: user.value?.planningcenter || 'Planning Center',
      to: '/auth/planningcenter',
      disabled: Boolean(user.value?.planningcenter),
      icon: 'i-gravity-ui-lock',
    },
  ].map(p => ({
    ...p,
    prefetch: false,
    external: true,
    to: inPopup.value ? '#' : p.to,
    click: inPopup.value && p.to ? () => openInPopup(p.to) : p.click,
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
        <template #default="{ loggedIn, clear }">
          <AuthRegister />
          <AuthLogin />
          <WebAuthnModal />
          <PasswordModal />
          <UDropdown
            :items="[providers]"
            :ui="{ base: 'max-h-48' }"
          >
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
      <div class="text-xs mt-4">
        Popup mode
        <UToggle
          v-model="inPopup"
          size="xs"
          name="open-in-popup"
          label="Open in popup"
        />
      </div>
      <NuxtPage />
    </UContainer>
  </UMain>
  <UNotifications />
</template>
