import React, { useEffect, useState, useCallback } from 'react';
import {
  X,
  MapPin,
  Building2,
  Calendar,
  IndianRupee,
  AlertTriangle,
  CheckCircle2,
  BrainCircuit,
} from 'lucide-react';
import { fetchProjectDetail, fetchProjectExplanation } from '../api';
import type { ProjectDetail, ExplanationResponse } from '../types';
import {
  Spinner,
  RiskBadge,
  UnavailableState,
  ModelDisclaimer,
  Skeleton,
  formatCrore,
  formatDate,
  formatPct,
} from './ui';

interface ProjectDetailModalProps {
  projectCode: string | null;
  onClose: () => void;
  // Legacy compatibility
  user?: any;
}

export const ProjectDetailModal: React.FC<ProjectDetailModalProps> = ({
  projectCode,
  onClose,
}) => {
  const [detail, setDetail] = useState<ProjectDetail | null>(null);
  const [explanation, setExplanation] = useState<ExplanationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [explLoading, setExplLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'explanation'>('overview');

  const load = useCallback(async (code: string) => {
    setLoading(true);
    setError(null);
    setDetail(null);
    setExplanation(null);
    setActiveTab('overview');
    try {
      const d = await fetchProjectDetail(code);
      setDetail(d);
    } catch (err: any) {
      setError(err.message || 'Failed to load project details');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadExplanation = useCallback(async (code: string) => {
    if (explanation) return;
    setExplLoading(true);
    try {
      const e = await fetchProjectExplanation(code);
      setExplanation(e);
    } catch {
      setExplanation({ project_code: code, available: false, top_risk_drivers: [], top_mitigating_factors: [], base_log_odds: null, disclaimer: null, unavailable_reason: 'Explanation unavailable' });
    } finally {
      setExplLoading(false);
    }
  }, [explanation]);

  useEffect(() => {
    if (projectCode) {
      load(projectCode);
    } else {
      setDetail(null);
      setExplanation(null);
    }
  }, [projectCode, load]);

  useEffect(() => {
    if (activeTab === 'explanation' && projectCode && !explanation) {
      loadExplanation(projectCode);
    }
  }, [activeTab, projectCode, explanation, loadExplanation]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!projectCode) return null;

  return (
    <div className="modal-overlay">
      {/* Backdrop */}
      <div
        className="modal-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className="modal-panel"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)',
          borderRadius: '18px',
          boxShadow: 'var(--shadow-xl)',
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Project details"
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '20px', borderBottom: '1px solid var(--border-default)' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <Skeleton height={20} width={200} />
                <Skeleton height={14} width={120} />
              </div>
            ) : detail ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <RiskBadge category={detail.risk_category} score={detail.risk_score ?? undefined} size="md" />
                  {detail.prediction_available && (
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      color: 'var(--color-accent)',
                      background: 'var(--accent-subtle)',
                      border: '1px solid var(--accent-glow)',
                      padding: '2px 8px',
                      borderRadius: '4px',
                    }}>
                      Prediction available
                    </span>
                  )}
                </div>
                <h2 style={{ fontSize: '16px', fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif", color: 'var(--text-primary)', marginTop: '8px', lineHeight: 1.3, margin: '8px 0 0' }}>
                  {detail.project_name}
                </h2>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: '3px' }}>{detail.project_code}</div>
              </>
            ) : error ? (
              <div style={{ fontSize: '14px', color: 'var(--color-critical)' }}>{error}</div>
            ) : null}
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '6px',
              borderRadius: '8px',
              background: 'var(--bg-raised)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              marginLeft: '12px',
              flexShrink: 0,
              transition: 'all 120ms ease',
            }}
            aria-label="Close"
          >
            <X style={{ width: '18px', height: '18px' }} />
          </button>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-default)', padding: '0 20px', background: 'var(--bg-surface)' }}>
          {(['overview', 'explanation'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                paddingTop: '12px',
                paddingBottom: '12px',
                paddingLeft: '4px',
                paddingRight: '4px',
                marginRight: '24px',
                fontSize: '13px',
                fontWeight: activeTab === tab ? 600 : 500,
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                borderBottom: `2px solid ${activeTab === tab ? 'var(--color-accent)' : 'transparent'}`,
                color: activeTab === tab ? 'var(--color-accent)' : 'var(--text-muted)',
                background: 'none',
                cursor: 'pointer',
                transition: 'all 150ms ease',
                textTransform: 'capitalize',
              }}
            >
              {tab === 'explanation' && <BrainCircuit style={{ width: '13px', height: '13px', display: 'inline', marginRight: '5px', verticalAlign: 'middle' }} />}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px 0' }}>
              <Spinner size="lg" />
            </div>
          ) : error ? (
            <div style={{ padding: '48px 0', textAlign: 'center', fontSize: '14px', color: 'var(--color-critical)' }}>{error}</div>
          ) : detail ? (
            activeTab === 'overview' ? (
              <DetailOverview detail={detail} />
            ) : (
              <ExplanationTab explanation={explanation} loading={explLoading} />
            )
          ) : null}
        </div>
      </div>
    </div>
  );
};

// ── Detail Overview ───────────────────────────────────────────────────────────

const DetailOverview: React.FC<{ detail: ProjectDetail }> = ({ detail }) => {
  const fields: Array<{
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: React.ReactNode;
    available?: boolean;
  }> = [
    { icon: Building2, label: 'Agency', value: detail.agency },
    { icon: MapPin, label: 'State', value: detail.state },
    { icon: Building2, label: 'Sector', value: detail.sector?.replace(' AND ', ' & ') },
    { icon: IndianRupee, label: 'Sanctioned Cost', value: formatCrore(detail.orig_cost_cr) },
    { icon: IndianRupee, label: 'Revised Cost', value: formatCrore(detail.rev_cost_cr), available: detail.rev_cost_cr != null },
    { icon: IndianRupee, label: 'Anticipated Cost', value: formatCrore(detail.ant_cost_cr), available: detail.ant_cost_cr != null },
    { icon: Calendar, label: 'Approval Date', value: formatDate(detail.approval_date) },
    { icon: Calendar, label: 'Original Commissioning', value: formatDate(detail.orig_commissioning_date) },
    { icon: Calendar, label: 'Revised Commissioning', value: formatDate(detail.rev_commissioning_date), available: detail.rev_commissioning_date != null },
    { icon: Calendar, label: 'Anticipated Completion', value: formatDate(detail.ant_commissioning_date), available: detail.ant_commissioning_date != null },
  ];

  const available = fields.filter((f) => f.available !== false && f.value && f.value !== '—');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Delay status banner */}
      {detail.is_delayed !== null && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 16px',
          borderRadius: '10px',
          background: detail.is_delayed ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)',
          border: `1px solid ${detail.is_delayed ? 'rgba(239,68,68,0.25)' : 'rgba(34,197,94,0.25)'}`,
        }}>
          {detail.is_delayed
            ? <AlertTriangle style={{ width: '18px', height: '18px', color: '#fca5a5', flexShrink: 0 }} />
            : <CheckCircle2 style={{ width: '18px', height: '18px', color: '#86efac', flexShrink: 0 }} />}
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: detail.is_delayed ? '#fca5a5' : '#86efac' }}>
              {detail.is_delayed ? `Delayed by ${detail.delay_months ?? '?'} months` : 'On Track'}
            </div>
            {detail.risk_probability != null && (
              <div style={{ fontSize: '12px', marginTop: '2px', color: detail.is_delayed ? '#f87171' : '#4ade80', opacity: 0.8 }}>
                Model delay probability: {formatPct(detail.risk_probability * 100)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Physical progress */}
      {detail.physical_progress_pct != null && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
            <span>Physical Progress</span>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{detail.physical_progress_pct.toFixed(1)}%</span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-bar-fill"
              style={{
                width: `${Math.min(100, detail.physical_progress_pct)}%`,
                backgroundColor:
                  detail.physical_progress_pct >= 75 ? '#22c55e'
                  : detail.physical_progress_pct >= 40 ? '#eab308'
                  : '#ef4444',
              }}
            />
          </div>
        </div>
      )}

      {/* Expenditure ratio */}
      {detail.expenditure_ratio != null && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
            <span>Expenditure Ratio</span>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{(detail.expenditure_ratio * 100).toFixed(1)}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${Math.min(100, detail.expenditure_ratio * 100)}%`, backgroundColor: '#3b82f6' }} />
          </div>
        </div>
      )}

      {/* Detail fields grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        {available.map(({ icon: Icon, label, value }) => (
          <div key={label} style={{
            borderRadius: '8px',
            border: '1px solid var(--border-default)',
            background: 'var(--bg-raised)',
            padding: '10px 12px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
              <span style={{ color: 'var(--text-muted)', flexShrink: 0, display: 'inline-flex' }}><Icon className="w-3 h-3" /></span>
              <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {label}
              </span>
            </div>
            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Geo info */}
      {detail.latitude && detail.longitude && (
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '8px',
          borderRadius: '8px',
          border: '1px solid var(--border-default)',
          background: 'var(--bg-raised)',
          padding: '10px 12px',
          fontSize: '12px',
          color: 'var(--text-secondary)',
        }}>
          <MapPin style={{ width: '13px', height: '13px', color: 'var(--text-muted)', marginTop: '1px', flexShrink: 0 }} />
          <div>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Location: </span>
            {detail.latitude.toFixed(3)}°N, {detail.longitude.toFixed(3)}°E —{' '}
            <span style={{ fontStyle: 'italic' }}>{detail.geo_precision}</span>
          </div>
        </div>
      )}

      {/* Data source */}
      {detail.source_dataset && (
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
          Source: {detail.source_dataset}
        </div>
      )}
    </div>
  );
};

// ── Explanation Tab ───────────────────────────────────────────────────────────

const ExplanationTab: React.FC<{
  explanation: ExplanationResponse | null;
  loading: boolean;
}> = ({ explanation, loading }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!explanation) return null;

  if (!explanation.available) {
    return (
      <div className="py-6">
        <UnavailableState
          title="Explanation unavailable"
          reason={explanation.unavailable_reason ?? undefined}
        />
        <p className="text-xs text-slate-400 mt-3">
          SHAP explanations require the trained model artifact to be loaded.
          Check the Model & Data section for model status.
        </p>
      </div>
    );
  }

  const maxShap = Math.max(
    ...explanation.top_risk_drivers.map((d) => Math.abs(d.shap_value)),
    ...explanation.top_mitigating_factors.map((d) => Math.abs(d.shap_value)),
    0.001,
  );

  return (
    <div className="space-y-5">
      <ModelDisclaimer
        text={
          explanation.disclaimer ??
          'SHAP values indicate statistical feature contribution to the model output. They are not legal or administrative determinations.'
        }
      />

      {/* Risk drivers */}
      {explanation.top_risk_drivers.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3">
            Risk Elevating Factors
          </h3>
          <div className="space-y-2.5">
            {explanation.top_risk_drivers.map((driver) => (
              <SHAPRow key={driver.feature} driver={driver} maxShap={maxShap} />
            ))}
          </div>
        </div>
      )}

      {/* Mitigating factors */}
      {explanation.top_mitigating_factors.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3">
            Risk Mitigating Factors
          </h3>
          <div className="space-y-2.5">
            {explanation.top_mitigating_factors.map((driver) => (
              <SHAPRow key={driver.feature} driver={driver} maxShap={maxShap} />
            ))}
          </div>
        </div>
      )}

      {explanation.base_log_odds != null && (
        <div className="text-[10px] text-slate-400 pt-2 border-t border-slate-100">
          Base log-odds: {explanation.base_log_odds.toFixed(4)} (SHAP TreeExplainer)
        </div>
      )}
    </div>
  );
};

const SHAPRow: React.FC<{ driver: any; maxShap: number }> = ({ driver, maxShap }) => {
  const isRisk = driver.direction === 'ELEVATES_RISK';
  const width = `${Math.min(100, (Math.abs(driver.shap_value) / maxShap) * 100)}%`;
  const color = isRisk ? '#dc2626' : '#16a34a';

  return (
    <div className="group">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <div
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ backgroundColor: color }}
          />
          <span className="text-[11px] font-semibold text-slate-700 truncate">
            {driver.feature}
          </span>
        </div>
        <span
          className="text-[10px] font-bold tabular-nums ml-2 shrink-0"
          style={{ color }}
        >
          {isRisk ? '+' : ''}{driver.shap_value.toFixed(4)}
        </span>
      </div>
      {/* Bar */}
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-1">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width, backgroundColor: `${color}90` }}
        />
      </div>
      {/* Explanation text */}
      <p className="text-[10px] text-slate-400 leading-relaxed">{driver.explanation}</p>
    </div>
  );
};

export default ProjectDetailModal;
