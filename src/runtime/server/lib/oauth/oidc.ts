import type { OAuthConfig } from '#auth-utils'
import { useRuntimeConfig } from '#imports'
import { defu } from 'defu'
import type { H3Event } from 'h3'
import { createError, eventHandler, getQuery, sendRedirect } from 'h3'
import { withQuery } from 'ufo'
import { getOAuthRedirectURL, handleAccessTokenErrorResponse, handleInvalidState, handleMissingConfiguration, handlePkceVerifier, handleState, requestAccessToken } from '../utils'

export interface OAuthOidcConfig {
  /**
   * OAuth Client ID
   *
   * @default process.env.NUXT_OAUTH_OIDC_CLIENT_ID
   */
  clientId?: string
  /**
   * OAuth Client Secret
   *
   * @default process.env.NUXT_OAUTH_OIDC_CLIENT_SECRET
   */
  clientSecret?: string
  /**
   * URL to the OpenID Configuration endpoint. Used to fetch the endpoint URLs from.
   *
   * @default process.env.NUXT_OAUTH_OIDC_CONFIG_URL
   * @example "https://my-provider.com/nidp/oauth/nam/.well-known/openid-configuration"
   */
  configUrl?: string
  /**
   * OAuth Scope
   *
   * @default ['openid']
   * @example ['openid', 'profile', 'email']
   */
  scope?: string[]
  /**
   * Redirect URL to to allow overriding for situations like prod failing to determine public hostname
   *
   * @default process.env.NUXT_OAUTH_OIDC_REDIRECT_URL
   */
  redirectURL?: string
  /**
   * Whether to use [PKCE](https://datatracker.ietf.org/doc/html/rfc7636).
   *
   * @default true
   */
  usePKCE?: boolean
}

/**
 * Standard OIDC claims.
 *
 * @see: https://openid.net/specs/openid-connect-core-1_0.html#StandardClaims
 */
interface OidcUser {
  /**
   * Subject - Identifier for the End-User at the Issuer.
   */
  sub: string

  /**
   * End-User's full name in displayable form including all name parts,
   * possibly including titles and suffixes, ordered according to the
   * End-User's locale and preferences.
   */
  name?: string

  /**
   * Given name(s) or first name(s) of the End-User. Note that in some cultures,
   * people can have multiple given names; all can be present, with the names
   * being separated by space characters.
   */
  given_name?: string

  /**
   * Surname(s) or last name(s) of the End-User. Note that in some cultures,
   * people can have multiple family names or no family name; all can be present,
   * with the names being separated by space characters.
   */
  family_name?: string

  /**
   * Middle name(s) of the End-User. Note that in some cultures, people can have
   * multiple middle names; all can be present, with the names being separated by
   * space characters. Also note that in some cultures, middle names are not used.
   */
  middle_name?: string

  /**
   * Casual name of the End-User that may or may not be the same as the given_name.
   * For instance, a nickname value of Mike might be returned alongside a given_name
   * value of Michael.
   */
  nickname?: string

  /**
   * Shorthand name by which the End-User wishes to be referred to at the RP, such as
   * janedoe or j.doe. This value MAY be any valid JSON string including special
   * characters such as @, /, or whitespace. The RP MUST NOT rely upon this value
   * being unique.
   */
  preferred_username?: string

  /**
   * URL of the End-User's profile page. The contents of this Web page SHOULD be
   * about the End-User.
   */
  profile?: string

  /**
   * URL of the End-User's profile picture. This URL MUST refer to an image file
   * (for example, a PNG, JPEG, or GIF image file), rather than to a Web page
   * containing an image. Note that this URL SHOULD specifically reference a profile
   * photo of the End-User suitable for displaying when describing the End-User,
   * rather than an arbitrary photo taken by the End-User.
   */
  picture?: string

  /**
   * URL of the End-User's Web page or blog. This Web page SHOULD contain information
   * published by the End-User or an organization that the End-User is affiliated with.
   */
  website?: string

  /**
   * End-User's preferred e-mail address. Its value MUST conform to the RFC 5322
   * addr-spec syntax. The RP MUST NOT rely upon this value being unique.
   */
  email?: string

  /**
   * True if the End-User's e-mail address has been verified; otherwise false.
   * When this Claim Value is true, this means that the OP took affirmative steps
   * to ensure that this e-mail address was controlled by the End-User at the time
   * the verification was performed. The means by which an e-mail address is verified
   * is context specific, and dependent upon the trust framework or contractual
   * agreements within which the parties are operating.
   */
  email_verified?: boolean

  /**
   * End-User's gender. Values defined by this specification are female and male.
   * Other values MAY be used when neither of the defined values are applicable.
   */
  gender?: string

  /**
   * End-User's birthday, represented as an ISO 8601-1 YYYY-MM-DD format. The year
   * MAY be 0000, indicating that it is omitted. To represent only the year, YYYY
   * format is allowed. Note that depending on the underlying platform's date related
   * function, providing just year can result in varying month and day, so the
   * implementers need to take this factor into account to correctly process the dates.
   */
  birthdate?: string

  /**
   * String from IANA Time Zone Database representing the End-User's time zone.
   * For example, Europe/Paris or America/Los_Angeles.
   */
  zoneinfo?: string

  /**
   * End-User's locale, represented as a BCP47 language tag. This is typically an
   * ISO 639 Alpha-2 language code in lowercase and an ISO 3166-1 Alpha-2 country
   * code in uppercase, separated by a dash. For example, en-US or fr-CA. As a
   * compatibility note, some implementations have used an underscore as the separator
   * rather than a dash, for example, en_US; Relying Parties MAY choose to accept
   * this locale syntax as well.
   */
  locale?: string

  /**
   * End-User's preferred telephone number. E.164 is RECOMMENDED as the format of
   * this Claim, for example, +1 (555) 555-5555 or +56 (2) 687 2400. If the phone
   * number contains an extension, it is RECOMMENDED that the extension be represented
   * using the RFC 3966 extension syntax, for example, +1 (555) 555-5555;ext=5678.
   */
  phone_number?: string

  /**
   * True if the End-User's phone number has been verified; otherwise false. When
   * this Claim Value is true, this means that the OP took affirmative steps to
   * ensure that this phone number was controlled by the End-User at the time the
   * verification was performed. The means by which a phone number is verified is
   * context specific, and dependent upon the trust framework or contractual
   * agreements within which the parties are operating. When true, the phone_number
   * Claim MUST be in E.164 format and any extensions MUST be represented in RFC 3966 format.
   */
  phone_number_verified?: boolean

  /**
   * End-User's preferred postal address.
   */
  address?: AddressClaim

  /**
   * Time the End-User's information was last updated. Its value is a JSON number
   * representing the number of seconds from 1970-01-01T00:00:00Z as measured in
   * UTC until the date/time.
   */
  updated_at?: number
}

/**
 * Address claim structure as defined in OpenID Connect specification
 */
export interface AddressClaim {
  /** Full mailing address, formatted for display or use on a mailing label */
  formatted?: string
  /** Full street address component, which may include house number, street name, post office box, and multi-line extended street address information */
  street_address?: string
  /** City or locality component */
  locality?: string
  /** State, province, prefecture, or region component */
  region?: string
  /** Zip code or postal code component */
  postal_code?: string
  /** Country name component */
  country?: string
}

interface OidcTokens {
  access_token: string
  scope: string
  token_type: string
}

/**
 * Event handler for generic OAuth using OIDC and PKCE.
 */
export function defineOAuthOidcEventHandler<TUser = OidcUser>({ config, onSuccess, onError }: OAuthConfig<OAuthOidcConfig, { user: TUser, tokens: OidcTokens }>) {
  return eventHandler(async (event: H3Event) => {
    config = defu(config, useRuntimeConfig(event).oauth?.oidc, {
      scope: ['openid'],
      usePKCE: true,
    } satisfies OAuthOidcConfig)

    const query = getQuery<{ code?: string, error?: string, state?: string }>(event)

    if (query.error) {
      const error = createError({
        statusCode: 401,
        message: `OIDC login failed: ${query.error || 'Unknown error'}`,
        data: query,
      })
      if (!onError) throw error
      return onError(event, error)
    }

    if (!config.clientId || !config.clientSecret || !config.configUrl) {
      return handleMissingConfiguration(event, 'oidc', ['clientId', 'clientSecret', 'configUrl'], onError)
    }

    const oidcConfig = await $fetch<{ authorization_endpoint: string, token_endpoint: string, userinfo_endpoint: string }>(config.configUrl)

    const redirectURL = config.redirectURL || getOAuthRedirectURL(event)
    const state = await handleState(event)
    const verifier = config.usePKCE ? await handlePkceVerifier(event) : undefined

    if (!query.code) {
      config.scope = config.scope || []

      return sendRedirect(
        event,
        withQuery(oidcConfig.authorization_endpoint, {
          client_id: config.clientId,
          redirect_uri: redirectURL,
          scope: config.scope.join(' '),
          state,
          response_type: 'code',
          code_challenge: verifier?.code_challenge,
          code_challenge_method: verifier?.code_challenge_method,
        }),
      )
    }

    if (query.state !== state) {
      return handleInvalidState(event, 'oidc', onError)
    }

    const tokens = await requestAccessToken<OidcTokens & { error?: unknown }>(oidcConfig.token_endpoint, {
      body: {
        grant_type: 'authorization_code',
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: redirectURL,
        code: query.code,
        code_verifier: verifier?.code_verifier,
      },
    })

    if (tokens.error) {
      return handleAccessTokenErrorResponse(event, 'oidc', tokens, onError)
    }

    const user = await $fetch<TUser>(oidcConfig.userinfo_endpoint, {
      headers: {
        Authorization: `${tokens.token_type} ${tokens.access_token}`,
      },
    })

    return onSuccess(event, {
      user,
      tokens,
    })
  })
}
