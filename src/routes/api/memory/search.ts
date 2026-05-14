import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { isAuthenticated } from '../../../server/auth-middleware'
import { searchMemoryFiles } from '../../../server/memory-browser'
import {
  messageFromBridgeError,
  remoteSearchMemoryFiles,
  remoteStateEnabled,
  statusFromBridgeError,
} from '../../../server/workspace-state-client'

export const Route = createFileRoute('/api/memory/search')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isAuthenticated(request)) {
          return json({ error: 'Unauthorized' }, { status: 401 })
        }
        const url = new URL(request.url)
        const query = url.searchParams.get('q') || ''
        try {
          if (remoteStateEnabled()) {
            return json(await remoteSearchMemoryFiles(query))
          }
          return json({ results: searchMemoryFiles(query) })
        } catch (error) {
          return json(
            {
              error: messageFromBridgeError(error, 'Failed to search memory files'),
            },
            { status: statusFromBridgeError(error) },
          )
        }
      },
    },
  },
})
