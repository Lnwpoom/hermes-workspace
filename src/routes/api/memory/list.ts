import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { isAuthenticated } from '../../../server/auth-middleware'
import { listMemoryFiles } from '../../../server/memory-browser'
import {
  messageFromBridgeError,
  remoteListMemoryFiles,
  remoteStateEnabled,
  statusFromBridgeError,
} from '../../../server/workspace-state-client'

export const Route = createFileRoute('/api/memory/list')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isAuthenticated(request)) {
          return json({ error: 'Unauthorized' }, { status: 401 })
        }
        try {
          if (remoteStateEnabled()) {
            return json(await remoteListMemoryFiles())
          }
          return json({ files: listMemoryFiles() })
        } catch (error) {
          return json(
            {
              error: messageFromBridgeError(error, 'Failed to list memory files'),
            },
            { status: statusFromBridgeError(error) },
          )
        }
      },
    },
  },
})
