export default defineOAuthTikTokEventHandler({
  async onSuccess(event, { user }) {
    await setUserSession(event, {
      user: {
        tiktok: user.display_name,
      },
      loggedInAt: Date.now(),
    })

    return sendRedirect(event, '/')
  },
})
