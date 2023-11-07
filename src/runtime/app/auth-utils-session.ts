import { defineSession } from '../server/utils/session'

// Default session provider (only used when user does not provide their own provider or `onSuccess` handler)
export default defineSession((event, { provider, user }) => ({
  user: {
    [provider]: user
  },
  loggedInAt: new Date()
}))
