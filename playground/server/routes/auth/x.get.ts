export default oauthXEventHandler({
  async onSuccess(event, { user }) {
    await setUserSession(event, {
      user: {
        x: user.username,
      },
      loggedInAt: Date.now(),
    })

    return sendRedirect(event, '/')
  },
})
