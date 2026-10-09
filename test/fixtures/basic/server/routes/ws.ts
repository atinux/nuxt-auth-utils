export default defineWebSocketHandler({
  async upgrade(request) {
    await requireUserSession(request)
  },
  async open(peer) {
    const { user } = await requireUserSession(peer)
    peer.send(JSON.stringify({ user }))
  },
})
