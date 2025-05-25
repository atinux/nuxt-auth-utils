export default defineOAuthFortyTwoEventHandler({
  async onSuccess(event, { user }) {
    await setUserSession(event, {
      user: {
        fortytwo: user.login,
      },
      loggedInAt: Date.now(),
    })
    return sendRedirect(event, '/')
  },
})
