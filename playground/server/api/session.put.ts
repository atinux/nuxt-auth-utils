export default eventHandler(async (event) => {
  const { session, config } = await readBody(event)

  return setUserSession(event, session || {}, config)
})
