export default defineOAuthAuthentikEventHandler({
  async onSuccess(event, { user }) {
    await setUserSession(event, {
      user: {
        authentik: user.preferred_username,
      },
      loggedInAt: Date.now(),
    })

    return sendRedirect(event, '/')
  },
})
