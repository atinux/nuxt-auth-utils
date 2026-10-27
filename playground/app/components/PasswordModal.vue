<script setup lang="ts">
const { user, fetch } = useUserSession()
const show = ref(false)
const logging = ref(false)
const password = ref('')
const toast = useToast()

async function login() {
  if (logging.value || !password.value) return
  logging.value = true
  await $fetch('/api/built-in-password', {
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
        color: 'error',
        title: err.data?.message || err.message,
      })
    })
  logging.value = false
}
</script>

<template>
  <UButton
    v-if="!user?.password"
    size="sm"
    variant="subtle"
    color="neutral"
    @click="show = true"
  >
    Password
  </UButton>
  <UModal
    v-model:open="show"
    title="Login with password"
    description="Use the password: 123456"
  >
    <template #content>
      <div class="p-4">
        <form
          class="space-y-4"
          @submit.prevent="login"
        >
          <UFormField label="Password">
            <UInput
              v-model="password"
              name="password"
              type="password"
            />
          </UFormField>
          <UButton
            type="submit"
            :disabled="!password"
            color="neutral"
            class="mt-4"
          >
            Login
          </UButton>
        </form>
      </div>
    </template>
  </UModal>
</template>
