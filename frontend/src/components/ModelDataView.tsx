import React, { useEffect, useState, useCallback } from 'react';
import {
  Server,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Database,
  Cpu,
  Info,
  Code2,
} from 'lucide-react';
import { fetchModelStatus, fetchHealth, fetchMetadata } from '../api';
import type {
  ModelStatusResponse,
  HealthResponse,
  MetadataResponse,
} from '../types';
import {
  Skeleton,
  ConnectionError,
  UnavailableState,
  formatDate,
} from './ui';

export const ModelDataView: React.FC = () => {
  const [modelStatus, setModelStatus] = useState<ModelStatusResponse | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [metadata, setMetadata] = useState<MetadataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ms, h, m] = await Promise.all([
        fetchModelStatus().catch(() => null),
        fetchHealth().catch(() => null),
        fetchMetadata().catch(() => null),
      ]);
      setModelStatus(ms);
      setHealth(h);
      setMetadata(m);
    } catch (err: any) {
      setError(err.message || 'Failed to load model status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="view-enter max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Server className="w-5 h-5 text-slate-600" />
            <h1 className="text-xl font-semibold text-slate-900">Model & Data Health</h1>
          </div>
          <p className="text-sm text-slate-500 max-w-2xl">
            Technical transparency about the prediction model, dataset, and system status.
            All values are reported as-is from the backend — no metrics are fabricated.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="btn btn-secondary btn-sm"
          aria-label="Refresh model status"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin-slow' : ''}`} />
          Refresh
        </button>
      </div>

      {error && <ConnectionError message={error} onRetry={load} />}

      {/* ── System Health ─────────────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3">
          System Status
        </h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <StatusCard
            title="Backend"
            value={loading ? '…' : health?.status ?? 'unavailable'}
            ok={health?.status === 'ok'}
            sub={health?.timestamp_utc ? `At ${new Date(health.timestamp_utc).toLocaleTimeString()}` : undefined}
            loading={loading}
          />
          <StatusCard
            title="Model"
            value={loading ? '…' : health?.model_status === 'ready' ? 'Ready' : 'Unavailable'}
            ok={health?.model_status === 'ready'}
            sub={health?.model_id ?? undefined}
            loading={loading}
          />
          <StatusCard
            title="Dataset"
            value={loading ? '…' : health?.dataset_available ? 'Loaded' : 'Unavailable'}
            ok={health?.dataset_available}
            sub={health?.dataset_project_count != null ? `${health.dataset_project_count.toLocaleString()} records` : undefined}
            loading={loading}
          />
        </div>
      </section>

      {/* ── Model Details ─────────────────────────────────────────────── */}
      <section className="card p-6">
        <h2 className="text-base font-semibold text-slate-900 mb-4">Model Information</h2>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton height={14} width={120} />
                <Skeleton height={14} width={200} />
              </div>
            ))}
          </div>
        ) : !modelStatus ? (
          <p className="text-sm text-slate-400">Model status unavailable.</p>
        ) : !modelStatus.available ? (
          <UnavailableState
            title="Model not loaded"
            reason={modelStatus.unavailable_reason ?? undefined}
          />
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { label: 'Model ID', value: modelStatus.model_id },
              { label: 'Model Type', value: modelStatus.model_type },
              { label: 'Framework', value: modelStatus.framework },
              { label: 'Feature Count', value: modelStatus.feature_count?.toString() },
              { label: 'Explainability', value: modelStatus.explainability },
              {
                label: 'Artifact Path',
                value: modelStatus.artifact_path
                  ? '…/' + modelStatus.artifact_path.split(/[/\\]/).pop()
                  : null,
              },
            ].map(({ label, value }) => (
              <InfoRow key={label} label={label} value={value} />
            ))}
          </div>
        )}
      </section>

      {/* ── Risk Bands ────────────────────────────────────────────────── */}
      {modelStatus?.risk_bands && (
        <section className="card p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Risk Classification Bands</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(modelStatus.risk_bands).map(([key, value]) => (
              <div
                key={key}
                className="rounded-lg px-3 py-2.5 border text-center"
                style={{
                  backgroundColor:
                    key === 'CRITICAL'
                      ? '#fef2f2'
                      : key === 'HIGH'
                      ? '#fff7ed'
                      : key === 'MEDIUM'
                      ? '#fefce8'
                      : '#f0fdf4',
                  borderColor:
                    key === 'CRITICAL'
                      ? '#fecaca'
                      : key === 'HIGH'
                      ? '#fed7aa'
                      : key === 'MEDIUM'
                      ? '#fde68a'
                      : '#bbf7d0',
                }}
              >
                <div
                  className="text-xs font-bold"
                  style={{
                    color:
                      key === 'CRITICAL'
                        ? '#dc2626'
                        : key === 'HIGH'
                        ? '#ea580c'
                        : key === 'MEDIUM'
                        ? '#ca8a04'
                        : '#16a34a',
                  }}
                >
                  {key}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">{value}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Feature names ─────────────────────────────────────────────── */}
      {modelStatus?.feature_names && modelStatus.feature_names.length > 0 && (
        <section className="card p-6">
          <div className="flex items-center gap-2 mb-3">
            <Code2 className="w-4 h-4 text-slate-400" />
            <h2 className="text-base font-semibold text-slate-900">Model Input Features</h2>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {modelStatus.feature_names.map((f) => (
              <span
                key={f}
                className="px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-slate-100 text-slate-600 border border-slate-200"
              >
                {f}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* ── Hyperparameters ───────────────────────────────────────────── */}
      {modelStatus?.hyperparameters && Object.keys(modelStatus.hyperparameters).length > 0 && (
        <section className="card p-6">
          <div className="flex items-center gap-2 mb-3">
            <Cpu className="w-4 h-4 text-slate-400" />
            <h2 className="text-base font-semibold text-slate-900">Hyperparameters</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {Object.entries(modelStatus.hyperparameters).map(([key, val]) => (
              <div key={key} className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  {key.replace(/_/g, ' ')}
                </div>
                <div className="text-xs font-mono text-slate-700 mt-0.5">
                  {String(val)}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Dataset metadata ──────────────────────────────────────────── */}
      <section className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Database className="w-4 h-4 text-slate-400" />
          <h2 className="text-base font-semibold text-slate-900">Dataset Information</h2>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} height={14} />)}
          </div>
        ) : metadata ? (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <InfoRow label="Total Projects" value={metadata.total_projects?.toLocaleString()} />
              <InfoRow label="Dataset Source" value={metadata.dataset_source} />
              <InfoRow label="Last Loaded" value={formatDate(metadata.dataset_last_loaded)} />
              <InfoRow label="Geo Precision" value={metadata.geo_precision} />
            </div>

            {/* States covered */}
            <div>
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                States / UTs Covered ({metadata.states.length})
              </div>
              <div className="flex flex-wrap gap-1">
                {metadata.states.map((s) => (
                  <span
                    key={s}
                    className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {/* Sectors */}
            <div>
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Sectors ({metadata.sectors.length})
              </div>
              <div className="flex flex-wrap gap-1">
                {metadata.sectors.map((s) => (
                  <span
                    key={s}
                    className="text-[9px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-400">Dataset metadata unavailable.</p>
        )}
      </section>

      {/* ── Data limitations ──────────────────────────────────────────── */}
      <section className="rounded-xl border border-amber-100 bg-amber-50 p-5">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-amber-800">Known Data Limitations</h3>
            <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside">
              <li>Geographic coordinates are state-level centroids, not project GPS locations.</li>
              <li>Delay classification is derived from reported dates; not all projects have complete date records.</li>
              <li>Model predictions are pre-computed on dataset load; live re-inference available when model is ready.</li>
              <li>Cost figures are sourced from MoSPI flash reports and may not reflect the most recent revisions.</li>
              <li>A low risk score does not guarantee on-time completion. The model has measurable false-positive and false-negative rates.</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
};

// ── Sub-components ────────────────────────────────────────────────────────────

const StatusCard: React.FC<{
  title: string;
  value: string;
  ok?: boolean | null;
  sub?: string;
  loading?: boolean;
}> = ({ title, value, ok, sub, loading = false }) => (
  <div className="card p-4 flex items-center gap-3">
    {ok == null ? (
      <AlertCircle className="w-5 h-5 text-slate-300 shrink-0" />
    ) : ok ? (
      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
    ) : (
      <XCircle className="w-5 h-5 text-red-500 shrink-0" />
    )}
    <div>
      <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
        {title}
      </div>
      {loading ? (
        <Skeleton height={16} width={80} />
      ) : (
        <div className="text-sm font-semibold text-slate-800 mt-0.5">{value}</div>
      )}
      {sub && <div className="text-[10px] text-slate-400 mt-0.5 max-w-[160px] overflow-ellipsis">{sub}</div>}
    </div>
  </div>
);

const InfoRow: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => (
  <div className="flex items-center gap-2">
    <div className="text-xs text-slate-400 shrink-0 w-32">{label}</div>
    <div className="text-xs font-medium text-slate-800">{value ?? <span className="text-slate-300">—</span>}</div>
  </div>
);

export default ModelDataView;
