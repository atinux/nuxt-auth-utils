export default oauth.battledotnetEventHandler({
  async onSuccess(event, { user }) {
    await setUserSession(event, {
      user: {
        battledotnet: user,
      },
      loggedInAt: Date.now()
    })

    return sendRedirect(event, '/')
  }
})
