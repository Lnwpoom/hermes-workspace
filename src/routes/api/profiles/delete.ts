import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { isAuthenticated } from '../../../server/auth-middleware'
import { deleteProfile } from '../../../server/profiles-browser'
import { requireJsonContentType } from '../../../server/rate-limit'
import {
  messageFromBridgeError,
  remoteDeleteProfile,
  remoteStateEnabled,
  statusFromBridgeError,
} from '../../../server/workspace-state-client'

export const Route = createFileRoute('/api/profiles/delete')({
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
            return json(await remoteDeleteProfile(body.name || ''))
          }
          deleteProfile(body.name || '')
          return json({ ok: true })
        } catch (error) {
          return json(
            {
              error: messageFromBridgeError(error, 'Failed to delete profile'),
            },
            { status: statusFromBridgeError(error) },
          )
        }
      },
    },
  },
})
