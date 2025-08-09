export default defineOAuthEntraExternalEventHandler({
  async onSuccess(event, { user }) {
    await setUserSession(event, {
      user: {
        entraexternal: user.email,
      },
      loggedInAt: Date.now(),
    })

    return sendRedirect(event, '/')
  },
})
