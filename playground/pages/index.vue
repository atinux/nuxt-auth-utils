<template>
  <UPage>
    <UPageBody>
      <AuthState>
        <template #default="{ session }">
          <pre>{{ session }}</pre>
        </template>
        <template #placeholder>
          ...
        </template>
      </AuthState>
      <UButton
        to="/secret"
        class="mt-2"
        variant="link"
        :padded="false"
      >
        Secret page
      </UButton>
    </UPageBody>
  </UPage>
</template>
