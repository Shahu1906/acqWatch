import React, { useEffect, useState, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import {
  AlertTriangle,
  Database,
  Map,
  ArrowRight,
  CheckCircle2,
  IndianRupee,
  TrendingUp,
  ChevronRight,
} from 'lucide-react';
import { fetchOverview, fetchHealth } from '../api';
import type { OverviewResponse, HealthResponse, AppView } from '../types';
import {
  Skeleton,
  ConnectionError,
  getRiskColor,
  formatCrore,
  formatPct,
  formatDate,
} from './ui';
import { AcqWatchLogoMark } from './AcqWatchLogo';

interface OverviewViewProps {
  onNavigate: (view: AppView) => void;
}

const RISK_ORDER = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const;
const RISK_LABELS: Record<string, string> = {
  CRITICAL: 'Critical',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
};

const RISK_COLORS_DARK: Record<string, { text: string; bg: string; border: string; glow: string }> = {
  CRITICAL: { text: '#fca5a5', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)', glow: 'rgba(239,68,68,0.15)' },
  HIGH:     { text: '#fdba74', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.2)', glow: 'rgba(249,115,22,0.15)' },
  MEDIUM:   { text: '#fde047', bg: 'rgba(234,179,8,0.08)',  border: 'rgba(234,179,8,0.2)',  glow: 'rgba(234,179,8,0.15)' },
  LOW:      { text: '#86efac', bg: 'rgba(34,197,94,0.08)',  border: 'rgba(34,197,94,0.2)',  glow: 'rgba(34,197,94,0.15)' },
};

function RiskDistributionBar({
  counts,
  total,
  onNavigate,
}: {
  counts: Record<string, number>;
  total: number;
  onNavigate: (view: AppView) => void;
}) {
  return (
    <div>
      {/* Stacked bar */}
      <div style={{
        display: 'flex',
        borderRadius: '6px',
        overflow: 'hidden',
        height: '8px',
        marginBottom: '20px',
        background: 'var(--bg-overlay)',
      }}>
        {RISK_ORDER.map((cat) => {
          const count = counts[cat] ?? 0;
          const pct = total > 0 ? (count / total) * 100 : 0;
          if (pct === 0) return null;
          return (
            <div
              key={cat}
              style={{ width: `${pct}%`, backgroundColor: getRiskColor(cat), transition: 'width 600ms ease' }}
              title={`${cat}: ${count} (${pct.toFixed(1)}%)`}
            />
          );
        })}
      </div>
      {/* Risk category cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        {RISK_ORDER.map((cat) => {
          const count = counts[cat] ?? 0;
          const pct = total > 0 ? (count / total) * 100 : 0;
          const colors = RISK_COLORS_DARK[cat];
          return (
            <button
              key={cat}
              onClick={() => onNavigate('explorer')}
              style={{
                textAlign: 'left',
                padding: '16px',
                borderRadius: '12px',
                background: colors.bg,
                border: `1px solid ${colors.border}`,
                cursor: 'pointer',
                transition: 'all 150ms ease',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.boxShadow = `0 0 20px ${colors.glow}`;
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
              }}
            >
              <div style={{ fontSize: '24px', fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", color: colors.text, lineHeight: 1, letterSpacing: '-0.03em' }}>
                {count.toLocaleString()}
              </div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: colors.text, opacity: 0.8, marginTop: '4px' }}>
                {RISK_LABELS[cat]} Risk
              </div>
              <div style={{ fontSize: '11px', color: '#4a5c78', marginTop: '2px' }}>{pct.toFixed(1)}%</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SectorChart({ distribution }: { distribution: Record<string, number> }) {
  const sorted = Object.entries(distribution)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([name, value]) => ({ name: name.replace(' AND ', ' & ').substring(0, 22), value }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={sorted} layout="vertical" margin={{ left: 4, right: 20, top: 4, bottom: 4 }}>
        <XAxis type="number" tick={{ fontSize: 10, fill: '#4a5c78' }} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 10, fill: '#8899b4' }}
          axisLine={false}
          tickLine={false}
          width={140}
        />
        <Tooltip
          cursor={{ fill: 'rgba(255,255,255,0.03)' }}
          contentStyle={{
            fontSize: 12,
            background: '#1c2638',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            color: '#e8edf5',
          }}
        />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={12}>
          {sorted.map((_, i) => (
            <Cell key={i} fill={`hsl(${220 - i * 18}, 70%, ${45 + i * 3}%)`} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function DelayPie({ delayed, onTime }: { delayed: number; onTime: number }) {
  const data = [
    { name: 'Delayed', value: delayed, fill: '#ef4444' },
    { name: 'On Time', value: onTime,  fill: '#22c55e' },
  ];
  const total = delayed + onTime;
  const pct = total > 0 ? ((delayed / total) * 100).toFixed(1) : '0';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ position: 'relative' }}>
        <PieChart width={140} height={140}>
          <Pie
            data={data}
            cx={65}
            cy={65}
            innerRadius={42}
            outerRadius={62}
            dataKey="value"
            startAngle={90}
            endAngle={-270}
            strokeWidth={0}
          >
            {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
          </Pie>
        </PieChart>
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <span style={{ fontSize: '22px', fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", color: '#e8edf5', lineHeight: 1 }}>{pct}%</span>
          <span style={{ fontSize: '10px', color: '#4a5c78', marginTop: '2px' }}>delayed</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
        {data.map((d) => (
          <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: d.fill }} />
            <span style={{ fontSize: '11px', color: '#8899b4' }}>
              {d.name}: {d.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const S = {
  page: { background: 'var(--bg-base)', minHeight: '100vh' } as React.CSSProperties,
  wrapper: { maxWidth: '1280px', margin: '0 auto', padding: '0 24px' } as React.CSSProperties,
  card: {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-default)',
    borderRadius: '14px',
    boxShadow: 'var(--shadow-sm)',
    transition: 'background-color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease',
  } as React.CSSProperties,
};

export const OverviewView: React.FC<OverviewViewProps> = ({ onNavigate }) => {
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [ov, h] = await Promise.all([
        fetchOverview(),
        fetchHealth().catch(() => null),
      ]);
      setOverview(ov);
      setHealth(h);
    } catch (err: any) {
      setError(err.message || 'Failed to load overview data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="view-enter" style={S.page}>

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section style={{
        position: 'relative',
        overflow: 'hidden',
        paddingTop: '64px',
        paddingBottom: '64px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        {/* Glow orbs */}
        <div style={{
          position: 'absolute',
          top: '-100px',
          left: '-100px',
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-80px',
          right: '10%',
          width: '400px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={S.wrapper}>
          {/* Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: '999px',
            background: 'var(--accent-subtle)',
            border: '1px solid var(--accent-glow)',
            marginBottom: '28px',
          }}>
            <AcqWatchLogoMark size={15} />
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              MoSPI Infrastructure Intelligence
            </span>
          </div>

          {/* Headline */}
          <h1 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 'clamp(2.5rem, 5vw, 4rem)',
            fontWeight: 700,
            color: 'var(--text-primary)',
            lineHeight: 1.1,
            letterSpacing: '-0.03em',
            marginBottom: '20px',
            maxWidth: '700px',
          }}>
            Detect acquisition risk{' '}
            <span style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 55%, #10b981 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              before it delays
            </span>
            {' '}your project.
          </h1>

          <p style={{
            fontSize: '17px',
            color: 'var(--text-secondary)',
            marginBottom: '36px',
            maxWidth: '580px',
            lineHeight: 1.7,
          }}>
            Explore infrastructure projects, understand risk classifications, and investigate the evidence behind model predictions —
            across{' '}
            {loading ? (
              <span style={{ display: 'inline-block', width: '60px', height: '16px', borderRadius: '4px', background: 'var(--border-subtle)', verticalAlign: 'middle' }} />
            ) : (
              <strong style={{ color: 'var(--text-primary)' }}>
                {overview?.total_projects_in_inventory?.toLocaleString() ?? '—'} verified projects
              </strong>
            )}{' '}
            from the MoSPI Central Sector dataset.
          </p>

          {/* CTAs */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            <button
              id="hero-explore-btn"
              onClick={() => onNavigate('explorer')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '13px 28px',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: 600,
                background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
                color: 'white',
                border: '1px solid rgba(59,130,246,0.4)',
                boxShadow: '0 0 20px rgba(59,130,246,0.25)',
                cursor: 'pointer',
                transition: 'all 150ms ease',
                letterSpacing: '0.01em',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 0 32px rgba(59,130,246,0.4)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 0 20px rgba(59,130,246,0.25)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
            >
              Explore Projects
              <ArrowRight style={{ width: '16px', height: '16px' }} />
            </button>
            <button
              id="hero-map-btn"
              onClick={() => onNavigate('map')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '13px 28px',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: 600,
                background: 'var(--bg-raised)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-default)',
                cursor: 'pointer',
                transition: 'all 150ms ease',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-raised)'; }}
            >
              <Map style={{ width: '16px', height: '16px' }} />
              Open Risk Map
            </button>
          </div>
        </div>
      </section>

      {/* ── Main Content ───────────────────────────────────────────────── */}
      <div style={{ ...S.wrapper, paddingTop: '40px', paddingBottom: '60px' }}>
        {error && !loading && <ConnectionError message={error} onRetry={load} />}

        {/* ── KPI Cards ───────────────────────────────────────────────── */}
        <div className="scroll-reveal" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
          {/* Total */}
          <div style={{ ...S.card, padding: '20px' }} className="animate-fade-in-up stagger-1">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Database style={{ width: '16px', height: '16px', color: '#60a5fa' }} />
              </div>
              <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Inventory</span>
            </div>
            {loading ? <Skeleton height={40} width={80} /> : (
              <div style={{ fontSize: '2.4rem', fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", color: 'var(--text-primary)', lineHeight: 1, letterSpacing: '-0.05em' }}>
                {overview?.total_projects_in_inventory?.toLocaleString() ?? '—'}
              </div>
            )}
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '6px' }}>Total Projects</div>
            {!loading && overview && (
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                {overview.predictions_available ? '✓ Predictions available' : 'No model predictions'}
              </div>
            )}
          </div>

          {/* Delayed */}
          <div style={{ ...S.card, padding: '20px', background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.18)' }} className="animate-fade-in-up stagger-2">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangle style={{ width: '16px', height: '16px', color: '#ef4444' }} />
              </div>
              <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Delayed</span>
            </div>
            {loading ? <Skeleton height={40} width={80} /> : (
              <div style={{ fontSize: '2.4rem', fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", color: '#ef4444', lineHeight: 1, letterSpacing: '-0.05em' }}>
                {overview?.delayed_count?.toLocaleString() ?? '—'}
              </div>
            )}
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '6px' }}>Delayed Projects</div>
            {!loading && overview && (
              <div style={{ fontSize: '11px', color: '#ef4444', marginTop: '4px', fontWeight: 600 }}>
                {formatPct(overview.delay_rate_pct)} delay rate
              </div>
            )}
          </div>

          {/* On time */}
          <div style={{ ...S.card, padding: '20px', background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.18)' }} className="animate-fade-in-up stagger-3">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 style={{ width: '16px', height: '16px', color: '#22c55e' }} />
              </div>
              <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>On Track</span>
            </div>
            {loading ? <Skeleton height={40} width={80} /> : (
              <div style={{ fontSize: '2.4rem', fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", color: '#22c55e', lineHeight: 1, letterSpacing: '-0.05em' }}>
                {overview?.on_time_count?.toLocaleString() ?? '—'}
              </div>
            )}
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '6px' }}>On-time Projects</div>
            {!loading && overview && (
              <div style={{ fontSize: '11px', color: '#22c55e', marginTop: '4px', fontWeight: 600 }}>
                {formatPct(100 - overview.delay_rate_pct)} on-time rate
              </div>
            )}
          </div>

          {/* Cost */}
          <div style={{ ...S.card, padding: '20px' }} className="animate-fade-in-up stagger-4">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(234,179,8,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IndianRupee style={{ width: '16px', height: '16px', color: '#eab308' }} />
              </div>
              <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Cost</span>
            </div>
            {loading ? <Skeleton height={40} width={80} /> : (
              <div style={{ fontSize: '2.4rem', fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", color: 'var(--text-primary)', lineHeight: 1, letterSpacing: '-0.05em' }}>
                {formatCrore(overview?.cost_stats?.mean_orig_cost_cr)}
              </div>
            )}
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '6px' }}>Avg. Sanctioned Cost</div>
            {!loading && overview?.cost_stats && (
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Total: {formatCrore(overview.cost_stats.total_orig_cost_cr)}
              </div>
            )}
          </div>
        </div>

        {/* ── Risk Distribution ─────────────────────────────────────────── */}
        <div className="scroll-reveal" style={{ ...S.card, padding: '24px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                Risk Distribution
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' }}>
                Project count by risk category — click any category to explore
              </p>
            </div>
            {!loading && overview && (
              <button
                onClick={() => onNavigate('map')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 500,
                  background: 'rgba(59,130,246,0.08)',
                  border: '1px solid rgba(59,130,246,0.2)',
                  color: 'var(--color-accent)',
                  cursor: 'pointer',
                  transition: 'all 120ms ease',
                }}
              >
                <Map style={{ width: '13px', height: '13px' }} />
                View on map
              </button>
            )}
          </div>

          {loading ? (
            <div>
              <Skeleton height={8} className="mb-5" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} height={80} />)}
              </div>
            </div>
          ) : overview ? (
            <RiskDistributionBar
              counts={overview.counts_by_risk_category}
              total={overview.total_projects_in_inventory}
              onNavigate={onNavigate}
            />
          ) : null}
        </div>

        {/* ── Delay Pie + Sector Chart ───────────────────────────────────── */}
        <div className="scroll-reveal" style={{ display: 'grid', gridTemplateColumns: '2fr 3fr', gap: '20px', marginBottom: '24px' }}>
          {/* Delay breakdown */}
          <div style={{ ...S.card, padding: '24px' }}>
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px' }}>
              Delay Overview
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Fraction of projects classified as delayed
            </p>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <Skeleton height={140} width={140} rounded />
              </div>
            ) : overview ? (
              <DelayPie delayed={overview.delayed_count} onTime={overview.on_time_count} />
            ) : null}
          </div>

          {/* Sector distribution */}
          <div style={{ ...S.card, padding: '24px' }}>
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px' }}>
              Sector Distribution
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Projects by infrastructure sector
            </p>
            {loading ? <Skeleton height={220} /> : overview?.sector_distribution ? (
              <SectorChart distribution={overview.sector_distribution} />
            ) : null}
          </div>
        </div>

        {/* ── System Status Strip ───────────────────────────────────────── */}
        <div className="scroll-reveal" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '40px' }}>
          {[
            {
              dot: health?.status === 'ok' ? '#22c55e' : health?.status === 'degraded' ? '#f59e0b' : '#ef4444',
              title: health ? (health.status === 'ok' ? 'Backend healthy' : health.status === 'degraded' ? 'Backend degraded' : 'Backend error') : (loading ? 'Checking…' : 'Unknown'),
              sub: loading ? '—' : health?.timestamp_utc ? `As of ${new Date(health.timestamp_utc).toLocaleTimeString()}` : 'Backend unreachable',
            },
            {
              dot: health?.model_status === 'ready' ? '#22c55e' : 'var(--text-muted)',
              title: `Model ${health?.model_status === 'ready' ? 'ready' : 'unavailable'}`,
              sub: health?.model_id ?? 'No model loaded',
            },
            {
              dot: '#3b82f6',
              title: `${health?.dataset_project_count?.toLocaleString() ?? '—'} dataset records`,
              sub: overview?.dataset_last_loaded ? `Loaded ${formatDate(overview.dataset_last_loaded)}` : 'MoSPI Central Sector',
            },
          ].map((item, i) => (
            <div key={i} style={{ ...S.card, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: item.dot, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{item.title}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{item.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── CTA Banner ────────────────────────────────────────────────── */}
        <div className="scroll-reveal" style={{
          borderRadius: '20px',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #0f1f40 0%, #1a2d6e 40%, #0c2038 100%)',
          border: '1px solid rgba(59,130,246,0.2)',
          padding: '40px',
          position: 'relative',
        }}>
          {/* Subtle glow */}
          <div style={{
            position: 'absolute',
            top: '-60px',
            right: '10%',
            width: '300px',
            height: '300px',
            background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '20px', position: 'relative' }}>
            <div>
              <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '22px', fontWeight: 700, color: '#e8edf5', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
                Start investigating risk
              </h2>
              <p style={{ fontSize: '14px', color: '#8899b4', maxWidth: '400px' }}>
                Search across the full inventory, inspect SHAP explanations, and explore the geospatial risk map.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px', flexShrink: 0 }}>
              <button
                onClick={() => onNavigate('explorer')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 600,
                  background: 'white',
                  color: '#1d4ed8',
                  border: '1px solid white',
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 0 20px rgba(255,255,255,0.2)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
              >
                Project Explorer
                <ChevronRight style={{ width: '15px', height: '15px' }} />
              </button>
              <button
                onClick={() => onNavigate('simulator')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 600,
                  background: 'rgba(255,255,255,0.08)',
                  color: '#e8edf5',
                  border: '1px solid rgba(255,255,255,0.15)',
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.12)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'; }}
              >
                <TrendingUp style={{ width: '15px', height: '15px' }} />
                Test Model
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverviewView;
