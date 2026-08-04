export default defineOAuthGoogleEventHandler({
  config: {
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    authorizationURL: 'https://accounts.example.com/authorize',
    tokenURL: 'https://accounts.example.com/token',
    userURL: 'https://accounts.example.com/userinfo',
    authorizationParams: {
      state: 'configured-state-must-not-override-generated-state',
    },
  },
  onSuccess() {
    return { success: true }
  },
  onError(_event, error) {
    return { success: false, error: error.message }
  },
})
