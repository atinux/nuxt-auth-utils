import { githubEventHandler } from '../lib/oauth/github'
import { spotifyEventHandler } from '../lib/oauth/spotify'
import { auth0EventHandler } from '../lib/oauth/auth0'

export const oauth = {
  githubEventHandler,
  spotifyEventHandler,
  auth0EventHandler
}
