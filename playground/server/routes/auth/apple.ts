export default defineOAuthAppleEventHandler({
  async onSuccess(event, { user, tokens }) {
    const userToSet = user?.name?.firstName && user?.name?.lastName
      ? `${user.name.firstName} ${user.name.lastName}`
      : user?.name?.firstName || user?.name?.lastName || tokens.email || tokens.sub

    await setUserSession(event, {
      user: {
        apple: userToSet,
      },
      loggedInAt: Date.now(),
    })

    return sendRedirect(event, '/')
  },
})
