// This is only used if an oauth provider doesn't provide an `onSuccess` callback
export default defineSession((_event, { provider, user }) => ({
  user: {
    [provider]: user
  },
}))
