export default defineOAuthWechatEventHandler({
  async onSuccess(event, { user }) {
    await setUserSession(event, {
      user: {
        wechat: user.openid,
      },
      loggedInAt: Date.now(),
    })

    return sendRedirect(event, '/')
  },
})
