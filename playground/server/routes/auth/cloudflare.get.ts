export default defineOAuthCloudflareEventHandler({
  config: {
    // Cloudflare has no default scope — set the client's registered API-permission ID(s)
    // (from GET /client/v4/oauth/scopes). `openid` is not a Cloudflare scope.
    scope: ['user-details.read'],
  },
  async onSuccess(event, { user }) {
    await setUserSession(event, {
      user: {
        cloudflare: user.sub,
      },
      loggedInAt: Date.now(),
    })

    return sendRedirect(event, '/')
  },
})
