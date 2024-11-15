declare module '#auth-utils' {
  interface User {
    webauthn?: string
    email?: string
    password?: string
    spotify?: string
    github?: string
    gitlab?: string
    google?: string
    twitch?: string
    auth0?: string
    microsoft?: string
    discord?: string
    battledotnet?: string
    keycloak?: string
    linear?: string
    linkedin?: string
    cognito?: string
    facebook?: string
    instagram?: string
    paypal?: string
    steam?: string
    x?: string
    xsuaa?: string
    vk?: string
    yandex?: string
    tiktok?: string
    dropbox?: string
    workos?: string
    polar?: string
    zitadel?: string
    authentik?: string
    seznam?: string
  }

  interface UserSession {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    extended?: any
    jtw?: {
      accessToken: string
      refreshToken: string
    }
    loggedInAt: number
  }

  interface SecureSessionData {
  }
}

export {}
