export default defineOAuthGiteaEventHandler({
  config: {
    emailRequired: true,
  },
  async onSuccess(event, { user }) {
    await setUserSession(event, {
      user: {
        gitea: user.email,
      },
      loggedInAt: Date.now(),
    })
    return sendRedirect(event, '/')
  },

})
