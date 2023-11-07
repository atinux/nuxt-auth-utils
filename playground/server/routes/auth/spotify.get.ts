export default oauth.spotifyEventHandler({
  async onSuccess(event, { user }) {
    await setUserSession(event, {
      user: {
        spotify: user,
      }
    })

    return sendRedirect(event, '/')
  }
})
