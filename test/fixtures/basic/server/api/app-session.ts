import { defineEventHandler, useSession } from 'nuxt/server'

// The app's own `nuxt/server` session (`nuxt-session` cookie), next to the user session
export default defineEventHandler(async (event) => {
  const session = await useSession<{ visits?: number }>(event)
  await session.update(data => ({ visits: (data.visits ?? 0) + 1 }))

  return { visits: session.data.visits, user: (await getUserSession(event)).user ?? null }
})
