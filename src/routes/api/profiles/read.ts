import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { isAuthenticated } from '../../../server/auth-middleware'
import { readProfile } from '../../../server/profiles-browser'
import {
  messageFromBridgeError,
  remoteReadProfile,
  remoteStateEnabled,
  statusFromBridgeError,
} from '../../../server/workspace-state-client'

export const Route = createFileRoute('/api/profiles/read')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isAuthenticated(request)) {
          return json({ error: 'Unauthorized' }, { status: 401 })
        }
        try {
          const url = new URL(request.url)
          const name = (url.searchParams.get('name') || '').trim() || 'default'
          if (remoteStateEnabled()) {
            return json(await remoteReadProfile(name))
          }
          return json({ profile: readProfile(name) })
        } catch (error) {
          return json(
            {
              error: messageFromBridgeError(error, 'Failed to read profile'),
            },
            { status: statusFromBridgeError(error) },
          )
        }
      },
    },
  },
})
