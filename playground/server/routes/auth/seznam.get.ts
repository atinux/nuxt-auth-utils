export default defineOAuthSeznamEventHandler({
  config: {
    scope: ['identity'],
  },
  async onSuccess(event, { user }) {
    await setUserSession(event, {
      user: {
        seznam: `${user.firstname} ${user.lastname}`,
      },
      loggedInAt: Date.now(),
    })

    return sendRedirect(event, '/')
  },
})
