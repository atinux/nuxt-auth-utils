export default defineNitroPlugin(() => {
  sessionHooks.hook('verify', async (session) => {
    // Extend User Session
    // Or throw createError({ ... }) if session is invalid
    session.extended = {
      fromHooks: true
    }
  })

  sessionHooks.hook('clear', async () => {
    // Log that user logged out
  })
})

