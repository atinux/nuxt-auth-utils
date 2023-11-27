declare module '#auth-utils' {
  interface UserSession {
    user: {
      spotify?: any
      github?: any
      google?: any
      twitch?: any
      auth0?: any
      discord?: any
      battledotnet?: any
      keycloak?: any
    }
    loggedInAt: number
  }
}

export {}
