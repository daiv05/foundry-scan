import type { Opportunity, Scan, ScanConfig, SettingsStatus } from './types'

// ── Base URL helpers ──────────────────────────────────────────────────────────

/** Server-side: call backend directly via Docker service name. */
function serverBase(): string {
  return process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:7120'
}

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: 'no-store', ...options })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.detail?.message ?? body?.detail ?? `${res.status} ${res.statusText}`)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

// ── Server-side helpers (call from Server Components) ─────────────────────────

export async function ssrGetScans(params?: { perPage?: number; archived?: boolean }): Promise<Scan[]> {
  const base = serverBase()
  const qs = new URLSearchParams()
  qs.set('per_page', String(params?.perPage ?? 20))
  if (params?.archived !== undefined) qs.set('archived', String(params.archived))
  return apiFetch<Scan[]>(`${base}/api/scans?${qs}`)
}

export async function ssrGetScan(id: string): Promise<Scan> {
  const base = serverBase()
  return apiFetch<Scan>(`${base}/api/scans/${id}`)
}

export async function ssrGetOpportunities(params?: {
  scanId?: string
  perPage?: number
  sort?: string
}): Promise<Opportunity[]> {
  const base = serverBase()
  const qs = new URLSearchParams()
  qs.set('per_page', String(params?.perPage ?? 50))
  qs.set('sort', params?.sort ?? '-score')
  if (params?.scanId) qs.set('filter', `scan="${params.scanId}"`)
  return apiFetch<Opportunity[]>(`${base}/api/opportunities?${qs}`)
}

export async function ssrGetOpportunity(id: string): Promise<Opportunity> {
  const base = serverBase()
  return apiFetch<Opportunity>(`${base}/api/opportunities/${id}`)
}

// ── Client-side helpers (call from Client Components via /api rewrite) ─────────

export const api = {
  async getScans(params?: { archived?: boolean; perPage?: number }): Promise<Scan[]> {
    const qs = new URLSearchParams()
    qs.set('per_page', String(params?.perPage ?? 20))
    if (params?.archived !== undefined) qs.set('archived', String(params.archived))
    return apiFetch<Scan[]>(`/api/scans?${qs}`)
  },

  async getScan(id: string): Promise<Scan> {
    return apiFetch<Scan>(`/api/scans/${id}`)
  },

  async createScan(config: Record<string, unknown>): Promise<Scan> {
    return apiFetch<Scan>('/api/scans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config }),
    })
  },

  async archiveScan(id: string, archived: boolean): Promise<Scan> {
    return apiFetch<Scan>(`/api/scans/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived }),
    })
  },

  async deleteScan(id: string): Promise<void> {
    await apiFetch<void>(`/api/scans/${id}`, { method: 'DELETE' })
  },

  async submitResponse(scanId: string, responseText: string, llmUsed?: string) {
    return apiFetch<{ id: string; status: string; count: number; warnings: string[] }>(
      `/api/scans/${scanId}/response`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response_text: responseText, llm_used: llmUsed ?? '' }),
      },
    )
  },

  async retryParse(scanId: string) {
    return apiFetch<{ id: string; status: string; count: number; warnings: string[] }>(
      `/api/scans/${scanId}/response/retry`,
      { method: 'POST' },
    )
  },

  async getOpportunities(params?: {
    scanId?: string
    perPage?: number
    page?: number
    sort?: string
    userStatus?: string
    minScore?: number
  }): Promise<Opportunity[]> {
    const qs = new URLSearchParams()
    qs.set('per_page', String(params?.perPage ?? 50))
    qs.set('page', String(params?.page ?? 1))
    qs.set('sort', params?.sort ?? '-score')
    const filters: string[] = []
    if (params?.scanId) filters.push(`scan="${params.scanId}"`)
    if (params?.userStatus) filters.push(`user_status="${params.userStatus}"`)
    if (params?.minScore && params.minScore > 0) filters.push(`score>=${params.minScore}`)
    if (filters.length) qs.set('filter', filters.join('&&'))
    return apiFetch<Opportunity[]>(`/api/opportunities?${qs}`)
  },

  async getOpportunity(id: string): Promise<Opportunity> {
    return apiFetch<Opportunity>(`/api/opportunities/${id}`)
  },

  async updateOpportunity(id: string, data: { user_status?: string; notes?: string }) {
    return apiFetch<Opportunity>(`/api/opportunities/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  },

  // ── Settings ────────────────────────────────────────────────────────────────

  async getSettingsStatus(): Promise<SettingsStatus> {
    return apiFetch<SettingsStatus>('/api/settings/status')
  },

  // ── Scan Configs ─────────────────────────────────────────────────────────────

  async getConfigs(): Promise<ScanConfig[]> {
    return apiFetch<ScanConfig[]>('/api/configs')
  },

  async createConfig(data: { name: string; config: Record<string, unknown>; is_default?: boolean }): Promise<ScanConfig> {
    return apiFetch<ScanConfig>('/api/configs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  },

  async updateConfig(id: string, data: { name: string; config: Record<string, unknown>; is_default?: boolean }): Promise<ScanConfig> {
    return apiFetch<ScanConfig>(`/api/configs/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  },

  async deleteConfig(id: string): Promise<void> {
    await apiFetch<void>(`/api/configs/${id}`, { method: 'DELETE' })
  },
}
