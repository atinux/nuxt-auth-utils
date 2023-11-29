export default oauth.microsoftEventHandler({
    async onSuccess(event, { user }) {
      await setUserSession(event, {
        user: {
          microsoft: user,
        },
        loggedInAt: Date.now()
      })
  
      return sendRedirect(event, '/')
    }
  })
  