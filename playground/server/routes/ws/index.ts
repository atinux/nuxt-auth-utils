export default defineWebSocketHandler({
  // async upgrade(request) {
  //   const session = await getUserSession(request)
  //   console.log(`[upgrade] Session id: ${session.id}`)
  //   return {}
  // },
  async open(peer) {
    // const session = await getUserSession(peer.request)
    // console.log(`[open] Session:`, session)
    // peer.send(`Hello, ${session.id}!`)
  },
  message(peer, message) {
    // console.log('message', message)
  },
})
