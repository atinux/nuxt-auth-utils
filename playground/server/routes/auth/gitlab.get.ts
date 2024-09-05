export default oauthGitLabEventHandler({
  async onSuccess(event, { user }) {
    await setUserSession(event, {
      user: {
        gitlab: user.email,
      },
      loggedInAt: Date.now(),
    })

    return sendRedirect(event, '/')
  },
})
