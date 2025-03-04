export default defineOAuthKickEventHandler({
  async onSuccess(event, { user }) {
    await setUserSession(event, {
      user: {
        kick: user.email,
      },
      loggedInAt: Date.now(),
    })

    return sendRedirect(event, '/')
  },
})
