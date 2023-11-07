export default oauth.spotifyEventHandler({
  async onSuccess(event, { user }) {
    await setUserSession(event, {
      user: {
        spotify: user,
      },
      loggedInAt: Date.now()
    })

    return sendRedirect(event, '/')
  }
})
