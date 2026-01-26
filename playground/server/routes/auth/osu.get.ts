export default defineOAuthOsuEventHandler({
  async onSuccess(event, { user }) {
    await setUserSession(event, {
      user: {
        osu: user.username,
      },
      loggedInAt: Date.now(),
    })

    return sendRedirect(event, '/')
  },
})
