import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { isAuthenticated } from '../../../server/auth-middleware'
import {
  getActiveProfileName,
  listProfiles,
} from '../../../server/profiles-browser'
import {
  messageFromBridgeError,
  remoteListProfiles,
  remoteStateEnabled,
  statusFromBridgeError,
} from '../../../server/workspace-state-client'

export const Route = createFileRoute('/api/profiles/list')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isAuthenticated(request)) {
          return json({ error: 'Unauthorized' }, { status: 401 })
        }
        try {
          if (remoteStateEnabled()) {
            return json(await remoteListProfiles())
          }
          return json({
            profiles: listProfiles(),
            activeProfile: getActiveProfileName(),
          })
        } catch (error) {
          return json(
            {
              error: messageFromBridgeError(error, 'Failed to list profiles'),
              profiles: [],
            },
            { status: statusFromBridgeError(error) },
          )
        }
      },
    },
  },
})
