<script setup lang="ts">
const { user, loggedIn, fetch } = useUserSession()
const show = ref(false)
const logging = ref(false)
const password = ref('')
const toast = useToast()

async function login() {
  if (logging.value || !password.value) return
  logging.value = true
  await $fetch('/api/login', {
    method: 'POST',
    body: {
      password: password.value,
    },
  })
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
    v-if="!user?.password"
    size="xs"
    color="gray"
    @click="show = true"
  >
    Login with password
  </UButton>
  <UDashboardModal
    v-model="show"
    title="Login with password"
    description="Use the password: 123456"
  >
    <form
      class="space-y-4"
      @submit.prevent="login"
    >
      <UFormGroup label="Password">
        <UInput
          v-model="password"
          name="password"
          type="password"
        />
      </UFormGroup>
      <UButton
        type="submit"
        :disabled="!password"
        color="black"
        class="mt-2"
      >
        Login
      </UButton>
    </form>
  </UDashboardModal>
</template>
