// Refreshes the tokens of a session in the `fetch` hook, as in https://github.com/atinux/nuxt-auth-utils/issues/357
export default () => {
  sessionHooks.hook('fetch', async (session, event) => {
    if (session.impersonatorId === 'expired') {
      await replaceUserSession(event, { user: session.user })
      return
    }
    if (session.refreshToken !== 'old') return
    await setUserSession(event, { user: { name: 'refreshed' }, refreshToken: 'new' })
    // Properties added to the session only answer this request
    session.extra = 'added'
  })
}
