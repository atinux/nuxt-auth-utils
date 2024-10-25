import type { H3Event } from "h3";
import { eventHandler, getQuery, sendRedirect } from "h3";
import { withQuery } from "ufo";
import { defu } from "defu";
import {
  handleMissingConfiguration,
  handleAccessTokenErrorResponse,
  getOAuthRedirectURL,
  requestAccessToken,
} from "../utils";
import { useRuntimeConfig } from "#imports";
import type { OAuthConfig } from "#auth-utils";

export interface OAuthPassportConfig {
  /**
   * Passport OAuth Client ID
   * @default process.env.NUXT_OAUTH_YANDEX_CLIENT_ID
   */
  clientId?: string;

  /**
   * Passport OAuth Client Secret
   * @default process.env.NUXT_OAUTH_YANDEX_CLIENT_SECRET
   */
  clientSecret?: string;

  /**
   * Passport OAuth Scope
   * @default []
   * @example ["login:avatar", "login:birthday", "login:email", "login:info", "login:default_phone"]
   */
  scope?: string[];

  /**
   * Passport OAuth Base URL
   */
  baseURL?: string;
  userURL?: string;
}

export function defineOAuthPassportEventHandler({
  config,
  onSuccess,
  onError,
}: OAuthConfig<OAuthPassportConfig>) {
  return eventHandler(async (event: H3Event) => {
    config = defu(
      config,
      useRuntimeConfig(event).oauth?.passport,
    ) as OAuthPassportConfig;

    const query = getQuery<{ code?: string }>(event);

    if (!config.clientId || !config.clientSecret) {
      return handleMissingConfiguration(
        event,
        "passport",
        ["clientId", "clientSecret"],
        onError,
      );
    }

    const redirectURL = config.redirectURL || getOAuthRedirectURL(event);

    if (!query.code) {
      config.scope = config.scope || [];
      // Redirect to Passport Oauth page
      return sendRedirect(
        event,
        withQuery((config.baseURL + "/oauth/authorize") as string, {
          response_type: "code",
          client_id: config.clientId,
          redirect_uri: redirectURL,
          scope: config.scope.join(" "),
        }),
      );
    }

    const tokens = await requestAccessToken(
      (config.baseURL + "/oauth/token") as string,
      {
        body: {
          client_id: config.clientId,
          client_secret: config.clientSecret,
          code: query.code as string,
          grant_type: "authorization_code",
          redirect_uri: config.redirectURL || getOAuthRedirectURL(event),
        },
      },
    );
    if (tokens.error) {
      return handleAccessTokenErrorResponse(event, "passport", tokens, onError);
    }

    const accessToken = tokens.access_token;
    // TODO: improve typing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user: any = await $fetch(config.userURL as string, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    console.log(user);

    return onSuccess(event, {
      tokens,
      user,
    });
  });
}
