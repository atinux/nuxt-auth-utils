export default defineNitroPlugin((nitroApp) => {
  sessionHooks.hook('fetch', async (session) => {
    // Extend User Session
    // Or throw createError({ ... }) if session is invalid
    session.extended = {
      fromHooks: true,
    }
  })

  sessionHooks.hook('clear', async (_session) => {
    // Log that user logged out
    console.log('User logged out')
  })

  // In facebook login, the url is redirected to /#_=_ which is not a valid route
  // so we remove it from the url, we are loading this long before the app is loaded
  // by using render:html hook
  // this is a hack, but it works
  // https://stackoverflow.com/questions/7131909/facebook-callback-appends-to-return-url
  nitroApp.hooks.hook('render:html', (html) => {
    html.head.unshift(`
      <script>
        if (window.location.hash === "#_=_"){
          history.replaceState
              ? history.replaceState(null, null, window.location.href.split("#")[0])
              : window.location.hash = "";
        }
      </script>
    `)
  })
})
