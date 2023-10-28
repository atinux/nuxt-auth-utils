export default oauth.githubEventHandler({
  onSuccess(event, res) {
    console.log(res)

    return { success: true }
  }
})
