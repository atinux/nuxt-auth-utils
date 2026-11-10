import { defineEventHandler, getRouterParam } from 'nuxt/server'

// Every OAuth provider handler, the test checks this list against `src/runtime/server/lib/oauth`
const handlers = {
  defineOAuthAppleEventHandler,
  defineOAuthAtlassianEventHandler,
  defineOAuthAuth0EventHandler,
  defineOAuthAuthentikEventHandler,
  defineOAuthAzureB2CEventHandler,
  defineOAuthBattledotnetEventHandler,
  defineOAuthBoxEventHandler,
  defineOAuthCloudflareEventHandler,
  defineOAuthCognitoEventHandler,
  defineOAuthDiscordEventHandler,
  defineOAuthDropboxEventHandler,
  defineOAuthFacebookEventHandler,
  defineOAuthGitHubEventHandler,
  defineOAuthGitLabEventHandler,
  defineOAuthGiteaEventHandler,
  defineOAuthGoogleEventHandler,
  defineOAuthHerokuEventHandler,
  defineOAuthHubspotEventHandler,
  defineOAuthInstagramEventHandler,
  defineOAuthKeycloakEventHandler,
  defineOAuthKickEventHandler,
  defineOAuthLineEventHandler,
  defineOAuthLinearEventHandler,
  defineOAuthLinkedInEventHandler,
  defineOAuthLiveChatEventHandler,
  defineOAuthMastodonEventHandler,
  defineOAuthMicrosoftEventHandler,
  defineOAuthOidcEventHandler,
  defineOAuthOktaEventHandler,
  defineOAuthOryEventHandler,
  defineOAuthOsuEventHandler,
  defineOAuthPaypalEventHandler,
  defineOAuthPolarEventHandler,
  defineOAuthRiotGamesEventHandler,
  defineOAuthRobloxEventHandler,
  defineOAuthSalesforceEventHandler,
  defineOAuthSeznamEventHandler,
  defineOAuthShopifyCustomerEventHandler,
  defineOAuthSlackEventHandler,
  defineOAuthSpotifyEventHandler,
  defineOAuthSteamEventHandler,
  defineOAuthStravaEventHandler,
  defineOAuthTikTokEventHandler,
  defineOAuthTwitchEventHandler,
  defineOAuthVKEventHandler,
  defineOAuthWechatEventHandler,
  defineOAuthWorkOSEventHandler,
  defineOAuthXEventHandler,
  defineOAuthXSUAAEventHandler,
  defineOAuthYandexEventHandler,
  defineOAuthZendeskEventHandler,
  defineOAuthZitadelEventHandler,
}

// Runs a provider handler without configuration, `index` lists them
export default defineEventHandler((event) => {
  const name = getRouterParam(event, 'name')!
  if (name === 'index') return Object.keys(handlers)

  const handler = handlers[name as keyof typeof handlers]({
    onSuccess: () => ({ success: true }),
    onError: (_event, error) => ({ error: error.message }),
  } as never)
  return handler(event)
})
