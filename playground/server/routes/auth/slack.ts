export default defineOAuthSlackEventHandler({
  config: {
    redirectURL: 'http://localhost:3000/auth/slack',
  },
  async onSuccess(event, { user }) {
    const userToSet = user?.name

    await setUserSession(event, {
      user: {
        slack: userToSet,
      },
      loggedInAt: Date.now(),
    })

    return sendRedirect(event, '/')
  },
})
