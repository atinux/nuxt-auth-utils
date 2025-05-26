export default defineOAuthBitrix24EventHandler({
  config: {},
  async onSuccess(event, { user, payload }) {
    const userToSet = user?.name?.firstName && user?.name?.lastName
      ? `${user.name.firstName} ${user.name.lastName}`
      : user?.name?.firstName || user?.name?.lastName || user?.id || payload.memberId

    await setUserSession(event, {
      user: {
        bitrix24: {
          id: user.id,
          name: userToSet,
          photo: user.photo,
          targetOrigin: user.targetOrigin,
        },
      },
      secure: {
        b24Tokens: payload,
      },
      loggedInAt: Date.now(),
    })

    return sendRedirect(event, '/')
  },
})
