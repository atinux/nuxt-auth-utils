<script lang="ts" setup>
const isOpen = ref(false)

const { fetch, user } = useUserSession()
const toast = useToast()

async function register(event: Event) {
  const target = event.target as HTMLFormElement

  await $fetch('/api/register', {
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
      title: 'User registered successfully',
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
    Sign up
  </UButton>

  <UModal
    v-model:open="isOpen"
    title="Register"
    description="Enter your email and password"
  >
    <template #content>
      <div class="p-4">
        <form @submit.prevent="register($event)">
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
            Register
          </UButton>
        </form>
      </div>
    </template>
  </UModal>
</template>
