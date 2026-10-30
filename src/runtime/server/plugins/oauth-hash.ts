import { useRuntimeConfig, useServerHooks } from 'nuxt/server'

// In Facebook and Instagram login, the URL is redirected with `#_=_` which is not a valid route,
// so we remove it from the URL before the app is loaded.
// A `render:html` hook also covers pages rendered with `ssr: false`, where app plugins don't run on the server.
// https://stackoverflow.com/questions/7131909/facebook-callback-appends-to-return-url
export default () => {
  useServerHooks().hook('render:html', (html) => {
    const oauth = useRuntimeConfig().oauth as Record<string, { clientId?: string } | undefined> | undefined
    if (!oauth?.facebook?.clientId && !oauth?.instagram?.clientId) return

    html.head.unshift('<script>if(window.location.hash==="#_=_"){history.replaceState?history.replaceState(null,null,window.location.href.split("#")[0]):window.location.hash=""}</script>')
  })
}
