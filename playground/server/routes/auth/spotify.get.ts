export default defineOAuthSpotifyEventHandler({
  async onSuccess(event, { user }) {
    await setUserSession(event, {
      user: {
        spotify: user.id,
      },
      loggedInAt: Date.now(),
    })

    return sendRedirect(event, '/')
  },
})
