export default defineOAuthSalesforceEventHandler({
  config: {
    redirectURL: 'http://localhost:3000/auth/salesforce',
    baseURL: 'https://login.salesforce.com',
  },
  async onSuccess(event, { user }) {
    const userToSet = user?.name

    await setUserSession(event, {
      user: {
        salesforce: userToSet,
      },
      loggedInAt: Date.now(),
    })

    return sendRedirect(event, '/')
  },
})
