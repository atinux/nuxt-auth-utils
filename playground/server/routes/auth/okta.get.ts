export default defineOAuthOktaEventHandler({
  config: {},
  async onSuccess(event, { user }) {
    await setUserSession(event, {
      user: {
        okta: user?.name,
      },
      loggedInAt: Date.now(),
    })

    return sendRedirect(event, '/')
  },
})
