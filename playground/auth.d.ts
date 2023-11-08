declare module '#auth-utils' {
  interface UserSession {
    user: {
      spotify?: any
      github?: any
      auth0?: any
    }
    loggedInAt: number
  }
}
