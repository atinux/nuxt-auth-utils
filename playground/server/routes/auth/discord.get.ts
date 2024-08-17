export default oauthDiscordEventHandler({
  async onSuccess(event, { user }) {
    await setUserSession(event, {
      user: {
        discord: user.nickname,
      },
      loggedInAt: Date.now(),
    })

    return sendRedirect(event, '/')
  },
})
