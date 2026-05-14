import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { isAuthenticated } from '../../../server/auth-middleware'
import { renameProfile } from '../../../server/profiles-browser'
import { requireJsonContentType } from '../../../server/rate-limit'
import {
  messageFromBridgeError,
  remoteRenameProfile,
  remoteStateEnabled,
  statusFromBridgeError,
} from '../../../server/workspace-state-client'

export const Route = createFileRoute('/api/profiles/rename')({
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
            oldName?: string
            newName?: string
          }
          if (remoteStateEnabled()) {
            return json(await remoteRenameProfile(body))
          }
          return json({
            ok: true,
            profile: renameProfile(body.oldName || '', body.newName || ''),
          })
        } catch (error) {
          return json(
            {
              error: messageFromBridgeError(error, 'Failed to rename profile'),
            },
            { status: statusFromBridgeError(error) },
          )
        }
      },
    },
  },
})
