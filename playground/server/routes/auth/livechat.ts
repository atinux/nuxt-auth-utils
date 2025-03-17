export default defineOAuthLiveChatEventHandler({
  config: {},
  async onSuccess(event, { user }) {
    await setUserSession(event, {
      user: {
        livechat: user,
      },
      loggedInAt: Date.now(),
    })

    return sendRedirect(event, '/')
  },
  async onError() {},
})
