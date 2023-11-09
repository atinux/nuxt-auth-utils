export default oauth.twitchEventHandler({
  config: {
    emailRequired: true,
  },
  async onSuccess(event, { user }) {
    await setUserSession(event, {
      user: {
        twitch: user,
      },
      loggedInAt: Date.now()
    })

    return sendRedirect(event, '/')
  }
})
