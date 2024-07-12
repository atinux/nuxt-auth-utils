export default authTwitchEventHandler({
  config: {
    emailRequired: true,
  },
  async onSuccess(event, { user }) {
    await setUserSession(event, {
      user: {
        twitch: user.login,
      },
      loggedInAt: Date.now(),
    })

    return sendRedirect(event, '/')
  },
})
