<script setup lang="ts">
const { user } = useUserSession()
</script>

<template>
  <UApp>
    <UHeader title="Nuxt Auth Utils">
      <template #right>
        <AuthState>
          <template #default="{ loggedIn, clear }">
            <AuthRegister />
            <AuthLogin />
            <WebAuthnModal />
            <PasswordModal />
            <UButton
              v-if="loggedIn"
              size="sm"
              variant="subtle"
              color="neutral"
              @click="clear"
            >
              Logout
            </UButton>
          </template>
          <template #placeholder>
            <UButton
              size="sm"
              variant="subtle"
              color="neutral"
              disabled
            >
              Loading...
            </UButton>
          </template>
        </AuthState>
        <UColorModeButton />
      </template>
    </UHeader>
    <UMain>
      <UContainer>
        <UPage>
          <NuxtPage />
        </UPage>
      </UContainer>
    </UMain>
  </UApp>
</template>
