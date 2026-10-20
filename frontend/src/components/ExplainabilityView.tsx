import React, { useEffect, useState, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  BrainCircuit,
  Search,
  Info,
} from 'lucide-react';
import { fetchModelExplanation, fetchProjectExplanation, fetchProjects } from '../api';
import type {
  GlobalExplanationResponse,
  ExplanationResponse,
  ProjectSummary,
} from '../types';
import {
  Spinner,
  UnavailableState,
  ModelDisclaimer,
  ConnectionError,
  RiskBadge,
  Skeleton,
} from './ui';

export const ExplainabilityView: React.FC = () => {
  const [globalExpl, setGlobalExpl] = useState<GlobalExplanationResponse | null>(null);
  const [globalLoading, setGlobalLoading] = useState(true);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const [projectSearch, setProjectSearch] = useState('');
  const [searchResults, setSearchResults] = useState<ProjectSummary[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectSummary | null>(null);
  const [projectExpl, setProjectExpl] = useState<ExplanationResponse | null>(null);
  const [projectExplLoading, setProjectExplLoading] = useState(false);

  // Load global explanation
  const loadGlobal = useCallback(async () => {
    setGlobalLoading(true);
    setGlobalError(null);
    try {
      const data = await fetchModelExplanation();
      setGlobalExpl(data);
    } catch (err: any) {
      setGlobalError(err.message || 'Failed to load global explanation');
    } finally {
      setGlobalLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGlobal();
  }, [loadGlobal]);

  // Search projects debounced
  useEffect(() => {
    if (!projectSearch.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetchProjects({ search: projectSearch, page: 1, page_size: 8, sort_by: 'risk_score', sort_order: 'desc' });
        setSearchResults(res.items);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [projectSearch]);

  // Load per-project explanation
  const selectProject = useCallback(async (project: ProjectSummary) => {
    setSelectedProject(project);
    setProjectExpl(null);
    setProjectExplLoading(true);
    setSearchResults([]);
    setProjectSearch('');
    try {
      const e = await fetchProjectExplanation(project.project_code);
      setProjectExpl(e);
    } catch (err: any) {
      setProjectExpl({
        project_code: project.project_code,
        available: false,
        top_risk_drivers: [],
        top_mitigating_factors: [],
        base_log_odds: null,
        disclaimer: null,
        unavailable_reason: err.message || 'Failed to load explanation',
      });
    } finally {
      setProjectExplLoading(false);
    }
  }, []);

  // Prepare global chart data
  const globalChartData = globalExpl?.feature_importances
    .slice()
    .sort((a, b) => b.mean_abs_shap - a.mean_abs_shap)
    .slice(0, 12)
    .map((f) => ({
      name: f.feature.replace(/_/g, ' '),
      value: Number(f.mean_abs_shap.toFixed(4)),
    })) ?? [];

  return (
    <div className="view-enter max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <BrainCircuit className="w-5 h-5 text-blue-600" />
          <h1 className="text-xl font-semibold text-slate-900">Explainability Workspace</h1>
        </div>
        <p className="text-sm text-slate-500 max-w-2xl">
          Understand how the Gradient Boosting model arrives at its risk classifications.
          Global feature importances show which factors matter most across all projects;
          per-project SHAP values show contributions for individual records.
        </p>
      </div>

      <ModelDisclaimer text="SHAP values show statistical associations between features and model output. They are not causal explanations and not legal determinations. A low-risk score does not guarantee a project will complete without delay." />

      {/* ── Global Feature Importance ─────────────────────────────────── */}
      <section className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Global Feature Importance
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Mean absolute SHAP values across all projects.{' '}
              {globalExpl?.model_id && (
                <span className="text-slate-400">Model: {globalExpl.model_id}</span>
              )}
            </p>
          </div>
        </div>

        {globalLoading && <Skeleton height={280} />}
        {globalError && <ConnectionError message={globalError} onRetry={loadGlobal} compact />}

        {!globalLoading && globalExpl && !globalExpl.available && (
          <UnavailableState
            title="Global explanations unavailable"
            reason={globalExpl.unavailable_reason ?? undefined}
          />
        )}

        {!globalLoading && globalExpl?.available && globalChartData.length > 0 && (
          <>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                data={globalChartData}
                layout="vertical"
                margin={{ left: 4, right: 20, top: 4, bottom: 4 }}
              >
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  width={160}
                />
                <Tooltip
                  cursor={{ fill: '#f1f5f9' }}
                  formatter={(value: unknown) => [(value as number).toFixed(4), 'Mean |SHAP|']}
                  contentStyle={{
                    fontSize: 11,
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    boxShadow: '0 4px 6px rgba(0,0,0,0.07)',
                  }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={14}>
                  {globalChartData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={`hsl(${215 - i * 8}, ${70 - i * 2}%, ${48 + i * 2}%)`}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="text-[10px] text-slate-400 mt-3">{globalExpl.note}</p>
          </>
        )}
      </section>

      {/* ── Per-Project SHAP ──────────────────────────────────────────── */}
      <section className="card p-6">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-slate-900 mb-1">
            Per-Project Feature Contribution
          </h2>
          <p className="text-xs text-slate-500">
            Search for a specific project to see its SHAP feature contributions.
          </p>
        </div>

        {/* Project search */}
        <div className="relative max-w-md mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={projectSearch}
            onChange={(e) => setProjectSearch(e.target.value)}
            placeholder="Search project name or code…"
            className="input-base pl-10 text-sm"
            aria-label="Search project for explanation"
          />
          {searchLoading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Spinner size="sm" />
            </div>
          )}

          {/* Dropdown results */}
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 overflow-hidden">
              {searchResults.map((p) => (
                <button
                  key={p.project_code}
                  onClick={() => selectProject(p)}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-800 truncate">
                      {p.project_name}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {p.project_code} · {p.state}
                    </div>
                  </div>
                  <RiskBadge category={p.risk_category} score={p.risk_score ?? undefined} size="sm" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected project explanation */}
        {selectedProject && (
          <div>
            <div className="flex items-center justify-between mb-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-800 truncate">
                  {selectedProject.project_name}
                </div>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                  {selectedProject.project_code}
                </div>
              </div>
              <RiskBadge
                category={selectedProject.risk_category}
                score={selectedProject.risk_score ?? undefined}
                size="md"
              />
            </div>

            {projectExplLoading ? (
              <div className="flex items-center justify-center py-12">
                <Spinner size="lg" />
              </div>
            ) : projectExpl ? (
              <ProjectExplanationDisplay expl={projectExpl} />
            ) : null}
          </div>
        )}

        {!selectedProject && (
          <div className="flex items-center gap-2 text-xs text-slate-400 py-4">
            <Info className="w-4 h-4" />
            Search and select a project above to view its SHAP explanation.
          </div>
        )}
      </section>
    </div>
  );
};

// ── Per-project display ───────────────────────────────────────────────────────

const ProjectExplanationDisplay: React.FC<{ expl: ExplanationResponse }> = ({ expl }) => {
  if (!expl.available) {
    return (
      <UnavailableState
        title="Explanation unavailable"
        reason={expl.unavailable_reason ?? undefined}
      />
    );
  }

  const allDrivers = [
    ...expl.top_risk_drivers.map((d) => ({ ...d, isRisk: true })),
    ...expl.top_mitigating_factors.map((d) => ({ ...d, isRisk: false })),
  ].sort((a, b) => Math.abs(b.shap_value) - Math.abs(a.shap_value));

  // Chart data
  const chartData = allDrivers.map((d) => ({
    name: d.feature.replace(/_/g, ' '),
    value: d.shap_value,
    isRisk: d.isRisk,
  }));

  return (
    <div className="space-y-5">
      {expl.disclaimer && (
        <ModelDisclaimer text={expl.disclaimer} />
      )}

      {/* Waterfall-style chart */}
      <div>
        <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3">
          Feature Contributions (SHAP values)
        </h3>
        <ResponsiveContainer width="100%" height={Math.max(200, allDrivers.length * 32)}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ left: 4, right: 40, top: 4, bottom: 4 }}
          >
            <XAxis
              type="number"
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 10, fill: '#64748b' }}
              axisLine={false}
              tickLine={false}
              width={150}
            />
            <Tooltip
              cursor={{ fill: '#f1f5f9' }}
              formatter={(value: unknown) => [(value as number).toFixed(4), 'SHAP contribution']}
              contentStyle={{
                fontSize: 11,
                border: '1px solid #e2e8f0',
                borderRadius: 8,
              }}
            />
            <Bar dataKey="value" radius={4} barSize={18}>
              {chartData.map((d, i) => (
                <Cell key={i} fill={d.isRisk ? '#dc2626' : '#16a34a'} fillOpacity={0.75} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Narrative explanations */}
      {allDrivers.length > 0 && (
        <div className="space-y-2">
          {allDrivers.map((d) => (
            <div key={d.feature} className="flex items-start gap-2 text-xs">
              <div
                className="w-1.5 h-1.5 rounded-full mt-1 shrink-0"
                style={{ backgroundColor: d.isRisk ? '#dc2626' : '#16a34a' }}
              />
              <div>
                <span className="font-semibold text-slate-700">{d.feature}: </span>
                <span className="text-slate-500">{d.explanation}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {expl.base_log_odds != null && (
        <div className="text-[10px] text-slate-400 border-t border-slate-100 pt-3">
          Base log-odds: {expl.base_log_odds.toFixed(4)}
        </div>
      )}
    </div>
  );
};

export default ExplainabilityView;
