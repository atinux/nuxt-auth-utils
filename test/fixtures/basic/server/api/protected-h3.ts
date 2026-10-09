// Auto-imported `defineEventHandler`, from h3 v1 on Nuxt 4
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)

  return { user }
})
