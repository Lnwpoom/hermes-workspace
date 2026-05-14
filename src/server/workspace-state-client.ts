import { CLAUDE_DASHBOARD_URL } from './gateway-capabilities'
import type { MemoryFileMeta, MemorySearchMatch } from './memory-browser'
import type { ProfileDetail, ProfileSummary } from './profiles-browser'

const STATE_BRIDGE_HEADER = 'X-Hermes-Bridge-Token'
const STATE_BRIDGE_TOKEN =
  process.env.HERMES_DASHBOARD_BRIDGE_TOKEN ||
  process.env.HERMES_API_TOKEN ||
  process.env.CLAUDE_API_TOKEN ||
  ''

export class WorkspaceStateBridgeError extends Error {
  status: number

  constructor(message: string, status = 500) {
    super(message)
    this.name = 'WorkspaceStateBridgeError'
    this.status = status
  }
}

export function workspaceStateBaseUrl(): string | null {
  try {
    const url = new URL(CLAUDE_DASHBOARD_URL)
    if (!url.pathname.includes('/workspace-dashboard')) return null
    url.pathname = url.pathname.replace(/\/workspace-dashboard\/?$/, '/workspace-state')
    url.search = ''
    url.hash = ''
    return url.toString().replace(/\/+$/, '')
  } catch {
    return null
  }
}

export function remoteStateEnabled(): boolean {
  return Boolean(workspaceStateBaseUrl() && STATE_BRIDGE_TOKEN)
}

function remoteErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'error' in error) {
    const value = (error as { error?: unknown }).error
    if (typeof value === 'string' && value.trim()) return value
  }
  return fallback
}

async function stateFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const base = workspaceStateBaseUrl()
  if (!base) {
    throw new WorkspaceStateBridgeError('Workspace state bridge is not configured', 503)
  }
  if (!STATE_BRIDGE_TOKEN) {
    throw new WorkspaceStateBridgeError('Workspace state bridge token is missing', 503)
  }

  const headers = new Headers(init.headers)
  headers.set(STATE_BRIDGE_HEADER, STATE_BRIDGE_TOKEN)

  const response = await fetch(`${base}${path}`, {
    ...init,
    headers,
  })
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as unknown
    throw new WorkspaceStateBridgeError(
      remoteErrorMessage(body, `Workspace state bridge failed (${response.status})`),
      response.status,
    )
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

async function stateFetchRaw(path: string, init: RequestInit = {}): Promise<Response> {
  const base = workspaceStateBaseUrl()
  if (!base) {
    throw new WorkspaceStateBridgeError('Workspace state bridge is not configured', 503)
  }
  if (!STATE_BRIDGE_TOKEN) {
    throw new WorkspaceStateBridgeError('Workspace state bridge token is missing', 503)
  }

  const headers = new Headers(init.headers)
  headers.set(STATE_BRIDGE_HEADER, STATE_BRIDGE_TOKEN)

  const response = await fetch(`${base}${path}`, {
    ...init,
    headers,
  })
  if (!response.ok) {
    const body = (await response.clone().json().catch(() => null)) as unknown
    throw new WorkspaceStateBridgeError(
      remoteErrorMessage(body, `Workspace state bridge failed (${response.status})`),
      response.status,
    )
  }
  return response
}

function jsonRequest(body: unknown): RequestInit {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  }
}

export function remoteListProfiles(): Promise<{
  profiles: Array<ProfileSummary>
  activeProfile: string
}> {
  return stateFetch('/profiles/list')
}

export function remoteReadProfile(name: string): Promise<{ profile: ProfileDetail }> {
  return stateFetch(`/profiles/read?name=${encodeURIComponent(name)}`)
}

export function remoteActivateProfile(name: string): Promise<{ ok: boolean }> {
  return stateFetch('/profiles/activate', jsonRequest({ name }))
}

export function remoteCreateProfile(body: {
  name?: string
  cloneFrom?: string
  model?: string
  provider?: string
}): Promise<{ ok: boolean; profile: ProfileDetail }> {
  return stateFetch('/profiles/create', jsonRequest(body))
}

export function remoteUpdateProfile(body: {
  name?: string
  patch?: Record<string, unknown>
}): Promise<{ ok: boolean; profile: ProfileDetail }> {
  return stateFetch('/profiles/update', jsonRequest(body))
}

export function remoteDeleteProfile(name: string): Promise<{ ok: boolean }> {
  return stateFetch('/profiles/delete', jsonRequest({ name }))
}

export function remoteRenameProfile(body: {
  oldName?: string
  newName?: string
}): Promise<{ ok: boolean; profile: ProfileDetail }> {
  return stateFetch('/profiles/rename', jsonRequest(body))
}

export function remoteListMemoryFiles(): Promise<{ files: Array<MemoryFileMeta> }> {
  return stateFetch('/memory/list')
}

export function remoteReadMemoryFile(path: string): Promise<{
  path: string
  content: string
}> {
  return stateFetch(`/memory/read?path=${encodeURIComponent(path)}`)
}

export function remoteSearchMemoryFiles(q: string): Promise<{
  results: Array<MemorySearchMatch>
}> {
  return stateFetch(`/memory/search?q=${encodeURIComponent(q)}`)
}

export function remoteWriteMemoryFile(body: {
  path?: unknown
  content?: unknown
}): Promise<{ success: boolean; path: string }> {
  return stateFetch('/memory/write', jsonRequest(body))
}

export type WorkspaceFileEntry = {
  name: string
  path: string
  type: 'file' | 'folder'
  size?: number
  modifiedAt?: string
  children?: Array<WorkspaceFileEntry>
}

export function remoteListWorkspaceFiles(params: {
  path?: string
  maxDepth?: number | null
  maxEntries?: number | null
} = {}): Promise<{
  root: string
  base: string
  entries: Array<WorkspaceFileEntry>
}> {
  const query = new URLSearchParams({ action: 'list' })
  if (params.path) query.set('path', params.path)
  if (params.maxDepth !== null && params.maxDepth !== undefined) {
    query.set('maxDepth', String(params.maxDepth))
  }
  if (params.maxEntries !== null && params.maxEntries !== undefined) {
    query.set('maxEntries', String(params.maxEntries))
  }
  return stateFetch(`/files?${query.toString()}`)
}

export function remoteReadWorkspaceFile(path: string): Promise<{
  type: 'text' | 'image'
  path: string
  content: string
}> {
  const query = new URLSearchParams({ action: 'read', path })
  return stateFetch(`/files?${query.toString()}`)
}

export function remoteDownloadWorkspaceFile(path: string): Promise<Response> {
  const query = new URLSearchParams({ action: 'download', path })
  return stateFetchRaw(`/files?${query.toString()}`)
}

export function remoteWriteWorkspaceFile(body: Record<string, unknown>): Promise<{
  ok: boolean
  path?: string
}> {
  return stateFetch('/files', jsonRequest(body))
}

export function statusFromBridgeError(error: unknown, fallback = 500): number {
  return error instanceof WorkspaceStateBridgeError ? error.status : fallback
}

export function messageFromBridgeError(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}
