export default oauthInstagramEventHandler({
  async onSuccess(event, { user }) {
    await setUserSession(event, {
      user: {
        instagram: user.username,
      },
      loggedInAt: Date.now(),
    })

    return sendRedirect(event, '/')
  },
})
