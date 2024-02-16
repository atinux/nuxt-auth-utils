export default eventHandler(async (event) => {
  const session = await requireUserSession(event)

  // console.log(session.user.auth0)
  return {}
})
