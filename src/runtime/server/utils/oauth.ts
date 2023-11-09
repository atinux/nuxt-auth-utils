import { githubEventHandler } from '../lib/oauth/github'
import { googleEventHandler } from '../lib/oauth/google'
import { spotifyEventHandler } from '../lib/oauth/spotify'

export const oauth = {
  githubEventHandler,
  spotifyEventHandler,
  googleEventHandler
}
