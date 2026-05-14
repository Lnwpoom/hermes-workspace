import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { isAuthenticated } from '../../../server/auth-middleware'
import { setActiveProfile } from '../../../server/profiles-browser'
import { requireJsonContentType } from '../../../server/rate-limit'
import {
  messageFromBridgeError,
  remoteActivateProfile,
  remoteStateEnabled,
  statusFromBridgeError,
} from '../../../server/workspace-state-client'

export const Route = createFileRoute('/api/profiles/activate')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isAuthenticated(request)) {
          return json({ error: 'Unauthorized' }, { status: 401 })
        }
        const csrfCheck = requireJsonContentType(request)
        if (csrfCheck) return csrfCheck
        try {
          const body = (await request.json()) as { name?: string }
          if (remoteStateEnabled()) {
            return json(await remoteActivateProfile(body.name || ''))
          }
          setActiveProfile(body.name || '')
          return json({ ok: true })
        } catch (error) {
          return json(
            {
              error: messageFromBridgeError(error, 'Failed to activate profile'),
            },
            { status: statusFromBridgeError(error) },
          )
        }
      },
    },
  },
})
