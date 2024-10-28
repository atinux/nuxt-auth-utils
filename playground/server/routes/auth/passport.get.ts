export default defineOAuthPassportEventHandler({
  config: {},
  async onSuccess(event, { user }) {
    await setUserSession(event, {
      user: user,
      loggedInAt: Date.now(),
    })

    return sendRedirect(event, '/')
  },
})
