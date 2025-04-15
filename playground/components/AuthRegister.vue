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
      color: 'green',
      title: 'User registered successfully',
    })
  }).catch((err) => {
    console.log(err)

    toast.add({
      color: 'red',
      title: err.data?.message || err.message,
    })
  })
}
</script>

<template>
  <UButton
    v-if="!user?.email"
    size="xs"
    color="gray"
    @click="isOpen = true"
  >
    Sign up
  </UButton>

  <UDashboardModal
    v-model="isOpen"
    title="Register"
    description="Enter your email and password"
  >
    <form @submit.prevent="register($event)">
      <UFormGroup label="Email">
        <UInput
          name="email"
          type="email"
        />
      </UFormGroup>
      <UFormGroup label="Password">
        <UInput
          name="password"
          type="password"
        />
      </UFormGroup>
      <UButton
        type="submit"
        color="black"
        class="mt-2"
      >
        Register
      </UButton>
    </form>
  </UDashboardModal>
</template>
