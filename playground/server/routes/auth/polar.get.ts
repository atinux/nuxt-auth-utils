export default defineOAuthPolarEventHandler({
  config: {
    emailRequired: true,
  },
  async onSuccess(event, { user }) {
    await setUserSession(event, {
      user: {
        polar: user.email,
      },
      loggedInAt: Date.now(),
    })

    return sendRedirect(event, '/')
  },
})
