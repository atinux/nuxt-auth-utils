export default defineOAuthRobloxEventHandler({
  async onSuccess(event, { user }) {
    await setUserSession(event, {
      user: {
        roblox: user.username,
      },
      loggedInAt: Date.now(),
    })

    return sendRedirect(event, '/')
  },
})
