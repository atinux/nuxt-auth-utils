export default oauth.facebookEventHandler({
  async onSuccess(event, { user }) {
    await setUserSession(event, {
      user: {
        facebook: user,
      },
      loggedInAt: Date.now(),
    })

    return sendRedirect(event, '/')
  },
})
