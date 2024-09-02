import { type H3Event, useSession, createError } from 'h3'
import { useRuntimeConfig } from '#imports'

interface ChallengeSession {
  data: {
    challenge: string
    challengeId: string
  }
  expires: number
}

function useChallengeSession(event: H3Event) {
  return useSession<ChallengeSession>(event, {
    name: 'webauthn',
    password: useRuntimeConfig(event).session.password,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: 180, // 3 minutes
    },
  })
}

export async function storeChallengeAsSession(event: H3Event, challenge: string, challengeId: string) {
  const challengeSession = await useChallengeSession(event)
  await challengeSession.update({
    data: {
      challenge,
      challengeId,
    },
    expires: Date.now() + 180 * 1000, // 3 minutes
  })
}

export async function getChallengeFromSession(event: H3Event, challengeId: string) {
  const challengeSession = await useChallengeSession(event)
  const challenge = challengeSession.data
  await challengeSession.clear()

  if (challenge.expires < Date.now())
    throw createError({ statusCode: 400, message: 'Challenge expired' })
  if (challenge.data.challengeId !== challengeId)
    throw createError({ statusCode: 400, message: 'Challenge id mismatch' })

  return challenge.data.challenge
}
