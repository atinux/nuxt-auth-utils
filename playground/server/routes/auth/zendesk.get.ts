import { sendRedirect } from 'nuxt/server'

export default defineOAuthZendeskEventHandler({
  async onSuccess(event, { user }) {
    await setUserSession(event, {
      user: {
        zendesk: user.email,
      },
      loggedInAt: Date.now(),
    })

    return sendRedirect(event, '/')
  },
})
