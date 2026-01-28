export default defineOAuthRiotGamesEventHandler({
  async onSuccess(event, { user }) {
    await setUserSession(event, {
      user: {
        riotgames: user.puuid,
      },
      loggedInAt: Date.now(),
    })

    return sendRedirect(event, '/')
  },
})
