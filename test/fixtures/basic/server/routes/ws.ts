export default defineWebSocketHandler({
  async upgrade(request) {
    await requireUserSession(request)
  },
  async open(peer) {
    const { user } = await requireUserSession(peer)
    // @ts-expect-error the session is read-only in WebSocket handlers
    const writeError = await setUserSession(peer, { user: { fromWebSocket: true } }).then(() => null, (error: Error) => error.message)
    peer.send(JSON.stringify({ user, writeError }))
  },
})
