/**
 * AcqWatch TypeScript Types
 * Matches the AcqWatch FastAPI backend schema contract exactly.
 * Old SIH26017 types are preserved for backward compat with existing components.
 */

// ── Shared ───────────────────────────────────────────────────────────────────

export type RiskCategory = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ApiError {
  detail: string;
  status?: number;
}

// ── AcqWatch Backend: Health ──────────────────────────────────────────────────

export interface HealthResponse {
  status: 'ok' | 'degraded' | 'error';
  dataset_available: boolean;
  dataset_project_count: number | null;
  model_status: 'ready' | 'unavailable';
  model_id: string | null;
  timestamp_utc: string;
}

// ── AcqWatch Backend: Metadata ────────────────────────────────────────────────

export interface MetadataResponse {
  total_projects: number;
  risk_categories: string[];
  sectors: string[];
  states: string[];
  agencies: string[];
  filter_fields: string[];
  geo_precision: string;
  dataset_source: string;
  dataset_last_loaded: string | null;
  model_id: string | null;
  model_available: boolean;
}

// ── AcqWatch Backend: Overview ────────────────────────────────────────────────

export interface OverviewResponse {
  total_projects_in_inventory: number;
  matching_projects: number;
  filters_applied: boolean;
  delayed_count: number;
  on_time_count: number;
  delay_rate_pct: number;
  counts_by_risk_category: Record<string, number>;
  percentages_by_risk_category: Record<string, number>;
  sector_distribution: Record<string, number>;
  state_distribution: Record<string, number>;
  cost_stats: Record<string, number>;
  predictions_available: boolean;
  dataset_last_loaded: string | null;
}

// ── AcqWatch Backend: Projects ────────────────────────────────────────────────

export interface ProjectSummary {
  project_code: string;
  project_name: string;
  sector: string;
  agency: string;
  state: string;
  orig_cost_cr: number | null;
  approval_date: string | null;
  orig_commissioning_date: string | null;
  ant_commissioning_date: string | null;
  delay_months: number | null;
  is_delayed: number | null;
  risk_score: number | null;
  risk_category: string | null;
  badge_color: string | null;
}

export interface ProjectListResponse {
  items: ProjectSummary[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface ProjectDetail {
  project_code: string;
  project_name: string;
  sector: string;
  agency: string;
  state: string;
  approval_date: string | null;
  orig_commissioning_date: string | null;
  rev_commissioning_date: string | null;
  ant_commissioning_date: string | null;
  orig_cost_cr: number | null;
  rev_cost_cr: number | null;
  ant_cost_cr: number | null;
  cumulative_exp_cr: number | null;
  physical_progress_pct: number | null;
  delay_months: number | null;
  is_delayed: number | null;
  cost_overrun_pct: number | null;
  expenditure_ratio: number | null;
  source_dataset: string | null;
  risk_score: number | null;
  risk_category: string | null;
  badge_color: string | null;
  risk_probability: number | null;
  latitude: number | null;
  longitude: number | null;
  geo_precision: string | null;
  prediction_available: boolean;
  prediction_source: string | null;
}

// ── AcqWatch Backend: Map ─────────────────────────────────────────────────────

export interface MapFeatureProperties {
  project_code: string;
  project_name: string;
  sector: string;
  agency: string;
  state: string;
  orig_cost_cr: number | null;
  delay_months: number | null;
  risk_score: number | null;
  risk_category: string | null;
  badge_color: string | null;
  geo_precision: string;
  is_delayed: number | null;
}

export interface MapFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  properties: MapFeatureProperties;
}

export interface MapResponse {
  type: 'FeatureCollection';
  features: MapFeature[];
  total_features: number;
  geo_precision_note: string;
}

// ── AcqWatch Backend: Prediction ──────────────────────────────────────────────

export interface PredictionResponse {
  project_code: string;
  available: boolean;
  probability: number | null;
  risk_score: number | null;
  risk_category: string | null;
  badge_color: string | null;
  badge_label: string | null;
  description: string | null;
  model_id: string | null;
  prediction_source: string | null;
  unavailable_reason: string | null;
}

// ── AcqWatch Backend: Explanation ─────────────────────────────────────────────

export interface RiskDriverItem {
  feature: string;
  shap_value: number;
  direction: 'ELEVATES_RISK' | 'MITIGATES_RISK';
  explanation: string;
}

export interface ExplanationResponse {
  project_code: string;
  available: boolean;
  top_risk_drivers: RiskDriverItem[];
  top_mitigating_factors: RiskDriverItem[];
  base_log_odds: number | null;
  disclaimer: string | null;
  unavailable_reason: string | null;
}

export interface GlobalImportanceItem {
  feature: string;
  mean_abs_shap: number;
}

export interface GlobalExplanationResponse {
  available: boolean;
  model_id: string | null;
  feature_importances: GlobalImportanceItem[];
  note: string;
  unavailable_reason: string | null;
}

// ── AcqWatch Backend: Filters ─────────────────────────────────────────────────

export interface FiltersResponse {
  states: string[];
  sectors: string[];
  agencies: string[];
  risk_categories: string[];
  sort_fields: string[];
}

// ── AcqWatch Backend: Model Status ────────────────────────────────────────────

export interface ModelStatusResponse {
  available: boolean;
  model_id: string | null;
  model_type: string | null;
  framework: string | null;
  artifact_path: string | null;
  feature_count: number | null;
  feature_names: string[] | null;
  hyperparameters: Record<string, unknown> | null;
  risk_bands: Record<string, string> | null;
  input_schema: Record<string, unknown> | null;
  explainability: string | null;
  unavailable_reason: string | null;
}

export interface AdHocPredictRequest {
  sector: string;
  agency: string;
  state: string;
  orig_cost_cr: number;
  approval_date?: string;
  orig_commissioning_date?: string;
  planned_duration_months?: number;
  approval_year?: number;
  approval_month?: number;
}

export interface AdHocPredictResponse {
  available: boolean;
  probability: number | null;
  risk_score: number | null;
  risk_category: string | null;
  badge_color: string | null;
  badge_label: string | null;
  description: string | null;
  model_id: string | null;
  prediction_source: string;
  disclaimer: string;
  unavailable_reason: string | null;
}

// ── UI State ──────────────────────────────────────────────────────────────────

export type AppView = 'overview' | 'explorer' | 'map' | 'simulator' | 'explainability' | 'model';

export interface FilterState {
  search: string;
  state: string;
  sector: string;
  agency: string;
  risk_category: string;
  sort_by: string;
  sort_order: 'asc' | 'desc';
  page: number;
  page_size: number;
}

// ── Backward-compatible types for existing components ─────────────────────────

export interface GeoProjectItem {
  project_code: string;
  project_name: string;
  sector: string;
  agency: string;
  state: string;
  orig_cost_cr: number;
  delay_months: number;
  risk_score: number;
  risk_category: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  badge_color: string;
  latitude: number;
  longitude: number;
  geo_precision: string;
}

export interface User {
  username: string;
  name: string;
  role: 'Admin' | 'Viewer';
  department: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Intervention {
  id: number;
  project_code: string;
  username: string;
  role: string;
  intervention_type: string;
  notes: string;
  timestamp: string;
}

export interface AuditLogItem {
  id: number;
  timestamp: string;
  username: string;
  role: string;
  action: string;
  project_code?: string | null;
  details: string;
}

export interface AuditLogListResponse {
  total: number;
  items: AuditLogItem[];
}

// Legacy risks summary (used by existing dashboard components)
export interface RisksSummaryResponse {
  total_projects: number;
  delayed_projects_count: number;
  ontime_projects_count: number;
  overall_delay_rate_pct: number;
  counts_by_risk_category: {
    LOW: number;
    MEDIUM: number;
    HIGH: number;
    CRITICAL: number;
  };
  percentages_by_risk_category: {
    LOW: number;
    MEDIUM: number;
    HIGH: number;
    CRITICAL: number;
  };
  priority_queue: ProjectSummary[];
}

// ── Legacy simulation/corridor/contagion types (for existing components) ──────

export interface SimulationRequest {
  package_split_count: number;
  contingency_budget_pct: number;
  dedicated_slao_taskforce: boolean;
  parallel_statutory_hearings: boolean;
  row_pre_possession_pct: number;
  execution_buffer_months: number;
}

export interface CustomProjectSimulationRequest {
  sector: string;
  state: string;
  agency: string;
  orig_cost_cr: number;
  planned_duration_months: number;
  approval_year: number;
  simulation_levers: SimulationRequest;
}

export interface LeverContributionItem {
  lever: string;
  relative_impact_points: number;
  description: string;
}

export interface SimulationResponse {
  project_code: string;
  project_name: string;
  baseline: {
    risk_score: number;
    risk_category: RiskCategory;
    probability: number;
    badge_color: string;
    estimated_delay_months: number;
  };
  simulated: {
    risk_score: number;
    risk_category: RiskCategory;
    probability: number;
    badge_color: string;
    estimated_delay_months: number;
  };
  metrics: {
    risk_score_delta: number;
    percentage_reduction: number;
    months_overrun_avoided: number;
    capital_escalation_saved_cr: number;
  };
  lever_breakdown: LeverContributionItem[];
}

export interface StatutoryDirectiveItem {
  statutory_ref: string;
  title: string;
  directive: string;
  urgency: string;
}

export interface StatutoryAssessmentResponse {
  project_code: string;
  project_name: string;
  state: string;
  sector: string;
  current_statutory_stage: string;
  stage_description: string;
  lapsing_risk_level: RiskCategory;
  lapsing_risk_score: number;
  section_25_deadline_flag: boolean;
  urgency_clause_eligible: boolean;
  statutory_directives: StatutoryDirectiveItem[];
  multiplier_framework: string;
  evaluation_timestamp: string;
}

export interface NoticeDraftResponse {
  formatted_document: string;
  memo_number?: string;
  date?: string;
}

export interface HazardPointItem {
  month: number;
  survival_probability: number;
  delay_probability: number;
  cumulative_hazard: number;
  monthly_hazard_rate: number;
}

export interface PeakDangerWindowItem {
  window: string;
  peak_month: number;
  statutory_milestone: string;
  description: string;
}

export interface ProjectedDatesItem {
  original_target: string;
  expected_completion: string;
  confidence_range_80: string;
}

export interface SurvivalForecastItem {
  expected_overrun_months: number;
  confidence_interval_80_months: [number, number];
  confidence_interval_95_months: [number, number];
  projected_dates: ProjectedDatesItem;
}

export interface SurvivalResponse {
  weibull_parameters: {
    shape_k: number;
    scale_lambda_months: number;
  };
  hazard_curve: HazardPointItem[];
  peak_danger_window: PeakDangerWindowItem;
  forecasting: SurvivalForecastItem;
}

export interface SampleCorridorItem {
  id: string;
  name: string;
  sector: string;
  state: string;
  description: string;
  coordinates: [number, number][];
}

export interface CorridorSegmentItem {
  segment_index: number;
  start: [number, number];
  end: [number, number];
  length_km: number;
}

export interface CorridorEnvironmentalMetrics {
  forest_overlap_pct: number;
  forest_stretch_km: number;
  river_crossings_count: number;
  settlement_density_pct: number;
}

export interface CorridorVulnerabilityAssessment {
  score: number;
  tier: string;
  badge_color: string;
  summary: string;
}

export interface CorridorRecommendationItem {
  category: string;
  directive: string;
}

export interface CorridorAnalysisResponse {
  name: string;
  sector: string;
  state: string;
  total_distance_km: number;
  waypoints_count: number;
  coordinates: [number, number][];
  segments: CorridorSegmentItem[];
  environmental_metrics: CorridorEnvironmentalMetrics;
  vulnerability_assessment: CorridorVulnerabilityAssessment;
  corridor_recommendations: CorridorRecommendationItem[];
}

export interface GraphNodeItem {
  id: string;
  label: string;
  type: 'PROJECT' | 'AGENCY' | 'STATE';
  color: string;
  size: number;
  details: string;
  sector?: string;
  state?: string;
  agency?: string;
  risk_score?: number;
  orig_cost_cr?: number;
}

export interface GraphLinkItem {
  source: string;
  target: string;
  relationship: string;
  weight: number;
}

export interface GraphNetworkResponse {
  total_nodes: number;
  total_links: number;
  nodes: GraphNodeItem[];
  links: GraphLinkItem[];
}

export interface CascadedProjectItem {
  project_code: string;
  project_name: string;
  agency: string;
  sector: string;
  secondary_delay_months: number;
  contagion_pathway: string;
  estimated_cost_escalation_cr: number;
}

export interface CascadeSummaryItem {
  exposed_projects_count: number;
  total_secondary_delay_months: number;
  total_cascade_escalation_cr: number;
  ripple_severity: string;
}

export interface CascadeResponse {
  epicenter: {
    project_code: string;
    project_name: string;
    agency: string;
    state: string;
    orig_cost_cr: number;
    delay_shock_months: number;
  };
  cascade_summary: CascadeSummaryItem;
  cascaded_projects: CascadedProjectItem[];
}
