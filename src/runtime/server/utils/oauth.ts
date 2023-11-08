import { githubEventHandler } from '../lib/oauth/github'
import { spotifyEventHandler } from '../lib/oauth/spotify'
import { twitchEventHandler } from '../lib/oauth/twitch'

export const oauth = {
  githubEventHandler,
  spotifyEventHandler,
  twitchEventHandler,
}
