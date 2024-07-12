export default authGithubEventHandler({
  async onSuccess(event, { user }) {
    await setUserSession(event, {
      user: {
        github: user.login,
      },
      loggedInAt: Date.now(),
    })

    return sendRedirect(event, '/')
  },
})
