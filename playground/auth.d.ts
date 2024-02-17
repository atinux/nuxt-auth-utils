declare module '#auth-utils' {
  interface User {
    spotify?: string
    github?: string
    google?: string
    twitch?: string
    auth0?: string
    microsoft?: string
    discord?: string
    battledotnet?: string
    keycloak?: string
    linkedin?: string
    cognito?: string
  }

  interface UserSession {
    extended?: any
    loggedInAt: number
  }
}

export {}
