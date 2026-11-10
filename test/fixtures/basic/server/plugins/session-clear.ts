export default () => {
  sessionHooks.hook('clear', (session) => {
    clearedSessionIds.push(session.id)
  })
}
