export default defineOAuthOidcEventHandler({
  config: {
    scope: ['openid', 'profile', 'email'],
  },
  async onSuccess(event, { user }) {
    await setUserSession(event, {
      user: {
        oidc: user.name,
      },
      loggedInAt: Date.now(),
    })

    return sendRedirect(event, '/')
  },
})
