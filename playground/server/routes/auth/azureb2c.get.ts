export default defineOAuthAzureB2CEventHandler({
  async onSuccess(event, { user }) {
    await setUserSession(event, {
      user: {
        azureb2c: user.email,
      },
      loggedInAt: Date.now(),
    })

    return sendRedirect(event, '/')
  },
})
