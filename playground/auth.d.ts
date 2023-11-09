declare module '#auth-utils' {
  interface UserSession {
    user: {
      spotify?: any
      github?: any
      google?: any
      twitch?: any
      auth0?: any
    }
    loggedInAt: number
  }
}
