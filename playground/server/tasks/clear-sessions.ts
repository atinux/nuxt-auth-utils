export default defineTask({
  meta: {
    name: 'clear-sessions',
    description: 'Clear expired sessions',
  },
  run({ payload, context }) {
    console.log('Running clear-sessions task...')
    cleanupOrphanedUserSessions()
    return { result: 'Success' }
  },
})
