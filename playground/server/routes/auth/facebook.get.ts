export default oauth.facebookEventHandler({
  async onSuccess(event, { user }) {
    await setUserSession(event, {
      user: {
        facebook: user.name,
      },
      loggedInAt: Date.now(),
    })

    return sendRedirect(event, '/')
  },
})
