export default defineOAuthHubspotEventHandler({
  config: {
    scope: ['oauth'],
  },
  async onSuccess(event, { user }) {
    await setUserSession(event, {
      user: {
        id: `${user.id}`,
        email: `${user.email}`,
        domain: `${user.domain}`,
      },
      loggedInAt: Date.now(),
    })

    return sendRedirect(event, '/')
  },
})
