<script lang="ts" setup>
const isOpen = ref(false)

const { fetch, user } = useUserSession()
const toast = useToast()

async function login(event: Event) {
  const target = event.target as HTMLFormElement

  await $fetch('/api/login', {
    method: 'POST',
    body: {
      email: target.email.value,
      password: target.password.value,
    },
  }).then(() => {
    fetch()
    isOpen.value = false

    toast.add({
      color: 'success',
      title: 'User logged in successfully',
    })
  }).catch((err) => {
    console.log(err)

    toast.add({
      color: 'error',
      title: err.data?.message || err.message,
    })
  })
}
</script>

<template>
  <UButton
    v-if="!user?.email"
    size="sm"
    variant="subtle"
    color="neutral"
    @click="isOpen = true"
  >
    Sign in
  </UButton>

  <UModal
    v-model:open="isOpen"
    title="Login"
    description="Enter your email and password"
  >
    <template #content>
      <div class="p-4">
        <form @submit.prevent="login($event)">
          <UFormField label="Email">
            <UInput
              name="email"
              type="email"
            />
          </UFormField>
          <UFormField
            label="Password"
            class="mt-4"
          >
            <UInput
              name="password"
              type="password"
            />
          </UFormField>
          <UButton
            type="submit"
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
