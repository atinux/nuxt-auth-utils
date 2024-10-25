export default defineOAuthPassportEventHandler({
  config: {
    emailRequired: true,
  },
  async onSuccess(event, { user }) {
    await setUserSession(event, {
      user: user,
      loggedInAt: Date.now(),
    });

    return sendRedirect(event, "/");
  },
});
