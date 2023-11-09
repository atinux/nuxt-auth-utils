import { githubEventHandler } from '../lib/oauth/github'
import { googleEventHandler } from '../lib/oauth/google'
import { spotifyEventHandler } from '../lib/oauth/spotify'
import { twitchEventHandler } from '../lib/oauth/twitch'
import { auth0EventHandler } from '../lib/oauth/auth0'

export const oauth = {
  githubEventHandler,
  spotifyEventHandler,
  googleEventHandler,
  twitchEventHandler,
  auth0EventHandler
}
