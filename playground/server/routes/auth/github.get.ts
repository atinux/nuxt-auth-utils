export default oauthGitHubEventHandler({
  async onSuccess(event, { user }) {
    await setUserSession(event, {
      user: {
        github: user.nickname,
      },
      loggedInAt: Date.now(),
    })

    return sendRedirect(event, '/')
  },
})
