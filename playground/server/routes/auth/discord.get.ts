export default oauth.discordEventHandler({
    config: {
        redirect_uri: 'https://<production-domain>/auth/discord',
    },
    async onSuccess(event, { user }) {
      await setUserSession(event, {
        user: {
          discord: user,
        },
        loggedInAt: Date.now()
      })
  
      return sendRedirect(event, '/')
    }
  })
