export default oauthSteamEventHandler({
  async onSuccess(event, { user }) {
    await setUserSession(event, {
      user: {
        steam: user.id as string,
      },
      loggedInAt: Date.now(),
    })

    return sendRedirect(event, '/')
  },
})
