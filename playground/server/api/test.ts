export default eventHandler(async (event) => {
  const _session = await requireUserSession(event)

  // console.log(session.user.auth0)
  return {}
})
