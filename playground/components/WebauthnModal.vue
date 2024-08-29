<script setup lang="ts">
const { loggedIn, fetch } = useUserSession()
const show = ref(false)
const logging = ref(false)
const userName = ref('')
const displayName = ref('')
const toast = useToast()

const { register: _register, authenticate: _authenticate, isSupported } = useWebauthn({
  registrationEndpoint: '/api/webauthn/register',
  authenticationEndpoint: '/api/webauthn/login',
  onRegistrationError: (error) => {
    console.error('Registration error:', error)
  },
  onAuthenticationError: (error) => {
    console.error('Authentication error:', error)
  },
})

async function register() {
  if (logging.value || !userName.value) return
  logging.value = true
  await _register(userName.value, displayName.value)
    .then(() => {
      fetch()
      show.value = false
    })
    .catch((err) => {
      console.log(err)
      toast.add({
        color: 'red',
        title: err.data?.message || err.message,
      })
    })
  logging.value = false
}

async function authenticate() {
  if (logging.value) return
  logging.value = true
  await _authenticate()
    .then(() => {
      fetch()
      show.value = false
    })
    .catch((err) => {
      console.log(err)
      toast.add({
        color: 'red',
        title: err.data?.message || err.message,
      })
    })
  logging.value = false
}
</script>

<template>
  <UButton
    v-if="!loggedIn && isSupported()"
    size="xs"
    color="gray"
    @click="show = true"
  >
    Webauthn
  </UButton>
  <UDashboardModal
    v-model="show"
    title="Login with credential"
    description="First time? Register your credential"
  >
    <form
      class="space-y-4"
      @submit.prevent="register"
    >
      <UFormGroup label="Username">
        <UInput
          v-model="userName"
          name="userName"
          type="text"
        />
      </UFormGroup>
      <UFormGroup label="Display name">
        <UInput
          v-model="displayName"
          name="displayName"
          type="text"
        />
      </UFormGroup>
      <UButton
        type="submit"
        :disabled="!userName"
        color="black"
        class="mt-2"
      >
        Register
      </UButton>
    </form>

    <UDivider label="Or" />

    <form
      class="space-y-4"
      @submit.prevent="authenticate"
    >
      <UButton
        type="submit"
        color="black"
        class="mt-2"
      >
        Authenticate
      </UButton>
    </form>
  </UDashboardModal>
</template>
