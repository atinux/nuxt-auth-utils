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
      <div class="flex flex-col gap-2 mt-4">
        <UButton
          to="/secret"
          class="mt-2"
          variant="link"
          :padded="false"
        >
          Secret page
        </UButton>
        <UButton
          to="/about"
          class="mt-2"
          variant="link"
          :padded="false"
        >
          About page
        </UButton>
        <UButton
          to="/sockets"
          class="mt-2"
          variant="link"
          :padded="false"
        >
          Sockets
        </UButton>
      </div>
    </UPageBody>
  </UPage>
</template>
