<script setup lang="ts">
const { loggedIn, session, clear } = useUserSession()

const providers = computed(() => [
  [
    {
      label: !session.value.user?.github ? 'Github' : session.value.user.github.login,
      to: !session.value.user?.github ? '/auth/github' : undefined,
      disabled: session.value.user?.github && true,
      icon: 'i-simple-icons-github',
      prefetch: false,
      external: true,
    },
    {
      label: !session.value.user?.spotify ? 'Spotify' : session.value.user.spotify.display_name,
      to: !session.value.user?.spotify ? '/auth/spotify' : undefined,
      disabled: session.value.user?.spotify && true,
      icon: 'i-simple-icons-spotify',
      prefetch: false,
      external: true,
    },
    {
      label: !session.value.user?.google ? 'Google' : session.value.user.google.email,
      to: !session.value.user?.google ? '/auth/google' : undefined,
      disabled: session.value.user?.google && true,
      icon: 'i-simple-icons-google',
      prefetch: false,
      external: true,
    },
    {
      label: !session.value.user?.twitch ? 'Twitch' : session.value.user.twitch.login,
      to: !session.value.user?.twitch ? '/auth/twitch' : undefined,
      disabled: session.value.user?.twitch && true,
      icon: 'i-simple-icons-twitch',
      prefetch: false,
      external: true,
    },
    {
      label: !session.value.user?.auth0 ? 'Auth0' : session.value.user.auth0.email,
      to: !session.value.user?.auth0 ? '/auth/auth0' : undefined,
      disabled: session.value.user?.auth0 && true,
      icon: 'i-simple-icons-auth0',
      prefetch: false,
      external: true,
    },
  ],
])
</script>

<template>
  <UHeader>
    <template #right>
      <UDropdown :items="providers">
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
        v-if="!loggedIn || !session.user.discord"
        to="/auth/discord"
        icon="i-simple-icons-discord"
        external
        color="gray"
        size="xs"
      >
        Login with Discord
      </UButton>
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
