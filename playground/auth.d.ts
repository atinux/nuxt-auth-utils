declare module '#auth-utils' {
  interface UserSession {
    user: {
      spotify?: any
      github?: any
    }
    loggedInAt: number
  }
}
