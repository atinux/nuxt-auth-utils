declare module '#auth-utils-session' {
  interface UserSession {
    user: {
      spotify?: any
      github?: any
    }
    loggedInAt: number
  }
}
