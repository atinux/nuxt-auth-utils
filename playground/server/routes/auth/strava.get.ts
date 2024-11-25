export default defineOAuthStravaEventHandler({
  config: {
    approvalPrompt: 'force',
    scope: ['profile:read_all'],
  },
  async onSuccess(event, { user }) {
    await setUserSession(event, {
      user: {
        strava: `${user.firstname} ${user.lastname}`,
      },
      loggedInAt: Date.now(),
    })

    return sendRedirect(event, '/')
  },
})
