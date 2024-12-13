export default defineOAuthAtlassianEventHandler({
  async onSuccess(event, { user, tokens }) {
    await setUserSession(event, {
      user: {
        email: user.email,
      },
      loggedInAt: Date.now(),
    })

    return sendRedirect(event, '/')
  }
})
