import type { JWSVerifyResult, JWTClaims } from 'unjwt'
import { sign, verify } from 'unjwt/jws'

export default eventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.jwt?.accessToken && !session.jwt?.refreshToken) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    })
  }

  // For demo purposes only, use high entropy secrets or keys in production
  const accessTokenKey = new TextEncoder().encode(process.env.NUXT_SESSION_PASSWORD)
  const refreshTokenKey = new TextEncoder().encode(`${process.env.NUXT_SESSION_PASSWORD}-secret`)

  const verifiedRefreshToken = await verify<JWTClaims>(session.jwt.refreshToken, refreshTokenKey).catch(() => false as const)

  if (!verifiedRefreshToken || isExpired(verifiedRefreshToken)) {
    throw createError({
      statusCode: 401,
      message: 'refresh token is invalid',
    })
  }

  const accessToken = await sign(
    {
      hello: 'world',
      exp: Math.floor(Date.now() / 1000) + 30, // 30 seconds
    },
    accessTokenKey,
    {
      alg: 'HS256',
    },
  )

  await setUserSession(event, {
    jwt: {
      accessToken,
      refreshToken: session.jwt.refreshToken,
    },
    loggedInAt: Date.now(),
  })

  return {
    accessToken,
    refreshToken: session.jwt.refreshToken,
  }
})

function isExpired(payload: JWSVerifyResult<JWTClaims>) {
  return payload.payload?.exp && payload.payload.exp < (Date.now() / 1000)
}
