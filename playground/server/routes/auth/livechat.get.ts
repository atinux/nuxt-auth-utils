export default defineOAuthLiveChatEventHandler({
  async onSuccess(event, { user }) {
    await setUserSession(event, {
      user: {
        livechat: user.name,
      },
      loggedInAt: Date.now(),
    })

    return sendRedirect(event, '/')
  },
})
