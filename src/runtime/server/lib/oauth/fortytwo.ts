import type { H3Event } from 'h3'
import { eventHandler, getQuery, sendRedirect, setCookie, getCookie } from 'h3'
import { withQuery } from 'ufo'
import { defu } from 'defu'
import { randomUUID } from 'uncrypto'
import { handleMissingConfiguration, handleAccessTokenErrorResponse, getOAuthRedirectURL, requestAccessToken } from '../utils'
import { useRuntimeConfig, createError } from '#imports'
import type { OAuthConfig } from '#auth-utils'

export interface OAuthFortyTwoConfig {
  /**
   * FortyTwo OAuth Client ID.
   * Defaults to `process.env.NUXT_OAUTH_FORTYTWO_CLIENT_ID`.
   */
  clientId?: string
  /**
   * FortyTwo OAuth Client Secret.
   * Defaults to `process.env.NUXT_OAUTH_FORTYTWO_CLIENT_SECRET`.
   */
  clientSecret?: string
  /**
   * Scopes requested from the FortyTwo API.
   * @default ['public']
   * @see https://api.intra.42.fr/apidoc/oauth#scopes
   * @example ['public', 'profile']
   */
  scope?: string[]
  /**
   * The authorization URL for FortyTwo OAuth.
   * @default 'https://api.intra.42.fr/oauth/authorize'
   */
  authorizationURL?: string
  /**
   * The token exchange URL for FortyTwo OAuth.
   * @default 'https://api.intra.42.fr/oauth/token'
   */
  tokenURL?: string
  /**
   * The base URL for the FortyTwo API (used to fetch user data).
   * @default 'https://api.intra.42.fr/v2'
   */
  apiURL?: string
  /**
   * Override the automatically determined redirect URL for the OAuth callback.
   * Useful in specific deployment environments where the public hostname might not be correctly inferred.
   * Defaults to `process.env.NUXT_OAUTH_FORTY_TWO_REDIRECT_URL` or derived from the request.
   */
  redirectURL?: string
}

interface FortyTwoImage {
  link: string
  versions: {
    large: string
    medium: string
    small: string
    micro: string
  }
}

interface FortyTwoGroup {
  id: number
  name: string
}

interface FortyTwoCursusUser {
  id: number
  begin_at: string
  end_at: string | null
  cursus_id: number
  user: {
    id: number
    login: string
  }
  level: number
  skills: Array<{
    id: number
    name: string
    level: number
  }>
}

interface FortyTwoProjectUser {
  id: number
  status: string
  final_mark: number | null
  project: {
    id: number
    name: string
    slug: string
  }
  cursus_ids: number[]
}

interface FortyTwoLanguageUser {
  id: number
  language_id: number
  user_id: number
  position: number
}

interface FortyTwoAchievement {
  id: number
  name: string
  description: string
  kind: string
  visible: boolean
  image: string
}

interface FortyTwoTitle {
  id: number
  name: string
}

interface FortyTwoTitleUser {
  id: number
  user_id: number
  title_id: number
  selected: boolean
}

interface FortyTwoPartnership {
  id: number
  created_at: string
  updated_at: string
  user_id: number
  partner_id: number
}

interface FortyTwoExpertiseUser {
  id: number
  expertise_id: number
  interested: boolean
  value: number
  contact_me: boolean
}

interface FortyTwoRole {
  id: number
  name: string
  slug: string
  description: string
}

interface FortyTwoCampus {
  id: number
  name: string
  time_zone: string
  language: {
    id: number
    name: string
    identifier: string
  }
  users_count: number
}

interface FortyTwoCampusUser {
  id: number
  campus_id: number
  user_id: number
  is_primary: boolean
}

interface FortyTwoUser {
  id: number
  email: string
  login: string
  first_name: string
  last_name: string
  usual_full_name: string
  usual_first_name: string
  url: string
  phone: string | null
  displayname: string
  kind: string
  image: FortyTwoImage
  staff?: boolean
  correction_point: number
  pool_month: string | null
  pool_year: string | null
  location: string | null
  wallet: number
  anonymize_date: string | null
  data_erasure_date: string | null
  alumni?: boolean
  active?: boolean
  groups: FortyTwoGroup[]
  cursus_users: FortyTwoCursusUser[]
  projects_users: FortyTwoProjectUser[]
  languages_users: FortyTwoLanguageUser[]
  achievements: FortyTwoAchievement[]
  titles: FortyTwoTitle[]
  titles_users: FortyTwoTitleUser[]
  partnerships: FortyTwoPartnership[]
  patroned: FortyTwoUser[]
  patroning: FortyTwoUser[]
  expertises_users: FortyTwoExpertiseUser[]
  roles: FortyTwoRole[]
  campus: FortyTwoCampus[]
  campus_users: FortyTwoCampusUser[]
}

interface FortyTwoTokens {
  access_token: string
  token_type: string
  expires_in: number
  scope: string // Space-separated string of granted scopes
  created_at: number
}

const COOKIE_NAME = 'nuxt_oauth_fortytwo_state'

export function defineOAuthFortyTwoEventHandler({ config, onSuccess, onError }: OAuthConfig<OAuthFortyTwoConfig, { user: FortyTwoUser, tokens: FortyTwoTokens }>) {
  return eventHandler(async (event: H3Event) => {
    config = defu(config, useRuntimeConfig(event).oauth?.fortytwo, {
      authorizationURL: 'https://api.intra.42.fr/oauth/authorize',
      tokenURL: 'https://api.intra.42.fr/oauth/token',
      apiURL: 'https://api.intra.42.fr/v2',
      scope: ['public'],
    }) as OAuthFortyTwoConfig

    const query = getQuery<{ code?: string, error?: string, state?: string }>(event)

    if (query.error) {
      const error = createError({
        statusCode: 401,
        message: `FortyTwo login failed: ${query.error || 'Unknown error'}`,
        data: query,
      })
      if (!onError) throw error
      return onError(event, error)
    }

    if (!config.clientId || !config.clientSecret) {
      return handleMissingConfiguration(event, 'fortytwo', ['clientId', 'clientSecret'], onError)
    }

    const redirectURL = config.redirectURL || getOAuthRedirectURL(event)

    if (!query.code) {
      const state = randomUUID()
      setCookie(event, COOKIE_NAME, state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 5, // Cookie expires in 5 minutes (for state validation)
        sameSite: 'lax',
      })

      return sendRedirect(
        event,
        withQuery(config.authorizationURL as string, {
          client_id: config.clientId,
          redirect_uri: redirectURL,
          scope: config.scope.join(' '),
          response_type: 'code',
          state, // Include the generated state
        }),
      )
    }

    const storedState = getCookie(event, COOKIE_NAME)
    if (!query.state || query.state !== storedState) {
      const error = createError({
        statusCode: 403,
        message: 'Invalid state parameter for FortyTwo OAuth. Possible CSRF attack or expired session.',
        data: query,
      })
      if (!onError) throw error
      return onError(event, error)
    }

    const tokens = await requestAccessToken<FortyTwoTokens>(config.tokenURL as string, {
      method: 'POST',
      body: {
        grant_type: 'authorization_code',
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: redirectURL,
        code: query.code,
        state: query.state,
      },
    })

    if (tokens.error) {
      return handleAccessTokenErrorResponse(event, 'fortytwo', tokens, onError)
    }

    const accessToken = tokens.access_token

    const user: FortyTwoUser = await $fetch<FortyTwoUser>(`${config.apiURL}/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    return onSuccess(event, {
      user,
      tokens,
    })
  })
}
