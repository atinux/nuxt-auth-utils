export default local.jwtEventHandler({
  config: {
  },
  async onSuccess (event, { user }) {
    await setUserSession(event, {
      user: {
        jwt: user,

      },
      loggedInAt: Date.now()
    })

    return user
  }
})
