export default oauth.microsoftEventHandler({
  async onSuccess(event, { user }) {
    await setUserSession(event, {
      user: {
        microsoft: user.email,
      },
      loggedInAt: Date.now(),
    })

    return sendRedirect(event, '/')
  },
})
