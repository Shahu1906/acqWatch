/**
 * AcqWatch API Client
 * All backend communication goes through this module.
 * Use VITE_API_BASE_URL for base URL configuration.
 * Never hardcode the production API URL in component code.
 */

import type {
  HealthResponse,
  MetadataResponse,
  OverviewResponse,
  ProjectListResponse,
  ProjectDetail,
  MapResponse,
  PredictionResponse,
  ExplanationResponse,
  GlobalExplanationResponse,
  FiltersResponse,
  ModelStatusResponse,
  AdHocPredictRequest,
  AdHocPredictResponse,
  FilterState,
  // Legacy types still used by existing components
  RisksSummaryResponse,
  GeoProjectItem,
  User,
  AuthResponse,
  Intervention,
  AuditLogListResponse,
  SimulationRequest,
  CustomProjectSimulationRequest,
  SimulationResponse,
  StatutoryAssessmentResponse,
  NoticeDraftResponse,
  SurvivalResponse,
  SampleCorridorItem,
  CorridorAnalysisResponse,
  GraphNetworkResponse,
  CascadeResponse,
} from './types';

// ── Base URL ─────────────────────────────────────────────────────────────────
// In development: Vite proxies /api/* to VITE_API_BASE_URL
// In production: set VITE_API_BASE_URL to the full backend URL
const API_BASE = import.meta.env.VITE_API_BASE_URL
  ? import.meta.env.VITE_API_BASE_URL
  : ''; // empty = same-origin (Vite dev proxy)

const MOCK_MODE = import.meta.env.VITE_MOCK_MODE === 'true';

// ── Auth session helpers (legacy) ─────────────────────────────────────────────
const TOKEN_KEY = 'sih26017_token';
const USER_KEY = 'sih26017_user';

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): User | null {
  const data = localStorage.getItem(USER_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function saveAuthSession(token: string, user: User) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function authHeaders(): Record<string, string> {
  const token = getAuthToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

// ── Core fetch wrapper ────────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  options?: RequestInit,
  signal?: AbortSignal,
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, { ...options, signal });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
    const err = new Error(body.detail || `Request failed: ${res.status}`);
    (err as any).status = res.status;
    throw err;
  }
  return res.json() as Promise<T>;
}

// ── AcqWatch backend endpoints ────────────────────────────────────────────────

/** GET /api/health */
export async function fetchHealth(signal?: AbortSignal): Promise<HealthResponse> {
  return apiFetch<HealthResponse>('/api/health', {}, signal);
}

/** GET /api/metadata */
export async function fetchMetadata(signal?: AbortSignal): Promise<MetadataResponse> {
  return apiFetch<MetadataResponse>('/api/metadata', {}, signal);
}

/** GET /api/overview */
export async function fetchOverview(
  filters?: { state?: string; sector?: string; risk_category?: string; agency?: string },
  signal?: AbortSignal,
): Promise<OverviewResponse> {
  const params = new URLSearchParams();
  if (filters?.state) params.set('state', filters.state);
  if (filters?.sector) params.set('sector', filters.sector);
  if (filters?.risk_category) params.set('risk_category', filters.risk_category);
  if (filters?.agency) params.set('agency', filters.agency);
  const qs = params.toString();
  return apiFetch<OverviewResponse>(`/api/overview${qs ? `?${qs}` : ''}`, {}, signal);
}

/** GET /api/projects */
export async function fetchProjects(
  filters: Partial<FilterState>,
  signal?: AbortSignal,
): Promise<ProjectListResponse> {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.state) params.set('state', filters.state);
  if (filters.sector) params.set('sector', filters.sector);
  if (filters.agency) params.set('agency', filters.agency);
  if (filters.risk_category) params.set('risk_category', filters.risk_category);
  if (filters.sort_by) params.set('sort_by', filters.sort_by);
  if (filters.sort_order) params.set('sort_order', filters.sort_order);
  params.set('page', String(filters.page ?? 1));
  params.set('page_size', String(filters.page_size ?? 50));
  return apiFetch<ProjectListResponse>(`/api/projects?${params.toString()}`, {}, signal);
}

/** GET /api/projects/export */
export function buildExportUrl(filters: Partial<FilterState>): string {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.state) params.set('state', filters.state);
  if (filters.sector) params.set('sector', filters.sector);
  if (filters.agency) params.set('agency', filters.agency);
  if (filters.risk_category) params.set('risk_category', filters.risk_category);
  return `${API_BASE}/api/projects/export?${params.toString()}`;
}

/** GET /api/projects/{id} */
export async function fetchProjectDetail(
  projectId: string,
  signal?: AbortSignal,
): Promise<ProjectDetail> {
  return apiFetch<ProjectDetail>(
    `/api/projects/${encodeURIComponent(projectId)}`,
    {},
    signal,
  );
}

/** GET /api/map/projects */
export async function fetchMapProjects(
  filters?: { state?: string; sector?: string; risk_category?: string },
  signal?: AbortSignal,
): Promise<MapResponse> {
  const params = new URLSearchParams();
  if (filters?.state) params.set('state', filters.state);
  if (filters?.sector) params.set('sector', filters.sector);
  if (filters?.risk_category) params.set('risk_category', filters.risk_category);
  const qs = params.toString();
  return apiFetch<MapResponse>(`/api/map/projects${qs ? `?${qs}` : ''}`, {}, signal);
}

/** GET /api/projects/{id}/prediction */
export async function fetchProjectPrediction(
  projectId: string,
  signal?: AbortSignal,
): Promise<PredictionResponse> {
  return apiFetch<PredictionResponse>(
    `/api/projects/${encodeURIComponent(projectId)}/prediction`,
    {},
    signal,
  );
}

/** POST /api/predict — Run ad-hoc model inference on custom/example project inputs */
export async function predictAdHoc(
  payload: AdHocPredictRequest,
  signal?: AbortSignal,
): Promise<AdHocPredictResponse> {
  return apiFetch<AdHocPredictResponse>(
    '/api/predict',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    signal,
  );
}

/** GET /api/projects/{id}/explanation */
export async function fetchProjectExplanation(
  projectId: string,
  signal?: AbortSignal,
): Promise<ExplanationResponse> {
  return apiFetch<ExplanationResponse>(
    `/api/projects/${encodeURIComponent(projectId)}/explanation`,
    {},
    signal,
  );
}

/** GET /api/model/explanation */
export async function fetchModelExplanation(
  signal?: AbortSignal,
): Promise<GlobalExplanationResponse> {
  return apiFetch<GlobalExplanationResponse>('/api/model/explanation', {}, signal);
}

/** GET /api/filters */
export async function fetchFilters(signal?: AbortSignal): Promise<FiltersResponse> {
  return apiFetch<FiltersResponse>('/api/filters', {}, signal);
}

/** GET /api/model/status */
export async function fetchModelStatus(signal?: AbortSignal): Promise<ModelStatusResponse> {
  return apiFetch<ModelStatusResponse>('/api/model/status', {}, signal);
}

// ── Legacy API functions (for existing components) ────────────────────────────

export async function loginUser(username: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Authentication failed' }));
    throw new Error(err.detail || 'Authentication failed');
  }
  const data: AuthResponse = await res.json();
  saveAuthSession(data.access_token, data.user);
  return data;
}

export async function fetchCurrentUser(): Promise<User> {
  return apiFetch<User>('/api/auth/me', { headers: authHeaders() });
}

export async function fetchRisksSummary(): Promise<RisksSummaryResponse> {
  return apiFetch<RisksSummaryResponse>('/api/risks');
}

export async function fetchProjectDetail_legacy(projectCode: string): Promise<ProjectDetail> {
  return fetchProjectDetail(projectCode);
}

export async function fetchProjectExplanation_legacy(projectCode: string): Promise<any> {
  return fetchProjectExplanation(projectCode);
}

/** GET /api/geo/projects — legacy map endpoint for existing GISMap component */
export async function fetchGeoProjects(): Promise<GeoProjectItem[]> {
  // Try new map endpoint first, fall back to legacy geo endpoint
  try {
    const mapData = await fetchMapProjects();
    return mapData.features
      .filter(f => f.geometry.coordinates[1] != null && f.geometry.coordinates[0] != null)
      .map(f => ({
        project_code: f.properties.project_code,
        project_name: f.properties.project_name,
        sector: f.properties.sector,
        agency: f.properties.agency,
        state: f.properties.state,
        orig_cost_cr: f.properties.orig_cost_cr ?? 0,
        delay_months: f.properties.delay_months ?? 0,
        risk_score: f.properties.risk_score ?? 0,
        risk_category: (f.properties.risk_category ?? 'LOW') as any,
        badge_color: f.properties.badge_color ?? '#64748b',
        latitude: f.geometry.coordinates[1],
        longitude: f.geometry.coordinates[0],
        geo_precision: f.properties.geo_precision,
      }));
  } catch {
    return apiFetch<GeoProjectItem[]>('/api/geo/projects');
  }
}

export async function fetchProjectInterventions(projectCode: string): Promise<Intervention[]> {
  return apiFetch<Intervention[]>(
    `/api/projects/${encodeURIComponent(projectCode)}/interventions`,
  );
}

export async function createIntervention(
  projectCode: string,
  interventionType: string,
  notes: string,
): Promise<Intervention> {
  return apiFetch<Intervention>('/api/interventions', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ project_code: projectCode, intervention_type: interventionType, notes }),
  });
}

export async function fetchAuditLogs(limit: number = 50): Promise<AuditLogListResponse> {
  return apiFetch<AuditLogListResponse>(`/api/audit-logs?limit=${limit}`, {
    headers: authHeaders(),
  });
}

export async function simulateProject(
  projectCode: string,
  levers: SimulationRequest,
): Promise<SimulationResponse> {
  return apiFetch<SimulationResponse>(
    `/api/projects/${encodeURIComponent(projectCode)}/simulate`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(levers) },
  );
}

export async function simulateCustomProject(
  request: CustomProjectSimulationRequest,
): Promise<SimulationResponse> {
  return apiFetch<SimulationResponse>('/api/simulation/custom', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
}

export async function fetchStatutoryAssessment(
  projectCode: string,
): Promise<StatutoryAssessmentResponse> {
  return apiFetch<StatutoryAssessmentResponse>(
    `/api/projects/${encodeURIComponent(projectCode)}/statutory`,
  );
}

export async function generateStatutoryNotice(
  projectCode: string,
  recipientTitle: string,
  customInstructions: string,
): Promise<NoticeDraftResponse> {
  return apiFetch<NoticeDraftResponse>(
    `/api/projects/${encodeURIComponent(projectCode)}/statutory/notice`,
    {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ recipient_title: recipientTitle, custom_instructions: customInstructions }),
    },
  );
}

export async function fetchProjectSurvival(projectCode: string): Promise<SurvivalResponse> {
  return apiFetch<SurvivalResponse>(
    `/api/projects/${encodeURIComponent(projectCode)}/survival`,
  );
}

export async function fetchSampleCorridors(): Promise<SampleCorridorItem[]> {
  return apiFetch<SampleCorridorItem[]>('/api/geo/corridors/sample');
}

export async function analyzeCorridorRoute(
  coordinates: [number, number][],
  sector: string,
  state: string,
  name: string,
): Promise<CorridorAnalysisResponse> {
  return apiFetch<CorridorAnalysisResponse>('/api/geo/corridors/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ coordinates, sector, state, name }),
  });
}

export async function fetchContagionNetwork(): Promise<GraphNetworkResponse> {
  return apiFetch<GraphNetworkResponse>('/api/graph/network');
}

export async function simulateContagionCascade(
  epicenterProjectCode: string,
  delayShockMonths: number = 18,
): Promise<CascadeResponse> {
  return apiFetch<CascadeResponse>('/api/graph/cascade', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ epicenter_project_code: epicenterProjectCode, delay_shock_months: delayShockMonths }),
  });
}

export { MOCK_MODE };
