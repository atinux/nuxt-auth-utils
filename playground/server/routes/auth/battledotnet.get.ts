export default oauthBattledotnetEventHandler({
  async onSuccess(event, { user }) {
    await setUserSession(event, {
      user: {
        battledotnet: user.battletag,
      },
      loggedInAt: Date.now(),
    })

    return sendRedirect(event, '/')
  },
})
