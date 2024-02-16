declare module '#auth-utils' {
  interface User {
    spotify?: any
    github?: any
    google?: any
    twitch?: any
    auth0?: any
    microsoft?: any;
    discord?: any
    battledotnet?: any
    keycloak?: any
    linkedin?: any
  }

  interface UserSession {
    extended?: any
    loggedInAt: number
  }
}

export {}
