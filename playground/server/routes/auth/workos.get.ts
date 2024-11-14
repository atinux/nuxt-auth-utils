export default defineOAuthWorkOSEventHandler({
  config: {
    screenHint: 'sign-up',
  },
  async onSuccess(event, { user }) {
    await setUserSession(event, {
      user: {
        workos: user.email,
      },
      loggedInAt: Date.now(),
    })

    return sendRedirect(event, '/')
  },
})
