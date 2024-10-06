export default defineOAuthLinearEventHandler({
  async onSuccess(event, { user }) {
    await setUserSession(event, {
      user: {
        linear: user.name,
      },
      loggedInAt: Date.now(),
    })

    return sendRedirect(event, '/')
  },
})
