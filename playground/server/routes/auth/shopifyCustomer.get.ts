export default defineOAuthShopifyCustomerEventHandler({
  async onSuccess(event, { user }) {
    await setUserSession(event, {
      user: {
        firstName: user?.firstName,
        lastName: user?.lastName,
        email: user?.emailAddress?.emailAddress,
      },
      loggedInAt: Date.now(),
    })

    return sendRedirect(event, '/')
  },
})
