export default oauth.yandexEventHandler({
  config: {
    emailRequired: true,
  },
  async onSuccess(event, { user }) {
    await setUserSession(event, {
      user: {
        yandex: user.default_email,
      },
      loggedInAt: Date.now(),
    })

    return sendRedirect(event, '/')
  },
})
