export default oauth.keycloakEventHandler({
  async onSuccess(event, { user }) {
    await setUserSession(event, {
      user: {
        keycloak: user.preferred_username,
      },
      loggedInAt: Date.now(),
    })

    return sendRedirect(event, '/')
  },
})
