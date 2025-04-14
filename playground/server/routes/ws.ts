export default defineWebSocketHandler({
  async upgrade(request) {
    await requireUserSession(request)
  },
  async open(peer) {
    const { user } = await requireUserSession(peer)
    const username = Object.values(user).filter(Boolean).join(' ')
    peer.send(`Hello, ${username}!`)
  },
  message(peer, message) {
    peer.send(`Echo: ${message}`)
  },
})
