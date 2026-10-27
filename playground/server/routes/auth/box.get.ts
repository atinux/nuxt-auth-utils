export default defineOAuthBoxEventHandler({
  async onSuccess(event, { user }) {
    await setUserSession(event, {
      user: {
        box: user.login,
      },
      loggedInAt: Date.now(),
    })

    return sendRedirect(event, '/')
  },
})
