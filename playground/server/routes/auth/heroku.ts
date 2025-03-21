export default defineOAuthHerokuEventHandler({
  config: {
    redirectURL: 'http://localhost:3000/auth/heroku',
  },
  async onSuccess(event, { user }) {
    const userToSet = user?.name

    await setUserSession(event, {
      user: {
        heroku: userToSet,
      },
      loggedInAt: Date.now(),
    })

    return sendRedirect(event, '/')
  },
})
