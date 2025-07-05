export default defineOAuthOryEventHandler({
  config: {},
  async onSuccess(event, { user }) {
    await setUserSession(event, {
      user: {
        id: user?.sub,
        email: user?.email,
        ory: user?.email,
      },
      loggedInAt: Date.now(),
    })

    return sendRedirect(event, '/')
  },
})
