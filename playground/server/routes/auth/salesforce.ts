export default defineOAuthSalesforceEventHandler({
  config: {},
  async onSuccess(event, { user }) {
    await setUserSession(event, {
      user: {
        salesforce: user?.name,
      },
      loggedInAt: Date.now(),
    })

    return sendRedirect(event, '/')
  },
})
