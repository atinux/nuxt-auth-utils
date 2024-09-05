export default oauthSteamEventHandler({
  async onSuccess(event, { user }) {
    await setUserSession(event, {
      user: {
        steam: user.steamid,
      },
      loggedInAt: Date.now(),
    })

    return sendRedirect(event, '/')
  },
})
