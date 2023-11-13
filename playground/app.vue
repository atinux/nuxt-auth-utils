<script setup>
const { loggedIn, session, clear } = useUserSession()
const jwt = function(){
  $fetch('/auth/jwt', {
    body:{email:'admin@admin.com',password:'admin'}
    ,method:'POST'})
    .then((res)=>{
      session.value = res
        
})}
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
        v-if="loggedIn"
        color="gray"
        size="xs"
        @click="clear"
      >
        Logout
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
        v-if="!loggedIn || !session.user.jwt"
        icon="i-logos-jwt-icon"
        
        external
        color="gray"
        size="xs"
        @click="jwt"
      >
        Login with JWT
      </UButton>
    </template>
  </UHeader>
  <UMain>
    <UContainer>
      <NuxtPage />
    </UContainer>
  </UMain>
</template>
