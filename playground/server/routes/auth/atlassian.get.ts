export default defineOAuthAtlassianEventHandler({
  async onSuccess(event, { user }) {
    await setUserSession(event, {
      user: {
        email: user.email,
      },
      loggedInAt: Date.now(),
    })

    return sendRedirect(event, '/')
  },
})
