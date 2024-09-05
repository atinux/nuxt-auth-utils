export default oauthCognitoEventHandler({
  async onSuccess(event, { user }) {
    await setUserSession(event, {
      user: {
        cognito: user.email,
      },
      loggedInAt: Date.now(),
    })

    return sendRedirect(event, '/')
  },
})
