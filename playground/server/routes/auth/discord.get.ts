export default authDiscordEventHandler({
  async onSuccess(event, { user }) {
    await setUserSession(event, {
      user: {
        discord: user.username,
      },
      loggedInAt: Date.now(),
    })

    return sendRedirect(event, '/')
  },
})
