export default oauth.linkedinEventHandler({
  config: {
    emailRequired: true
  },
  async onSuccess(event, { user }) {
    await setUserSession(event, {
      user: {
        linkedin: user,
      },
      loggedInAt: Date.now()
    })

    return sendRedirect(event, '/')
  }
})
