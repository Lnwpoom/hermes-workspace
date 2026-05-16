import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
})

describe('kanban-dashboard-proxy', () => {
  it('routes kanban plugin calls through the shared dashboard fetch helper', async () => {
    const dashboardFetch = vi.fn(async () =>
      new Response(JSON.stringify({ columns: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    vi.doMock('./gateway-capabilities', () => ({
      dashboardFetch,
    }))

    const mod = await import('./kanban-dashboard-proxy')
    const board = await mod.fetchDashboardKanbanBoard('project alpha')

    expect(board).toEqual({ columns: [] })
    expect(dashboardFetch).toHaveBeenCalledTimes(1)
    expect(dashboardFetch.mock.calls[0]?.[0]).toBe('/api/plugins/kanban/board?board=project+alpha')
    const init = dashboardFetch.mock.calls[0]?.[1] as RequestInit
    expect(init.headers).toBeInstanceOf(Headers)
    expect((init.headers as Headers).get('Content-Type')).toBe('application/json')
  })
})
