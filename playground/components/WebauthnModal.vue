<script setup lang="ts">
const show = ref(false)
const logging = ref(false)
const userName = ref('')
const displayName = ref('')
const toast = useToast()

const { user, fetch } = useUserSession()
const { register, authenticate, isSupported } = useWebAuthn()

async function signUp() {
  if (logging.value || !userName.value) return
  logging.value = true
  await register(userName.value, displayName.value)
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

async function signIn() {
  if (logging.value) return
  logging.value = true
  await authenticate(userName.value)
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
    v-if="!user?.webauthn && isSupported"
    size="xs"
    color="gray"
    @click="show = true"
  >
    Login with Webauthn
  </UButton>
  <UDashboardModal
    v-model="show"
    title="Login with credential"
    description="First time? Register your credential"
  >
    <form
      class="space-y-4"
      @submit.prevent="signUp"
    >
      <UFormGroup
        label="Email"
        required
      >
        <UInput
          v-model="userName"
          name="email"
          type="email"
        />
      </UFormGroup>
      <UFormGroup label="Name">
        <UInput
          v-model="displayName"
          name="name"
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
      @submit.prevent="signIn"
    >
      <UFormGroup
        label="Email"
        required
      >
        <UInput
          v-model="userName"
          name="email"
          type="email"
          autocomplete="username webauthn"
        />
      </UFormGroup>
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
