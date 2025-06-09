export default defineOAuthOryEventHandler({
  config: {},
  async onSuccess(event, { user }) {
    await setUserSession(event, {
      user: {
        email: user?.email,
        ory: user?.email,
      },
      loggedInAt: Date.now(),
    })

    return sendRedirect(event, '/')
  },
})
