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
    </UPageBody>
  </UPage>
</template>
