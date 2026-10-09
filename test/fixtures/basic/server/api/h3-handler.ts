// Auto-imported `defineEventHandler`, from h3 v1 on Nuxt 4
export default defineEventHandler(async (event) => {
  await setUserSession(event, { user: { fromH3: true } })

  return getUserSession(event)
})
