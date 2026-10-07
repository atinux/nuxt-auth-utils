export default defineEventHandler(async (event) => {
  const { operation, data } = await readBody(event)
  const result = operation === 'replace'
    ? await replaceUserSession(event, data)
    : await setUserSession(event, data)

  return { result, session: await getUserSession(event) }
})
