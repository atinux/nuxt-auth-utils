export default defineOAuthSteamEventHandler({
  config: {
    apiKey: 'test-api-key',
    redirectURL: 'https://steam.example.com/auth/steam',
  },
  onSuccess() {
    return { success: true }
  },
  onError(_event, error) {
    return { success: false, error: error.message }
  },
})
