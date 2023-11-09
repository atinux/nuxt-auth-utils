<script setup>
const { loggedIn, session, clear } = useUserSession()
</script>

<template>
  <UHeader>
    <template #right>
      <UButton
        v-if="!loggedIn || !session.user.github"
        to="/auth/github"
        icon="i-simple-icons-github"
        external
        color="gray"
        size="xs"
      >
        Login with GitHub
      </UButton>
      <UButton
        v-if="!loggedIn || !session.user.spotify"
        to="/auth/spotify"
        icon="i-simple-icons-spotify"
        external
        color="gray"
        size="xs"
      >
        Login with Spotify
      </UButton>
      <UButton
        v-if="!loggedIn || !session.user.google"
        to="/auth/google"
        icon="i-simple-icons-google"
        external
        color="gray"
        size="xs"
      >
        Login with Google
      </UButton>
      <UButton
        v-if="!loggedIn || !session.user.twitch"
        to="/auth/twitch"
        icon="i-simple-icons-twitch"
        external
        color="gray"
        size="xs"
      >
        Login with Twitch
      </UButton>
      <UButton
        v-if="!loggedIn || !session.user.auth0"
        to="/auth/auth0"
        icon="i-simple-icons-auth0"
        external
        color="gray"
        size="xs"
      >
        Login with Auth0
      </UButton>
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
