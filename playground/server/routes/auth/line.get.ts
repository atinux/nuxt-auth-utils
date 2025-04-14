export default defineOAuthLineEventHandler({
  async onSuccess(event, { user }) {
    await setUserSession(event, {
      user: {
        line: user.userId,
      },
      loggedInAt: Date.now(),
    })

    return sendRedirect(event, '/')
  },
})
