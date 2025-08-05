declare module '#auth-utils' {
  interface UserSession {
    /**
     * Extra session data, available on client and server
     */
    [key: string]: unknown
  }
}

export {}
