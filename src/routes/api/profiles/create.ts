import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { isAuthenticated } from '../../../server/auth-middleware'
import { createProfile } from '../../../server/profiles-browser'
import { requireJsonContentType } from '../../../server/rate-limit'
import {
  messageFromBridgeError,
  remoteCreateProfile,
  remoteStateEnabled,
  statusFromBridgeError,
} from '../../../server/workspace-state-client'

export const Route = createFileRoute('/api/profiles/create')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isAuthenticated(request)) {
          return json({ error: 'Unauthorized' }, { status: 401 })
        }
        const csrfCheck = requireJsonContentType(request)
        if (csrfCheck) return csrfCheck
        try {
          const body = (await request.json()) as {
            name?: string
            cloneFrom?: string
            model?: string
            provider?: string
          }
          if (remoteStateEnabled()) {
            return json(await remoteCreateProfile(body))
          }
          return json({
            ok: true,
            profile: createProfile(body.name || '', {
              cloneFrom: body.cloneFrom,
              model: body.model,
              provider: body.provider,
            }),
          })
        } catch (error) {
          return json(
            {
              error: messageFromBridgeError(error, 'Failed to create profile'),
            },
            { status: statusFromBridgeError(error) },
          )
        }
      },
    },
  },
})
