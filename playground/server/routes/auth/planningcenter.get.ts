export default defineOAuthPlanningCenterEventHandler({
  config: {
    scope: ['services'],
  },
  async onSuccess(event, { user }) {
    await setUserSession(event, {
      user: {
        planningcenter: user.name,
      },
      loggedInAt: Date.now(),
    })

    return sendRedirect(event, '/')
  },
})
