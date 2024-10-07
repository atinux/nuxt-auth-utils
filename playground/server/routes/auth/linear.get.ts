export default defineOAuthLinearEventHandler({
  async onSuccess(event, { user }) {
    await setUserSession(event, {
      user: {
        linear: user.email,
      },
      loggedInAt: Date.now(),
    })

    return sendRedirect(event, '/')
  },
})
