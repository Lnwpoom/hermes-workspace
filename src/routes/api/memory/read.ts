import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { isAuthenticated } from '../../../server/auth-middleware'
import { readMemoryFile } from '../../../server/memory-browser'
import {
  messageFromBridgeError,
  remoteReadMemoryFile,
  remoteStateEnabled,
  statusFromBridgeError,
} from '../../../server/workspace-state-client'

export const Route = createFileRoute('/api/memory/read')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isAuthenticated(request)) {
          return json({ error: 'Unauthorized' }, { status: 401 })
        }
        const url = new URL(request.url)
        const pathParam = url.searchParams.get('path') || ''
        try {
          if (remoteStateEnabled()) {
            return json(await remoteReadMemoryFile(pathParam))
          }
          const content = readMemoryFile(pathParam)
          return json({ path: pathParam, content })
        } catch (error) {
          const message = messageFromBridgeError(error, 'Failed to read memory file')
          const status =
            statusFromBridgeError(error, 0) ||
            (/not allowed|outside workspace|required/i.test(message)
              ? 400
              : /ENOENT/.test(message)
                ? 404
                : 500)
          return json({ error: message }, { status })
        }
      },
    },
  },
})
