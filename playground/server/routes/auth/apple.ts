export default defineOAuthAppleEventHandler({
  async onSuccess(event, { user, tokens, payload }) {
    const userToSet = user?.name?.firstName && user?.name?.lastName
      ? `${user.name.firstName} ${user.name.lastName}`
      : user?.name?.firstName || user?.name?.lastName || payload.email || payload.sub

    await setUserSession(event, {
      user: {
        apple: userToSet,
      },
      secure: {
        ...tokens
      },
      loggedInAt: Date.now(),
    })

    return sendRedirect(event, '/')
  },
})
