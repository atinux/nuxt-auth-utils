export default oauth.auth0EventHandler({
  config: {
    emailRequired: true,
  },
  async onSuccess(event, { user }) {
    await setUserSession(event, {
      user: {
        auth0: user,
      },
      loggedInAt: Date.now()
    })

    return sendRedirect(event, '/')
  }
})
