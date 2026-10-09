import { sendRedirect } from 'nuxt/server'

export default defineOAuthHubspotEventHandler({
  config: {
    scope: ['oauth'],
  },
  async onSuccess(event, { user }) {
    await setUserSession(event, {
      user: {
        hubspot: user.email,
      },
      loggedInAt: Date.now(),
    })

    return sendRedirect(event, '/')
  },
})
